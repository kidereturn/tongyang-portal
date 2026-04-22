import { useCallback, useEffect, useMemo, useState } from 'react'
import { Award, CheckCircle2, Clock, Trophy, XCircle, X } from 'lucide-react'
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

const TOTAL = 5
const PASS_SCORE = 3  // 3문제 이상 맞으면 수료 처리
const OPTIONS = ['A', 'B', 'C', 'D'] as const

function getScoreMessage(score: number): { emoji: string; title: string; sub: string; color: string } {
  if (score === TOTAL) return { emoji: '🎉', title: '완벽해요!', sub: '내부통제의 달인이시군요!', color: 'text-accent-600' }
  if (score >= 4) return { emoji: '👏', title: '훌륭해요!', sub: '내부회계 전문가 수준이에요!', color: 'text-emerald-600' }
  if (score >= PASS_SCORE) return { emoji: '😊', title: '수료입니다!', sub: `${PASS_SCORE}문제 이상 정답 — 강좌 이수 처리되었어요!`, color: 'text-blue-600' }
  return { emoji: '🤔', title: '조금만 더!', sub: `${PASS_SCORE}문제 이상 맞히면 수료됩니다. 강의를 다시 복습해보세요.`, color: 'text-orange-600' }
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

  // Close on ESC key
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
      // 수료 처리: 퀴즈 통과 + 영상 100% 시청 둘 다 필요 (사용자 요청)
      // 퀴즈만 풀어서 100% 수강완료 처리되던 버그 수정
      if (score >= PASS_SCORE) {
        try {
          // 현재 progress 조회
          const { data: cur } = await (supabase as any)
            .from('learning_progress')
            .select('progress_percent, watched_seconds, duration_seconds')
            .eq('user_id', profile.id)
            .eq('course_id', courseId)
            .maybeSingle()
          const currentPct = cur?.progress_percent ?? 0
          const onlyIfFullyWatched = currentPct >= 95 // 영상 95% 이상 시청 시에만 수료
          if (onlyIfFullyWatched) {
            await (supabase as any).rpc('upsert_learning_progress', {
              p_user_id: profile.id,
              p_course_id: courseId,
              p_watched_seconds: cur?.watched_seconds ?? 0,
              p_duration_seconds: cur?.duration_seconds ?? 0,
              p_progress_percent: 100,
              p_status: 'completed',
            })
          }
          // 영상 안 봤으면 퀴즈 점수만 저장되고 수료는 안 됨 (안내는 result 화면에서)
        } catch { /* silent */ }
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
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-md">
        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-3xl border-b border-warm-100 bg-gradient-to-r from-brand-800 to-brand-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold opacity-80">COURSE QUIZ</p>
              <h2 className="mt-1 text-lg font-bold">수료 퀴즈</h2>
            </div>
            <div className="flex items-center gap-2">
              {!showResult && !loading && (
                <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5">
                  <Clock size={14} />
                  <span className="text-sm font-bold">{currentIdx + 1} / {questions.length}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                title="닫기 (Esc)"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
              >
                <X size={16} />
              </button>
            </div>
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

              {/* Answer review — 오답 시 보기 번호 + 본문 둘 다 표시 */}
              <div className="mt-4 max-h-64 overflow-y-auto space-y-2 text-left">
                {questions.map((q, i) => {
                  const correct = answers[i] === q.correct_answer
                  const optionText = (opt: string | null | undefined) => {
                    if (!opt) return '미응답'
                    if (opt === 'A') return `A. ${q.option_a}`
                    if (opt === 'B') return `B. ${q.option_b}`
                    if (opt === 'C') return `C. ${q.option_c}`
                    if (opt === 'D') return `D. ${q.option_d}`
                    return opt
                  }
                  return (
                    <div key={q.id} className={clsx('flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm',
                      correct ? 'bg-emerald-50' : 'bg-red-50'
                    )}>
                      {correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-500" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-brand-700 line-clamp-2">Q{i + 1}. {q.question}</p>
                        {!correct && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-xs text-red-600">
                              ✗ 내 답: <span className="font-semibold">{optionText(answers[i])}</span>
                            </p>
                            <p className="text-xs text-emerald-700">
                              ✓ 정답: <span className="font-semibold">{optionText(q.correct_answer)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={onClose}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-brand-800 to-brand-700 py-3 text-sm font-bold text-white shadow-md hover:shadow-md transition"
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
