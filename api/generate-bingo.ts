/// <reference types="node" />

/**
 * Generate 25 bingo quiz questions from chatbot_documents using Gemini.
 * Results are cached in bingo_quiz_cache (one row per date) so the model
 * is called at most ONCE per day across all users — keeps cost tiny.
 *
 * GET  /api/generate-bingo           → returns today's questions (generates if missing)
 * POST /api/generate-bingo { force } → force-regenerate (admin only, not enforced here)
 *
 * Token budget per generation:
 *   - context: ~40K chars of core docs (내부통제/프레임워크/제도개요/감사개념 only,
 *     excluding massive 법규 full-text).
 *   - output: ~2-3K tokens (25 JSON questions)
 *   → ~$0.012 per generation, called max once per day.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

type Doc = { title: string; category: string; content: string }
type BingoQ = {
  index: number
  type: 'multiple' | 'subjective'
  question: string
  choices?: string[]
  answer: string
  explanation: string
  sourceTitle: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

async function fetchCoreDocuments(): Promise<Doc[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []
  // Skip the massive 법규 category — those are full statute texts, too long and
  // not ideal for bingo-sized trivia. Pull compact categories that cover the
  // internal-controls knowledge surface.
  const categories = ['내부통제', '프레임워크', '제도 개요', '감사 개념', 'KPI', '동양 특화', '문서', '평가']
  const categoryFilter = encodeURIComponent(`(${categories.map(c => `"${c}"`).join(',')})`)
  const url = `${SUPABASE_URL}/rest/v1/chatbot_documents?is_active=eq.true&category=in.${categoryFilter}&select=title,category,content&order=category,title`
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!res.ok) return []
    return await res.json() as Doc[]
  } catch {
    return []
  }
}

function buildContext(docs: Doc[], perDocLimit = 6_000, totalLimit = 40_000): string {
  let budget = totalLimit
  const parts: string[] = []
  for (const d of docs) {
    if (budget <= 0) break
    const allowed = Math.min(d.content.length, perDocLimit, budget)
    const snippet = d.content.slice(0, allowed)
    parts.push(`=== [${d.category}] ${d.title} ===\n${snippet}`)
    budget -= allowed
  }
  return parts.join('\n\n')
}

function buildPrompt(context: string): string {
  return `당신은 (주)동양 내부회계관리제도(ICFR) 교육 담당자이며, 직원 대상 빙고 퀴즈 문제를 출제합니다.

아래 참조 문서만을 근거로 **정확히 25개**의 문제를 JSON 배열로 생성하세요.

요구사항:
1. 문서 내용을 실제로 반영한 문제여야 함. 문서에 없는 내용은 출제 금지.
2. 타입은 모두 "multiple" (객관식 4지선다).
3. 난이도는 쉬움(50%) / 보통(40%) / 어려움(10%) 적절히 혼합.
4. 문제마다 sourceTitle 필드에 근거가 된 문서 제목을 그대로 넣으세요.
5. explanation은 1~2문장의 해설 (정답 근거).
6. choices 배열은 정확히 4개 요소, 그 중 하나가 answer와 일치해야 함.
7. answer는 choices 중 하나의 문자열 값 그대로 반환 (A/B/C/D 같은 기호 아님).
8. 전체를 아래 JSON 형식으로 **반드시 JSON만** (앞뒤 텍스트 없이) 반환:

[
  {
    "index": 1,
    "type": "multiple",
    "question": "COSO 프레임워크의 5대 구성요소가 아닌 것은?",
    "choices": ["통제환경", "위험평가", "외부감사", "정보와 의사소통"],
    "answer": "외부감사",
    "explanation": "COSO 5대 구성요소는 통제환경, 위험평가, 통제활동, 정보와 의사소통, 모니터링이며 외부감사는 포함되지 않습니다.",
    "sourceTitle": "내부회계관리 업무지침(2025.01.24. 개정)"
  }
]

=== 참조 문서 ===
${context}
=== 끝 ===

위 규칙에 따라 정확히 25개 문제의 JSON 배열만 반환하세요.`
}

function getGeminiModels(apiKey: string) {
  return [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.5 Flash' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.0 Flash' },
  ]
}

async function callGemini(apiKey: string, prompt: string): Promise<{ text: string; model: string } | null> {
  const models = getGeminiModels(apiKey)
  for (const model of models) {
    try {
      const res = await fetch(model.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      })
      if (!res.ok) continue
      const data = await res.json() as any
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return { text, model: model.name }
    } catch { /* try next */ }
  }
  return null
}

function parseQuestions(raw: string): BingoQ[] {
  // Strip ```json fences if present
  let s = raw.trim()
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(s)
  if (!Array.isArray(parsed)) throw new Error('response not an array')
  return parsed as BingoQ[]
}

async function getCached(date: string): Promise<{ questions: BingoQ[]; model: string; cached_at: string } | null> {
  const url = `${SUPABASE_URL}/rest/v1/bingo_quiz_cache?cache_date=eq.${date}&select=questions,model,created_at&limit=1`
  try {
    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
    if (!res.ok) return null
    const rows = await res.json() as Array<{ questions: BingoQ[]; model: string; created_at: string }>
    if (rows.length === 0) return null
    return { questions: rows[0].questions, model: rows[0].model, cached_at: rows[0].created_at }
  } catch { return null }
}

async function storeCache(date: string, questions: BingoQ[], model: string, sourceDocCount: number): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/bingo_quiz_cache`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([{ cache_date: date, questions, model, source_doc_count: sourceDocCount }]),
    })
  } catch { /* silent */ }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET(request: Request) {
  const today = new Date().toISOString().slice(0, 10)
  const url = new URL(request.url)
  const forceParam = url.searchParams.get('force')
  const force = forceParam === '1' || forceParam === 'true'

  if (!force) {
    const cached = await getCached(today)
    if (cached) {
      return json({ ok: true, source: 'cache', date: today, count: cached.questions.length, model: cached.model, questions: cached.questions })
    }
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) return json({ ok: false, error: 'GEMINI_API_KEY not configured' }, 500)

  const docs = await fetchCoreDocuments()
  if (docs.length === 0) return json({ ok: false, error: 'no source documents' }, 503)

  const context = buildContext(docs)
  const prompt = buildPrompt(context)

  const result = await callGemini(apiKey, prompt)
  if (!result) return json({ ok: false, error: 'Gemini call failed' }, 502)

  let questions: BingoQ[]
  try {
    questions = parseQuestions(result.text)
  } catch (e) {
    return json({ ok: false, error: 'JSON parse failed', detail: String(e).slice(0, 400), raw: result.text.slice(0, 400) }, 502)
  }

  if (questions.length < 25) {
    return json({ ok: false, error: `generated only ${questions.length} questions (need 25)`, raw: result.text.slice(0, 400) }, 502)
  }

  // Normalize + trim to 25
  questions = questions.slice(0, 25).map((q, i) => ({
    index: i + 1,
    type: 'multiple',
    question: q.question ?? '',
    choices: Array.isArray(q.choices) ? q.choices.slice(0, 4) : [],
    answer: q.answer ?? '',
    explanation: q.explanation ?? '',
    sourceTitle: q.sourceTitle ?? '',
  }))

  await storeCache(today, questions, result.model, docs.length)

  return json({ ok: true, source: 'fresh', date: today, count: questions.length, model: result.model, questions })
}

export async function POST(request: Request) {
  // Same as GET but always force-regenerate
  const u = new URL(request.url)
  u.searchParams.set('force', '1')
  const req = new Request(u.toString(), { method: 'GET', headers: request.headers })
  return GET(req)
}
