import { useEffect, useMemo, useRef, useState } from 'react'
import { Gamepad2, Gift, RefreshCw, Sparkles, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type QuizQuestion, ALL_QUESTIONS } from '../../data/quizQuestions'

// ────────────────────────────────────────────
// 25문제를 랜덤 배치, 주관식 위치도 매번 랜덤
// ────────────────────────────────────────────
function buildBingoQuestions(): QuizQuestion[] {
  const multiples = ALL_QUESTIONS.filter(q => q.type === 'multiple')
  const subjectives = ALL_QUESTIONS.filter(q => q.type === 'subjective')

  const shuffleArr = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffledMulti = shuffleArr(multiples)
  const shuffledSub = shuffleArr(subjectives)

  // 주관식 3개 위치를 0~24 중 랜덤 선택
  const allPositions = Array.from({ length: 25 }, (_, i) => i)
  const shuffledPositions = shuffleArr(allPositions)
  const subjectivePositions = new Set(shuffledPositions.slice(0, 3))

  const result: QuizQuestion[] = []
  let mi = 0
  let si = 0

  for (let pos = 0; pos < 25; pos++) {
    if (subjectivePositions.has(pos)) {
      result.push(shuffledSub[si % shuffledSub.length])
      si++
    } else {
      result.push(shuffledMulti[mi % shuffledMulti.length])
      mi++
    }
  }

  return result
}

// ────────────────────────────────────────────
// Bingo line detection (rows, cols, diagonals)
// ────────────────────────────────────────────
const BINGO_LINES: number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
]

function countBingoLines(correct: Set<number>): number {
  return BINGO_LINES.filter(line => line.every(i => correct.has(i))).length
}

function getBingoLineIndices(correct: Set<number>): Set<number> {
  const indices = new Set<number>()
  BINGO_LINES.forEach(line => {
    if (line.every(i => correct.has(i))) {
      line.forEach(i => indices.add(i))
    }
  })
  return indices
}

// ────────────────────────────────────────────
// Answer checker
// ────────────────────────────────────────────
function checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  const nu = userAnswer.trim().toLowerCase().replace(/\s+/g, '')
  const nc = question.answer.trim().toLowerCase().replace(/\s+/g, '')
  if (question.type === 'subjective') {
    return nu === nc || nc.includes(nu) || nu.includes(nc)
  }
  return nu === nc
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
export default function BingoPage() {
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => buildBingoQuestions())
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState('')
  const [answers, setAnswers] = useState<Record<number, { correct: boolean; explanation: string }>>({})
  const [timer, setTimer] = useState(10)
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastMessage, setLastMessage] = useState<{ correct: boolean; text: string } | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [dailyPlays, setDailyPlays] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeIdxRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)

  const MAX_DAILY_PLAYS = 3

  // 오늘 도전 횟수 로드
  useEffect(() => {
    if (!profile?.id) return
    const key = `bingo_plays_${profile.id}_${new Date().toISOString().slice(0, 10)}`
    const count = parseInt(localStorage.getItem(key) ?? '0', 10)
    setDailyPlays(count)
  }, [profile?.id])

  function incrementDailyPlays() {
    if (!profile?.id) return
    const key = `bingo_plays_${profile.id}_${new Date().toISOString().slice(0, 10)}`
    const next = dailyPlays + 1
    localStorage.setItem(key, String(next))
    setDailyPlays(next)
  }

  const remainingPlays = MAX_DAILY_PLAYS - dailyPlays
  const canPlay = remainingPlays > 0

  const correctSet = useMemo(() => {
    const s = new Set<number>()
    Object.entries(answers).forEach(([k, v]) => { if (v.correct) s.add(Number(k)) })
    return s
  }, [answers])

  const bingoCount = useMemo(() => countBingoLines(correctSet), [correctSet])
  const bingoIndices = useMemo(() => getBingoLineIndices(correctSet), [correctSet])

  // Keep ref in sync for timer callback
  activeIdxRef.current = activeIdx

  // Timer logic — uses ref to avoid stale closures
  useEffect(() => {
    if (activeIdx === null) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    setTimer(10)
    setShowExplosion(false)

    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Time's up — trigger explosion and mark wrong
          if (timerRef.current) clearInterval(timerRef.current)
          const idx = activeIdxRef.current
          if (idx !== null) {
            setShowExplosion(true)
            // Delay to show explosion, then process timeout
            setTimeout(() => {
              const q = questions[idx]
              if (q) {
                setAnswers(old => ({
                  ...old,
                  [idx]: { correct: false, explanation: `💥 시간초과! 정답: "${q.answer}". ${q.explanation}` },
                }))
                setLastMessage({ correct: false, text: `💥 폭발! 시간초과! 정답: "${q.answer}"` })
              }
              setActiveIdx(null)
              setSubjectiveAnswer('')
              setSelectedChoice('')
              setShowExplosion(false)
            }, 1200)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])

  // Celebration at 3 bingo lines
  useEffect(() => {
    if (bingoCount >= 3 && !notifiedRef.current) {
      notifiedRef.current = true
      setShowCelebration(true)
      notifyAdminBingoWin()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingoCount])

  function openCell(idx: number) {
    if (answers[idx] !== undefined || activeIdx !== null) return
    if (!canPlay && Object.keys(answers).length === 0) {
      alert(`오늘의 도전 기회 ${MAX_DAILY_PLAYS}회를 모두 사용했습니다.\n내일 다시 도전하세요!`)
      return
    }
    // 게임 시작 시(첫 셀 클릭) 도전 횟수 증가
    if (Object.keys(answers).length === 0) {
      incrementDailyPlays()
    }
    setActiveIdx(idx)
    setLastMessage(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
  }

  function submitAnswer() {
    if (activeIdx === null) return
    if (timerRef.current) clearInterval(timerRef.current)

    const q = questions[activeIdx]
    const userAns = q.type === 'subjective' ? subjectiveAnswer : selectedChoice
    if (!userAns.trim()) return

    const correct = checkAnswer(q, userAns)
    const explanation = correct
      ? `정답! ${q.explanation}`
      : `오답. 정답: "${q.answer}". ${q.explanation}`

    setAnswers(prev => ({ ...prev, [activeIdx]: { correct, explanation } }))
    setLastMessage({ correct, text: correct ? '정답입니다!' : `오답. 정답: "${q.answer}"` })
    setActiveIdx(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
  }

  async function notifyAdminBingoWin() {
    try {
      const userName = profile?.full_name ?? '알 수 없음'
      const employeeId = profile?.employee_id ?? ''
      const dept = profile?.department ?? ''
      const today = new Date().toLocaleDateString('ko-KR')

      const { data: admins } = await (supabase as any)
        .from('profiles').select('id').eq('role', 'admin').eq('is_active', true)

      if (admins?.length) {
        const notifications = admins.map((a: { id: string }) => ({
          recipient_id: a.id,
          sender_id: profile?.id ?? null,
          title: `빙고퀴즈 3줄 완성! - ${userName} (${employeeId})`,
          body: `${today} 빙고퀴즈에서 3줄을 완성했습니다.\n이름: ${userName}\n사번: ${employeeId}\n부서: ${dept}\n선물 지급을 검토해 주세요.`,
          is_read: false,
        }))
        await (supabase as any).from('notifications').insert(notifications)
      }

      try {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            type: 'bingo_winner',
            to: 'junghoon.ha@tongyanginc.co.kr',
            recipientName: '관리자',
            submitterName: userName,
            controlCode: `빙고 3줄 완성`,
            activityTitle: `${userName}(${employeeId}) - ${dept}`,
            uniqueKey: `bingo-${today}`,
          },
        })
      } catch { /* email optional */ }
    } catch (err) {
      console.error('Failed to notify admin:', err)
    }
  }

  function resetGame() {
    setQuestions(buildBingoQuestions())
    setAnswers({})
    setActiveIdx(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    setShowCelebration(false)
    setLastMessage(null)
    notifiedRef.current = false
  }

  const activeQuestion = activeIdx !== null ? questions[activeIdx] : null

  return (
    <div className="space-y-6">
      {/* CSS for bomb animation */}
      <style>{`
        @keyframes bombShake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          10% { transform: rotate(-8deg) scale(1.05); }
          20% { transform: rotate(8deg) scale(1.1); }
          30% { transform: rotate(-8deg) scale(1.05); }
          40% { transform: rotate(8deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1.15); }
          60% { transform: rotate(-5deg) scale(1.1); }
          70% { transform: rotate(5deg) scale(1.05); }
          80% { transform: rotate(-5deg) scale(1.1); }
          90% { transform: rotate(5deg) scale(1.05); }
        }
        @keyframes fuseGlow {
          0%, 100% { text-shadow: 0 0 8px #ff6b00, 0 0 16px #ff0000; }
          50% { text-shadow: 0 0 16px #ff6b00, 0 0 32px #ff0000, 0 0 48px #ffaa00; }
        }
        @keyframes confettiFall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes explode {
          0% { transform: scale(1); opacity: 1; }
          30% { transform: scale(2.5); opacity: 1; }
          60% { transform: scale(4); opacity: 0.7; }
          100% { transform: scale(6); opacity: 0; }
        }
        @keyframes shockwave {
          0% { transform: scale(0); opacity: 0.8; border-width: 8px; }
          100% { transform: scale(8); opacity: 0; border-width: 1px; }
        }
        @keyframes giftFlash {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          25% { opacity: 0.9; transform: scale(1.08) rotate(-2deg); background: linear-gradient(135deg, #f59e0b, #ef4444); }
          50% { opacity: 1; transform: scale(1.12) rotate(2deg); background: linear-gradient(135deg, #ef4444, #8b5cf6); }
          75% { opacity: 0.9; transform: scale(1.05) rotate(-1deg); background: linear-gradient(135deg, #8b5cf6, #f59e0b); }
        }
        @keyframes hurryFlash {
          0%, 100% { opacity: 1; color: #ef4444; transform: scale(1); }
          50% { opacity: 0.4; color: #f97316; transform: scale(1.15); }
        }
        .bomb-anim { animation: bombShake 0.8s ease-in-out infinite; }
        .fuse-glow { animation: fuseGlow 0.5s ease-in-out infinite; }
        .confetti { animation: confettiFall 3s linear forwards; }
        .explode-anim { animation: explode 1s ease-out forwards; }
        .shockwave-anim { animation: shockwave 0.8s ease-out forwards; }
        .gift-flash { animation: giftFlash 1.5s ease-in-out infinite; }
        .hurry-flash { animation: hurryFlash 0.4s ease-in-out infinite; }
      `}</style>

      {/* Header — compact */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 via-indigo-700 to-slate-900 px-5 py-5 text-white shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-black">
              <Gamepad2 size={22} className="text-brand-200" />
              빙고퀴즈 5x5
            </h1>
            <p className="mt-1 text-xs text-brand-50/80">
              25칸 빙고판 · 문제당 <b className="text-yellow-300">10초</b> · 하루 <b className="text-yellow-300">{MAX_DAILY_PLAYS}회</b> 도전 · 주관식은 랜덤 위치!
            </p>
          </div>
          <div className="gift-flash inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 border border-amber-400/30 px-4 py-2 shadow-lg">
            <Gift size={18} className="text-white" />
            <span className="text-sm font-black text-white drop-shadow-md">3줄 완성 기프티콘 증정!</span>
            <span className="text-lg">🎁</span>
          </div>
        </div>
      </div>

      {/* Bingo status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Sparkles size={16} className="text-amber-500" />
          <span className="text-sm font-bold text-slate-900">빙고 {bingoCount}줄</span>
          <span className="text-xs text-slate-400">/ 3줄 목표</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-sm text-slate-600">정답 <b className="text-emerald-600">{correctSet.size}</b></span>
          <span className="text-sm text-slate-400">/ 25</span>
        </div>
        <div className={clsx(
          'flex items-center gap-1.5 rounded-2xl border px-4 py-2 shadow-sm',
          canPlay ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
        )}>
          <span className="text-xs font-semibold text-slate-600">오늘 도전</span>
          <span className={clsx('text-sm font-black', canPlay ? 'text-amber-600' : 'text-red-500')}>
            {dailyPlays}/{MAX_DAILY_PLAYS}
          </span>
          <span className="text-xs text-slate-400">
            {canPlay ? `(${remainingPlays}회 남음)` : '(소진)'}
          </span>
        </div>
        {canPlay ? (
          <button onClick={resetGame} className="ml-auto btn-ghost text-xs">
            <RefreshCw size={14} /> 새 게임
          </button>
        ) : (
          <span className="ml-auto text-xs text-red-500 font-semibold">
            오늘의 도전 기회를 모두 사용했습니다. 내일 다시 도전하세요!
          </span>
        )}
      </div>

      {/* Bingo Board + Question side by side */}
      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <div>
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 max-w-[280px]">
          {questions.map((_q, idx) => {
            const answered = answers[idx]
            const isActive = activeIdx === idx
            const isBingoLine = bingoIndices.has(idx)
            const cellNum = idx + 1
            return (
              <button
                key={idx}
                onClick={() => openCell(idx)}
                disabled={answered !== undefined || activeIdx !== null}
                className={clsx(
                  'relative aspect-square rounded-lg sm:rounded-xl border-2 text-sm sm:text-base font-black transition-all duration-200',
                  answered === undefined && activeIdx === null && 'hover:scale-105 hover:shadow-lg cursor-pointer',
                  answered === undefined && !isActive && 'bg-white border-slate-200 text-slate-700',
                  answered?.correct && isBingoLine && 'bg-gradient-to-br from-amber-400 to-yellow-500 border-amber-500 text-white shadow-lg ring-2 ring-amber-300',
                  answered?.correct && !isBingoLine && 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600 text-white',
                  answered && !answered.correct && 'bg-slate-100 border-slate-200 text-slate-300 line-through',
                  isActive && 'ring-4 ring-brand-400 border-brand-500 bg-brand-50',
                  answered !== undefined && 'cursor-default',
                )}
              >
                {cellNum}
                {answered?.correct && (
                  <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl opacity-30">O</span>
                )}
                {answered && !answered.correct && (
                  <span className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl opacity-30">X</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right column: Question panel */}
      <div className="space-y-4">
      {/* Last message */}
      {lastMessage && !activeQuestion && (
        <div className={clsx(
          'card p-4 text-sm font-medium',
          lastMessage.correct ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        )}>
          {lastMessage.text}
        </div>
      )}

      {/* Active question panel */}
      {activeQuestion && activeIdx !== null ? (
        <div className="card overflow-hidden border-2 border-brand-200 shadow-xl">
          {/* Timer bar */}
          <div className="relative h-2 bg-slate-100">
            <div
              className={clsx(
                'h-full transition-all duration-1000 rounded-r-full',
                timer > 5 ? 'bg-emerald-500' : timer > 2 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${(timer / 10) * 100}%` }}
            />
          </div>

          <div className="p-5 sm:p-6">
            {/* Timer + bomb */}
            <div className="flex items-center justify-between mb-4">
              <span className="badge badge-blue">문제 {activeIdx + 1} / 25</span>
              <div className="flex items-center gap-2">
                {timer <= 5 && timer > 0 && (
                  <span className="hurry-flash text-lg font-black mr-1">HURRY UP!!!</span>
                )}
                <span className={clsx('text-3xl bomb-anim', timer <= 3 && 'fuse-glow')}>
                  💣
                </span>
                <span className={clsx(
                  'text-2xl font-black tabular-nums',
                  timer > 5 ? 'text-slate-700' : timer > 2 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {timer}
                </span>
              </div>
            </div>

            {/* Question */}
            <p className="text-base font-bold text-slate-900 leading-7 mb-5">
              {activeQuestion.question}
            </p>

            {/* Choices or input */}
            {activeQuestion.type === 'multiple' && activeQuestion.choices ? (
              <div className="space-y-2 mb-5">
                {activeQuestion.choices.map((choice, ci) => (
                  <button
                    key={ci}
                    onClick={() => setSelectedChoice(choice)}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
                      selectedChoice === choice
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <span className="mr-2 text-xs text-slate-400">{String.fromCharCode(65 + ci)}.</span>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-5">
                <input
                  type="text"
                  value={subjectiveAnswer}
                  onChange={e => setSubjectiveAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                  placeholder="정답을 입력하세요..."
                  className="form-input text-base"
                  autoFocus
                />
              </div>
            )}

            {/* Action buttons — 취소 없음, 반드시 답변해야 함 */}
            <div className="flex gap-3">
              <button
                onClick={submitAnswer}
                disabled={
                  activeQuestion.type === 'subjective'
                    ? !subjectiveAnswer.trim()
                    : !selectedChoice
                }
                className="btn-primary flex-1"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-center text-sm text-slate-400">
          <p className="text-lg mb-2">👈</p>
          <p>왼쪽 빙고판에서 번호를 클릭하세요</p>
        </div>
      )}

      {/* Answer history (collapsed) */}
      {Object.keys(answers).length > 0 && (
        <details className="card overflow-hidden">
          <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            풀이 내역 ({Object.keys(answers).length}/25)
          </summary>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {Object.entries(answers).sort(([a], [b]) => Number(a) - Number(b)).map(([idx, ans]) => (
              <div key={idx} className={clsx('px-5 py-3 text-sm', ans.correct ? 'bg-emerald-50/40' : 'bg-red-50/40')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={clsx('font-bold', ans.correct ? 'text-emerald-600' : 'text-red-500')}>
                    {ans.correct ? 'O' : 'X'} 문제 {Number(idx) + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{ans.explanation}</p>
              </div>
            ))}
          </div>
        </details>
      )}
      </div>{/* end right column */}
      </div>{/* end grid */}

      {/* Explosion overlay */}
      {showExplosion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="relative">
            <div className="explode-anim text-8xl">💥</div>
            <div className="shockwave-anim absolute inset-0 rounded-full border-red-500" style={{ width: 80, height: 80, margin: 'auto', top: 0, bottom: 0, left: 0, right: 0 }} />
          </div>
          <p className="absolute bottom-1/3 text-3xl font-black text-red-500 animate-pulse">시간 초과!</p>
        </div>
      )}

      {/* Celebration modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* Confetti */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="confetti fixed text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '🎊', '✨', '⭐', '🏆', '🎁'][i % 6]}
            </div>
          ))}

          <div className="relative mx-4 max-w-md w-full rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">축하합니다!</h2>
            <p className="mt-2 text-lg font-bold text-amber-600">빙고 3줄 완성!</p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-5 py-3">
              <Gift size={20} className="text-amber-500" />
              <span className="text-sm font-bold text-amber-700">선물이 지급됩니다! 관리자에게 알림이 발송되었습니다.</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              정답 {correctSet.size}/25 · 빙고 {bingoCount}줄
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCelebration(false)}
                className="btn-secondary flex-1"
              >
                닫기
              </button>
              <button
                onClick={() => { setShowCelebration(false); resetGame() }}
                className="btn-primary flex-1"
              >
                <RefreshCw size={15} /> 새 게임
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
