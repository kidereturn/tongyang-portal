/// <reference types="node" />

import { getAdminClient, json, requireSignedInProfile } from './_lib/supabase.js'
import { readJsonFromStorage, writeJsonToStorage } from './_lib/storage-json.js'

const STORAGE_PATH = 'system/bingo-daily.json'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? process.env.VITE_RESEND_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY

type ChoiceQuestion = {
  id: string
  type: 'multiple'
  question: string
  choices: string[]
  answer: string
  explanation: string
}

type SubjectiveQuestion = {
  id: string
  type: 'subjective'
  question: string
  answer: string
  explanation: string
}

type QuizQuestion = ChoiceQuestion | SubjectiveQuestion

type DailyUserState = {
  attempts: number
  correctCount: number
  completed: boolean
  notified: boolean
  answers: Record<string, { submittedAnswer: string; correct: boolean; answeredAt: string }>
}

type DailyQuiz = {
  source: 'gemini' | 'fallback'
  questions: QuizQuestion[]
  users: Record<string, DailyUserState>
}

type BingoStore = {
  days: Record<string, DailyQuiz>
}

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q-1',
    type: 'multiple',
    question: '내부회계관리제도에서 통제활동의 목적에 가장 가까운 것은 무엇인가요?',
    choices: ['매출 확대', '위험 감소', '채용 확대', '사무실 이전', '광고 집행', '원가 인상', '제품 출시'],
    answer: '위험 감소',
    explanation: '통제활동은 재무보고 위험을 줄이고 오류와 부정을 예방하기 위한 절차입니다.',
  },
  {
    id: 'q-2',
    type: 'multiple',
    question: 'RCM은 주로 무엇을 정리하는 문서인가요?',
    choices: ['연말정산 결과', '위험과 통제 매핑', '급여 대장', '채용 현황', '법인카드 사용 내역', '영업 실적표', '자산 매각 계획'],
    answer: '위험과 통제 매핑',
    explanation: 'RCM은 Risk Control Matrix로 위험과 통제활동을 연결해서 정리합니다.',
  },
  {
    id: 'q-3',
    type: 'multiple',
    question: '증빙 결재 상신 전 가장 먼저 확인해야 할 항목은 무엇인가요?',
    choices: ['이미지 해상도', '대표이사 승인 여부', '첨부 증빙의 관련성', '회사 로고 위치', '메일 제목 길이', '브라우저 버전', '폰트 종류'],
    answer: '첨부 증빙의 관련성',
    explanation: '업무와 직접 관련된 증빙인지가 가장 기본적인 검토 포인트입니다.',
  },
  {
    id: 'q-4',
    type: 'multiple',
    question: '모집단과 RCM을 사번 기준으로 연결하려는 가장 큰 이유는 무엇인가요?',
    choices: ['화면 색상을 맞추기 위해', '사용자 개인화 광고를 위해', '담당자 식별을 일관되게 하기 위해', '파일 용량을 줄이기 위해', '지도를 출력하기 위해', '로그인 화면을 숨기기 위해', '비밀번호를 길게 만들기 위해'],
    answer: '담당자 식별을 일관되게 하기 위해',
    explanation: '사번 기준 매핑은 담당자와 승인자를 동일 기준으로 안정적으로 연결하기 쉽습니다.',
  },
  {
    id: 'q-5',
    type: 'subjective',
    question: '증빙이 반려되었을 때 가장 먼저 해야 하는 조치를 짧게 한 단어로 적어주세요.',
    answer: '보완',
    explanation: '반려 시에는 반려 사유를 확인하고 증빙을 보완한 뒤 다시 제출하는 것이 기본입니다.',
  },
]

function normalizeAnswer(value: string) {
  return value.replace(/\s+/g, '').trim().toLowerCase()
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function generateWithGemini(): Promise<QuizQuestion[] | null> {
  if (!GEMINI_API_KEY) return null

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  '한국어로 내부회계관리제도 관련 오늘의 퀴즈 5문제를 JSON으로 만들어주세요.',
                  '조건:',
                  '1) 4문제는 7지선다 객관식',
                  '2) 1문제는 주관식',
                  '3) fields: id, type, question, choices(optional), answer, explanation',
                  '4) type은 multiple 또는 subjective',
                  '5) JSON 배열만 답하세요',
                ].join('\n'),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    }
  )

  if (!response.ok) return null

  const payload = await response.json()
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return null

  try {
    const parsed = JSON.parse(text) as QuizQuestion[]
    const multipleCount = parsed.filter(item => item.type === 'multiple' && Array.isArray((item as ChoiceQuestion).choices) && (item as ChoiceQuestion).choices.length === 7).length
    const subjectiveCount = parsed.filter(item => item.type === 'subjective').length

    if (parsed.length !== 5 || multipleCount < 4 || subjectiveCount < 1) {
      return null
    }

    return parsed.map((item, index) => ({
      ...item,
      id: item.id || `ai-q-${index + 1}`,
    }))
  } catch {
    return null
  }
}

async function getOrCreateTodayQuiz() {
  const adminClient = getAdminClient()
  const store = await readJsonFromStorage<BingoStore>(adminClient, STORAGE_PATH, { days: {} })
  const key = todayKey()
  const existing = store.days[key]

  if (existing) {
    return { adminClient, store, key, quiz: existing }
  }

  const generated = await generateWithGemini()
  const quiz: DailyQuiz = {
    source: generated ? 'gemini' : 'fallback',
    questions: generated ?? FALLBACK_QUESTIONS,
    users: {},
  }

  store.days[key] = quiz
  await writeJsonToStorage(adminClient, STORAGE_PATH, store)

  return { adminClient, store, key, quiz }
}

function sanitizeState(state?: DailyUserState): DailyUserState {
  return state ?? {
    attempts: 0,
    correctCount: 0,
    completed: false,
    notified: false,
    answers: {},
  }
}

async function notifyAdmins(adminClient: ReturnType<typeof getAdminClient>, employeeId: string, fullName: string) {
  if (!RESEND_API_KEY) return

  const { data: admins } = await adminClient
    .from('profiles')
    .select('email, full_name')
    .eq('role', 'admin')
    .eq('is_active', true)

  const recipients = (admins ?? [])
    .map(admin => admin.email)
    .filter((email): email is string => Boolean(email))

  if (!recipients.length) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Tongyang LMS <onboarding@resend.dev>',
      to: recipients,
      subject: `[빙고퀴즈 완료] ${fullName} (${employeeId})`,
      html: `
        <div style="font-family: Malgun Gothic, sans-serif; line-height: 1.7;">
          <h2 style="margin-bottom: 8px;">오늘의 빙고퀴즈 완료</h2>
          <p><strong>${fullName}</strong> (${employeeId}) 사용자가 오늘의 빙고퀴즈 5문제를 모두 정답 처리했습니다.</p>
          <p>관리자 화면의 학습현황 및 빙고퀴즈 페이지에서 상태를 확인해 주세요.</p>
        </div>
      `,
    }),
  })
}

export async function GET(request: Request) {
  const auth = await requireSignedInProfile(request)
  if ('error' in auth) return auth.error

  try {
    const { quiz } = await getOrCreateTodayQuiz()
    const userState = sanitizeState(quiz.users[auth.profile.id])

    return json({
      ok: true,
      date: todayKey(),
      source: quiz.source,
      remainingAttempts: Math.max(0, 5 - userState.attempts),
      state: userState,
      questions: quiz.questions.map(question => {
        if (question.type === 'multiple') {
          return {
            id: question.id,
            type: question.type,
            question: question.question,
            choices: question.choices,
          }
        }

        return {
          id: question.id,
          type: question.type,
          question: question.question,
        }
      }),
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireSignedInProfile(request)
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const questionId = String(body.questionId ?? '').trim()
    const submittedAnswer = String(body.answer ?? '').trim()
    if (!questionId || !submittedAnswer) {
      return json({ ok: false, error: 'question_id_and_answer_required' }, 400)
    }

    const { adminClient, store, key, quiz } = await getOrCreateTodayQuiz()
    const userState = sanitizeState(quiz.users[auth.profile.id])

    if (userState.attempts >= 5) {
      return json({ ok: false, error: 'daily_limit_reached' }, 400)
    }

    if (userState.answers[questionId]) {
      return json({ ok: false, error: 'question_already_answered' }, 400)
    }

    const question = quiz.questions.find(item => item.id === questionId)
    if (!question) {
      return json({ ok: false, error: 'question_not_found' }, 404)
    }

    const correct = normalizeAnswer(question.answer) === normalizeAnswer(submittedAnswer)
    userState.attempts += 1
    userState.correctCount += correct ? 1 : 0
    userState.completed = userState.correctCount >= 5
    userState.answers[questionId] = {
      submittedAnswer,
      correct,
      answeredAt: new Date().toISOString(),
    }

    quiz.users[auth.profile.id] = userState
    store.days[key] = quiz

    if (userState.completed && !userState.notified) {
      await notifyAdmins(
        adminClient,
        auth.profile.employee_id ?? auth.profile.id,
        auth.profile.full_name ?? '미상'
      )
      userState.notified = true
    }

    await writeJsonToStorage(adminClient, STORAGE_PATH, store)

    return json({
      ok: true,
      correct,
      correctAnswer: question.answer,
      explanation: question.explanation,
      state: userState,
      remainingAttempts: Math.max(0, 5 - userState.attempts),
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
}
