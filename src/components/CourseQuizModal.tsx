import { useCallback, useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, Clock, Trophy, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Question = {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
}

interface Props {
  courseId: string
  courseTitle: string
  open: boolean
  onClose: () => void
}

const TOTAL = 10
const OPTIONS = ['A', 'B', 'C', 'D'] as const

function getScoreMessage(score: number): { emoji: string; title: string; sub: string; color: string } {
  if (score === 10) return { emoji: '\uD83C\uDF89', title: '\uC644\uBCBD\uD574\uC694! \uCC9C\uC7AC\uC2E0\uAC00\uC694?!', sub: '\uB0B4\uBD80\uD1B5\uC81C\uC758 \uB2EC\uC778\uC774\uC2DC\uAD70\uC694!', color: 'text-accent-600' }
  if (score >= 8) return { emoji: '\uD83D\uDC4F', title: '\uD6CC\uB96D\uD574\uC694!', sub: '\uB0B4\uBD80\uD68C\uACC4 \uC804\uBB38\uAC00 \uC218\uC900\uC774\uC5D0\uC694!', color: 'text-emerald-600' }
  if (score >= 6) return { emoji: '\uD83D\uDE0A', title: '\uC798\uD558\uC168\uC5B4\uC694!', sub: '\uC870\uAE08\uB9CC \uB354 \uACF5\uBD80\uD558\uBA74 \uB9CC\uC810!', color: 'text-blue-600' }
  if (score >= 4) return { emoji: '\uD83E\uDD14', title: '\uBCF4\uD1B5\uC774\uC5D0\uC694~', sub: '\uAC15\uC88C\uB97C \uD55C\uBC88 \uB354 \uBCF5\uC2B5\uD574\uBCF4\uC138\uC694!', color: 'text-orange-600' }
  if (score >= 2) return { emoji: '\uD83D\uDE05', title: '\uC880 \uB354 \uD30C\uC774\uD305!', sub: '\uAC15\uC758 \uB2E4\uC2DC \uB4E4\uC73C\uBA74 \uB2E4\uC74C\uC5D4 \uB354 \uC798\uD560 \uC218 \uC788\uC5B4\uC694!', color: 'text-red-500' }
  return { emoji: '\uD83D\uDE31', title: '\uC774\uAC74 \uC880... \uACF5\uBD80\uD558\uC168\uB098\uC694?', sub: '\uAC15\uC758\uB97C \uB2E4\uC2DC \uB4E4\uC5B4\uBCF4\uC138\uC694! \uD654\uC774\uD305!', color: 'text-warm-500' }
}

export default function CourseQuizModal({ courseId, courseTitle, open, onClose }: Props) {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all questions and randomly pick 10
      const { data } = await (supabase as any)
        .from('quiz_questions')
        .select('id, question, option_a, option_b, option_c, option_d, correct_answer')
      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setQuestions(shuffled.slice(0, TOTAL))
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchQuestions()
      setCurrentIdx(0)
      setAnswers({})
      setShowResult(false)
    }
  }, [open, fetchQuestions])

  const score = useMemo(() => {
    let s = 0
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) s++
    })
    return s
  }, [answers, questions])

  const elapsedSeconds = useMemo(() => Math.round((Date.now() - startTime) / 1000), [showResult])

  async function handleSubmit() {
    if (!profile?.id) return
    setSaving(true)
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    try {
      const answerDetails = questions.map((q, i) => ({
        question_id: q.id,
        selected: answers[i] ?? null,
        correct: q.correct_answer,
        is_correct: answers[i] === q.correct_answer,
      }))
      await (supabase as any).from('quiz_results').insert({
        user_id: profile.id,
        course_id: courseId,
        score,
        total_questions: questions.length,
        time_seconds: elapsed,
        answers: answerDetails,
      })
      // Award points: 1pt per correct answer
      if (score > 0) {
        await (supabase as any).from('user_points').insert({
          user_id: profile.id,
          action: 'quiz',
          points: score,
          description: `퀴즈 ${score}/${questions.length}점 (${courseTitle})`,
        })
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
      setShowResult(true)
    }
  }

  function selectAnswer(option: string) {
    setAnswers(prev => ({ ...prev, [currentIdx]: option }))
  }

  if (!open) return null

  const currentQ = questions[currentIdx]
  const msg = getScoreMessage(score)
  const allAnswered = Object.keys(answers).length >= questions.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-3xl border-b border-warm-100 bg-gradient-to-r from-brand-800 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80">COURSE QUIZ</p>
              <h2 className="mt-1 text-lg font-bold">수료 퀴즈</h2>
            </div>
            {!showResult && !loading && (
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
                <Clock size={14} />
                <span className="text-sm font-bold">{currentIdx + 1} / {questions.length}</span>
              </div>
            )}
          </div>
          {!showResult && !loading && (
            <div className="mt-3 h-1.5 rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-white transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center text-sm text-warm-400">퀴즈를 불러오는 중...</div>
          ) : showResult ? (
            /* Result Screen */
            <div className="text-center space-y-5">
              <div className="text-6xl">{msg.emoji}</div>
              <h3 className={clsx('text-2xl font-bold', msg.color)}>{msg.title}</h3>
              <p className="text-sm text-warm-500">{msg.sub}</p>

              <div className="mx-auto flex max-w-xs items-center justify-center gap-6 rounded-lg border border-warm-100 bg-warm-50 py-5">
                <div className="text-center">
                  <Trophy size={24} className="mx-auto text-accent-600" />
                  <p className="mt-1 text-2xl font-bold text-brand-900">{score}<span className="text-sm font-bold text-warm-400">/{questions.length}</span></p>
                  <p className="text-xs text-warm-400">정답</p>
                </div>
                <div className="h-10 w-px bg-warm-200" />
                <div className="text-center">
                  <Clock size={24} className="mx-auto text-blue-500" />
                  <p className="mt-1 text-2xl font-bold text-brand-900">{elapsedSeconds}<span className="text-sm font-bold text-warm-400">초</span></p>
                  <p className="text-xs text-warm-400">소요시간</p>
                </div>
              </div>

              {/* Answer review */}
              <div className="mt-4 max-h-52 overflow-y-auto space-y-2 text-left">
                {questions.map((q, i) => {
                  const correct = answers[i] === q.correct_answer
                  return (
                    <div key={q.id} className={clsx('flex items-start gap-2 rounded-xl px-3 py-2 text-sm',
                      correct ? 'bg-emerald-50' : 'bg-red-50'
                    )}>
                      {correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
                      <div className="min-w-0">
                        <p className="font-medium text-brand-700 line-clamp-1">Q{i + 1}. {q.question}</p>
                        {!correct && (
                          <p className="text-xs text-red-500 mt-0.5">
                            내 답: {answers[i] ?? '미응답'} → 정답: {q.correct_answer}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-brand-800 to-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:shadow-md transition"
              >
                확인
              </button>
            </div>
          ) : currentQ ? (
            /* Question Screen */
            <div className="space-y-5">
              <div className="rounded-lg bg-warm-50 px-5 py-4">
                <p className="text-sm font-bold text-brand-700">Q{currentIdx + 1}.</p>
                <p className="mt-2 text-base font-semibold leading-7 text-brand-900">{currentQ.question}</p>
              </div>

              <div className="space-y-2.5">
                {OPTIONS.map((opt) => {
                  const text = opt === 'A' ? currentQ.option_a : opt === 'B' ? currentQ.option_b : opt === 'C' ? currentQ.option_c : currentQ.option_d
                  const selected = answers[currentIdx] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(opt)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-left transition',
                        selected
                          ? 'border-brand-500 bg-warm-50 shadow-md'
                          : 'border-warm-200 bg-white hover:border-warm-300 hover:bg-warm-50'
                      )}
                    >
                      <span className={clsx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        selected ? 'bg-brand-800 text-white' : 'bg-warm-100 text-warm-500'
                      )}>
                        {opt}
                      </span>
                      <span className={clsx('text-sm leading-6', selected ? 'font-bold text-brand-800' : 'text-brand-700')}>
                        {text}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                  disabled={currentIdx === 0}
                  className="rounded-xl border border-warm-200 px-4 py-2.5 text-sm font-semibold text-warm-600 transition hover:bg-warm-50 disabled:opacity-30"
                >
                  이전
                </button>

                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(i => i + 1)}
                    disabled={!answers[currentIdx]}
                    className="rounded-xl bg-brand-800 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-brand-900 disabled:opacity-30"
                  >
                    다음
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || saving}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-md disabled:opacity-30"
                  >
                    <Award size={16} />
                    {saving ? '저장 중...' : '제출하기'}
                  </button>
                )}
              </div>

              {/* Quick nav dots */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={clsx(
                      'h-2.5 w-2.5 rounded-full transition',
                      i === currentIdx ? 'bg-brand-800 scale-125' :
                      answers[i] ? 'bg-brand-300' : 'bg-warm-200'
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-warm-400">퀴즈 문제가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  )
}
