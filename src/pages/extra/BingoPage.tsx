import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Gamepad2, RefreshCw, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

type QuizQuestion = {
  id: string
  type: 'multiple' | 'subjective'
  question: string
  choices?: string[]
}

type UserState = {
  attempts: number
  correctCount: number
  completed: boolean
  answers: Record<string, { submittedAnswer: string; correct: boolean; answeredAt: string }>
}

type DailyQuizResponse = {
  ok: boolean
  date: string
  source: 'gemini' | 'fallback'
  remainingAttempts: number
  state: UserState
  questions: QuizQuestion[]
}

const CLIENT_FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'fb-1',
    type: 'multiple',
    question: '내부회계관리제도에서 통제활동의 목적에 가장 가까운 것은 무엇인가요?',
    choices: ['매출 확대', '위험 감소', '채용 확대', '사무실 이전', '광고 집행', '원가 인상', '제품 출시'],
  },
  {
    id: 'fb-2',
    type: 'multiple',
    question: 'RCM은 주로 무엇을 정리하는 문서인가요?',
    choices: ['연말정산 결과', '위험과 통제 매핑', '급여 대장', '채용 현황', '법인카드 사용 내역', '영업 실적표', '자산 매각 계획'],
  },
  {
    id: 'fb-3',
    type: 'multiple',
    question: '증빙 결재 상신 전 가장 먼저 확인해야 할 항목은 무엇인가요?',
    choices: ['이미지 해상도', '대표이사 승인 여부', '첨부 증빙의 관련성', '회사 로고 위치', '메일 제목 길이', '브라우저 버전', '폰트 종류'],
  },
  {
    id: 'fb-4',
    type: 'multiple',
    question: '모집단과 RCM을 사번 기준으로 연결하려는 가장 큰 이유는 무엇인가요?',
    choices: ['화면 색상을 맞추기 위해', '사용자 개인화 광고를 위해', '담당자 식별을 일관되게 하기 위해', '파일 용량을 줄이기 위해', '지도를 출력하기 위해', '로그인 화면을 숨기기 위해', '비밀번호를 길게 만들기 위해'],
  },
  {
    id: 'fb-5',
    type: 'subjective',
    question: '증빙이 반려되었을 때 가장 먼저 해야 하는 조치를 짧게 한 단어로 적어주세요.',
  },
]

function buildFallbackResponse(): DailyQuizResponse {
  return {
    ok: true,
    date: new Date().toISOString().slice(0, 10),
    source: 'fallback',
    remainingAttempts: 5,
    state: { attempts: 0, correctCount: 0, completed: false, answers: {} },
    questions: CLIENT_FALLBACK_QUESTIONS,
  }
}

export default function BingoPage() {
  const [data, setData] = useState<DailyQuizResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeQuestion = useMemo(
    () => data?.questions.find(question => question.id === activeId) ?? null,
    [activeId, data]
  )

  async function fetchDailyQuiz() {
    setLoading(true)
    setMessage(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/bingo-daily', {
        headers: {
          authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      })

      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        // API failed - use client-side fallback so the page still renders
        setMessage('서버 연결 실패로 기본 문제를 표시합니다. 답안 제출은 로그인 후 가능합니다.')
        setData(buildFallbackResponse())
        setLoading(false)
        return
      }

      setData(payload)
    } catch {
      // Network or auth error - show fallback questions instead of blank page
      setMessage('서버 연결 실패로 기본 문제를 표시합니다. 답안 제출은 로그인 후 가능합니다.')
      setData(buildFallbackResponse())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDailyQuiz()
  }, [])

  async function submitAnswer() {
    if (!activeQuestion || !data) return

    const answer = activeQuestion.type === 'subjective' ? subjectiveAnswer : selectedChoice
    if (!answer.trim()) return

    setSubmitting(true)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const response = await fetch('/api/bingo-daily', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        questionId: activeQuestion.id,
        answer,
      }),
    })

    const payload = await response.json()
    if (!response.ok || !payload.ok) {
      setMessage(payload.error ?? '정답 처리에 실패했습니다.')
      setSubmitting(false)
      return
    }

    setData(prev => prev ? {
      ...prev,
      state: payload.state,
      remainingAttempts: payload.remainingAttempts,
    } : prev)

    setMessage(
      payload.correct
        ? '정답입니다.'
        : `틀렸습니다. 정답은 "${payload.correctAnswer}" 입니다. ${payload.explanation}`
    )

    setActiveId(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-brand-700 via-indigo-700 to-slate-900 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-brand-100/70">DAILY QUIZ</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <Gamepad2 size={28} className="text-brand-200" />
          빙고퀴즈
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-50/90">
          하루에 5문제만 풀 수 있습니다. 4문제는 7지선다 객관식, 1문제는 주관식이며 5문제를 모두 맞히면
          축하 메시지와 함께 관리자에게 완료 메일이 발송됩니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={clsx('badge', data?.source === 'gemini' ? 'badge-purple' : 'badge-blue')}>
                {data?.source === 'gemini' ? 'Gemini 생성 문제' : '기본 문제'}
              </span>
              <span className="text-sm text-slate-500">
                남은 시도 {data?.remainingAttempts ?? 0}회
              </span>
            </div>

            <button
              onClick={() => void fetchDailyQuiz()}
              className="btn-secondary py-2 text-xs"
            >
              <RefreshCw size={14} />
              다시 불러오기
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {(data?.questions ?? []).map((question, index) => {
              const answerState = data?.state.answers[question.id]
              return (
                <button
                  key={question.id}
                  onClick={() => setActiveId(question.id)}
                  disabled={Boolean(answerState) || data?.remainingAttempts === 0}
                  className={clsx(
                    'aspect-square rounded-[22px] border p-3 text-left transition',
                    answerState?.correct
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : answerState
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : activeId === question.id
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40'
                  )}
                  style={{ minHeight: '76px' }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <span className="text-[11px] font-semibold">문제 {index + 1}</span>
                    <span className="text-sm font-black">
                      {answerState ? (answerState.correct ? '정답' : '오답') : question.type === 'multiple' ? '객관식' : '주관식'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {data?.state.completed && (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <p className="text-lg font-black">축하합니다. 오늘의 5문제를 모두 맞혔습니다.</p>
              </div>
              <p className="mt-2 text-sm">
                관리자에게 완료 메일도 발송되도록 처리했습니다.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton h-6 w-5/6 rounded" />
              <div className="skeleton h-24 w-full rounded-[20px]" />
            </div>
          ) : activeQuestion ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">QUESTION</p>
                <h2 className="mt-2 text-xl font-black leading-8 text-slate-900">
                  {activeQuestion.question}
                </h2>
              </div>

              {activeQuestion.type === 'multiple' ? (
                <div className="grid gap-2">
                  {activeQuestion.choices?.map(choice => (
                    <button
                      key={choice}
                      onClick={() => setSelectedChoice(choice)}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                        selectedChoice === choice
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 hover:border-brand-100 hover:bg-slate-50'
                      )}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={subjectiveAnswer}
                  onChange={event => setSubjectiveAnswer(event.target.value)}
                  className="form-input"
                  placeholder="정답을 입력해 주세요."
                />
              )}

              <button
                onClick={() => void submitAnswer()}
                disabled={submitting || (!selectedChoice && !subjectiveAnswer.trim())}
                className="btn-primary w-full justify-center py-3"
              >
                <CheckCircle2 size={16} />
                답안 제출
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <Gamepad2 size={36} className="text-slate-300" />
              <p className="mt-4 text-lg font-bold text-slate-700">왼쪽 빙고칸을 눌러 문제를 선택해 주세요.</p>
              <p className="mt-2 text-sm leading-6">
                박스를 작게 줄여서 한눈에 상태가 보이도록 바꿨습니다.
              </p>
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
