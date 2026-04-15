/// <reference types="node" />

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

function getGeminiModels(apiKey: string) {
  return [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.5 Flash' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, name: 'Gemini 2.0 Flash' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, name: 'Gemini 2.0 Flash Lite' },
  ]
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

// Fetch all active documents from Supabase
async function fetchDocuments(): Promise<Array<{ title: string; category: string; content: string }>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return []
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/chatbot_documents?is_active=eq.true&select=title,category,content&order=category,title`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

function buildSystemPrompt(docs: Array<{ title: string; category: string; content: string }>) {
  const docTexts = docs
    .map((d, i) => `=== 문서 ${i + 1}: [${d.category}] ${d.title} ===\n${d.content}`)
    .join('\n\n')

  return `당신은 (주)동양의 내부회계관리제도(ICFR) 전문 AI 어시스턴트입니다.

아래에 제공된 문서들이 당신의 유일한 지식 소스입니다.
반드시 제공된 문서 내용을 기반으로만 답변하세요.
문서에 없는 내용은 "제공된 문서에 해당 내용이 없습니다"라고 솔직하게 답변하세요.

답변 규칙:
- 한국어로 답변
- 간결하고 명확하게 구조화하여 답변
- 번호 목록(①②③)이나 불릿 포인트 활용
- 관련 문서의 제목을 [출처: 문서제목] 형태로 답변 끝에 표시
- 전문 용어 사용 시 괄호 안에 쉬운 설명 추가
- 이 시스템과 무관한 질문은 정중히 거절

=== 참조 문서 (${docs.length}건) ===

${docTexts}

=== 문서 끝 ===`
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return json({ ok: false, error: 'GEMINI_API_KEY not configured' }, 500)
  }

  let body: { messages?: Array<{ role: string; content: string }> }
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400)
  }

  const { messages } = body
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return json({ ok: false, error: 'messages array required' }, 400)
  }

  // Fetch documents from Supabase
  const docs = await fetchDocuments()

  // Build system prompt with documents
  const systemPrompt = buildSystemPrompt(docs)

  // Build Gemini request
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: `네, 저는 (주)동양 내부회계관리 AI 어시스턴트입니다. 제공된 ${docs.length}개의 문서를 참조하여 답변하겠습니다. 문서에 없는 내용은 솔직하게 알려드리겠습니다.` }] },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
  ]

  const requestBody = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      topP: 0.9,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  })

  const models = getGeminiModels(apiKey)
  const errors: string[] = []

  for (const model of models) {
    try {
      const response = await fetch(model.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })

      if (response.ok) {
        const data = await response.json()
        const text = (data as any).candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          return json({ ok: true, reply: text, model: model.name, docsCount: docs.length })
        }
        errors.push(`${model.name}: empty response`)
        continue
      }

      const errData: any = await response.json().catch(() => ({}))
      errors.push(`${model.name}: ${errData?.error?.message ?? `status ${response.status}`}`)
      continue
    } catch (err) {
      errors.push(`${model.name}: ${err instanceof Error ? err.message : 'network error'}`)
      continue
    }
  }

  return json({ ok: false, error: errors[errors.length - 1] || 'All models failed', errors, fallback: true }, 502)
}
