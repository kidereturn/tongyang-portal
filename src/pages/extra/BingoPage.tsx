import { useEffect, useMemo, useRef, useState } from 'react'
import { Gift, RefreshCw, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { type QuizQuestion, ALL_QUESTIONS } from '../../data/quizQuestions'

// ────────────────────────────────────────────
// Static cell templates (emoji + label + points) — 25 cells
// ────────────────────────────────────────────
const BINGO_CELL_TEMPLATES: Array<{ emoji: string; label: string; points: number }> = [
  { emoji: '📚', label: 'ESG 교육 수료', points: 10 },
  { emoji: '📝', label: '4월 설문 응답', points: 15 },
  { emoji: '👀', label: '공지 5개 확인', points: 10 },
  { emoji: '🎯', label: 'RCM 퀴즈 만점', points: 20 },
  { emoji: '💬', label: '말씀 3건 투표', points: 15 },
  { emoji: '📖', label: '주간 뉴스 읽기', points: 10 },
  { emoji: '🏆', label: '증빙 10건 제출', points: 20 },
  { emoji: '⭐', label: 'FREE', points: 0 },
  { emoji: '💭', label: '말씀하세요 작성', points: 10 },
  { emoji: '📊', label: 'KPI 대시보드 확인', points: 15 },
  { emoji: '👋', label: '동료 칭찬 1건', points: 10 },
  { emoji: '🎓', label: 'COSO 강좌 50%', points: 15 },
  { emoji: '✅', label: '내 승인함 처리', points: 20 },
  { emoji: '📁', label: '파일 공유 1건', points: 15 },
  { emoji: '🎨', label: '웹툰 4편 완주', points: 20 },
  { emoji: '📅', label: '교육 신청', points: 15 },
  { emoji: '🔎', label: '모집단 확인', points: 10 },
  { emoji: '🚀', label: '사업장 방문 리포트', points: 20 },
  { emoji: '🧩', label: '내부통제 용어 퀴즈', points: 15 },
  { emoji: '🎁', label: '복지몰 방문', points: 10 },
  { emoji: '🏅', label: '월간 TOP 10 달성', points: 20 },
  { emoji: '🎤', label: '세미나 참석', points: 15 },
  { emoji: '📈', label: 'KPI 3개 지표 갱신', points: 20 },
  { emoji: '🎃', label: '이벤트 참여', points: 15 },
  { emoji: '💎', label: '월간 달인 뱃지', points: 25 },
]

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
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <>
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

      {/* Toss pg-head */}
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">이벤트<span className="sep" />월 빙고퀴즈</div>
            <h1>빙고. <span className="soft">한 줄이면 커피, 네 줄이면 전설.</span></h1>
            <p className="lead">
              이번 달 25개 미션. 완료하면 포인트가 적립되고, 가로·세로·대각선 3줄 이상이면 기프티콘이 지급됩니다.
              문제당 <b>10초</b> · 하루 <b>{MAX_DAILY_PLAYS}회</b> 도전.
            </p>
          </div>
          <div className="actions">
            <button className="btn-compact" disabled={!canPlay} onClick={resetGame}>
              <RefreshCw size={13} />새 게임
            </button>
            <button className="btn-compact primary">
              <Gift size={13} />내 리워드
            </button>
          </div>
        </div>
      </div>

      <div className="pg-body">
        <div className="at-grid at-g-2-1" style={{ gap: 28, alignItems: 'start' }}>
          {/* ─── Bingo board (left, larger) ─── */}
          <div className="at-card" style={{ padding: 32, background: 'var(--at-paper)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  MY BINGO · {currentMonth}
                </div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>
                  {correctSet.size}/25 완료 · <span style={{ color: 'var(--at-blue)' }}>{bingoCount}줄 달성</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="at-tag blue">오늘 도전 {dailyPlays}/{MAX_DAILY_PLAYS}</span>
              </div>
            </div>

            {/* 5×5 grid — 30% smaller with sky-blue cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, maxWidth: 560, margin: '0 auto' }}>
              {questions.map((_q, idx) => {
                const tpl = BINGO_CELL_TEMPLATES[idx]
                const answered = answers[idx]
                const isBingoLine = bingoIndices.has(idx)
                const isFree = tpl?.label === 'FREE'
                const isCorrect = answered?.correct
                const isWrong = answered && !answered.correct

                let cellStyle: React.CSSProperties = {
                  aspectRatio: '1',
                  borderRadius: 12,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }

                if (isFree) {
                  cellStyle.background = 'var(--at-ink)'
                  cellStyle.color = 'var(--at-white)'
                } else if (isCorrect) {
                  cellStyle.background = isBingoLine
                    ? 'linear-gradient(135deg, #F59E0B, #EAB308)'
                    : 'linear-gradient(135deg, #3182F6, #4B93F7)'
                  cellStyle.color = 'var(--at-white)'
                  if (isBingoLine) cellStyle.boxShadow = '0 6px 16px -4px rgba(245,158,11,0.4)'
                } else if (isWrong) {
                  cellStyle.background = '#EEF4FE'
                  cellStyle.border = '1px solid #C9DDFF'
                  cellStyle.color = 'var(--at-ink-faint)'
                } else {
                  // Light sky blue for untouched cells (per 2nd reference screenshot)
                  cellStyle.background = '#EEF4FE'
                  cellStyle.border = '1px solid #DCE8FB'
                  cellStyle.color = 'var(--at-ink)'
                }

                const disabled = answered !== undefined || activeIdx !== null
                if (disabled) cellStyle.cursor = 'default'

                return (
                  <button
                    key={idx}
                    onClick={() => openCell(idx)}
                    disabled={disabled}
                    style={cellStyle}
                    onMouseEnter={e => { if (!disabled && !isFree) e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {/* Checkmark badge (top-right) when correct */}
                    {isCorrect && !isFree && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                    )}
                    {isWrong && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#FCA5A5', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>×</div>
                    )}

                    <div style={{ fontSize: 18, lineHeight: 1 }}>{tpl?.emoji ?? '⭐'}</div>
                    <div>
                      <div style={{ fontSize: 10, lineHeight: 1.25, fontWeight: isFree || isCorrect ? 600 : 500, textAlign: isFree ? 'center' : 'left' }}>
                        {tpl?.label ?? `#${idx + 1}`}
                      </div>
                      {!isFree && tpl?.points && tpl.points > 0 && (
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.14em', marginTop: 3, opacity: isCorrect ? 0.85 : 0.6 }}>
                          {tpl.points}P
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Line indicators */}
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div style={{ padding: '14px 16px', background: 'var(--at-white)', borderRadius: 10, border: '1px solid var(--at-ink-hair)' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>달성한 줄</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 600 }}>{bingoCount}줄</div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>정답 {correctSet.size}/25</div>
              </div>
              <div style={{ padding: '14px 16px', background: 'var(--at-white)', borderRadius: 10, border: '1px solid var(--at-ink-hair)' }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>다음 줄까지</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 600, color: 'var(--at-blue)' }}>
                  {bingoCount >= 5 ? '완료!' : `${5 - (correctSet.size % 5)}칸`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>정답 맞히기</div>
              </div>
              <div style={{ padding: '14px 16px', background: 'var(--at-ink)', color: 'var(--at-white)', borderRadius: 10 }}>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-dark-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>BONUS</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 20, fontWeight: 600 }}>3줄 달성 시</div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-dark-soft)' }}>스타벅스 아메리카노</div>
              </div>
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div>
            <div className="at-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>LEADERBOARD</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>이달의 빙고왕</div>
              {/* TODO: 실제 데이터 연동. 임시 placeholder */}
              <div style={{ fontSize: 12, color: 'var(--at-ink-mute)', padding: '20px 0', textAlign: 'center' }}>
                아직 이달 랭킹 데이터가 수집되지 않았습니다.
              </div>
            </div>

            <div className="at-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>REWARDS</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>리워드</div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--at-ink-hair)', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥉</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>3줄</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>스타벅스 아메리카노</div>
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--at-blue)', fontWeight: 500, letterSpacing: '0.08em' }}>+100P</div>
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--at-ink-hair)', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥈</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>4줄</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>치킨 세트 교환권</div>
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--at-blue)', fontWeight: 500, letterSpacing: '0.08em' }}>+200P</div>
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥇</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>5줄 (풀 빙고)</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>상품권 10만원</div>
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--at-blue)', fontWeight: 500, letterSpacing: '0.08em' }}>+500P</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──────── Quiz popup modal ──────── */}
      {activeQuestion && activeIdx !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(11,13,18,0.5)', backdropFilter: 'blur(4px)', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 48px -16px rgba(0,0,0,0.25)' }}>
            {/* Timer bar */}
            <div style={{ height: 4, background: '#F2F4F6', position: 'relative', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(timer / 10) * 100}%`,
                  background: timer > 5 ? 'var(--at-green)' : timer > 2 ? 'var(--at-amber)' : 'var(--at-red)',
                  transition: 'all 1s linear, background-color 0.3s',
                }}
              />
            </div>

            <div style={{ padding: '24px 28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span className="at-tag blue">문제 {activeIdx + 1} / 25 · {BINGO_CELL_TEMPLATES[activeIdx]?.label ?? ''}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {timer <= 5 && timer > 0 && (
                    <span className="hurry-flash" style={{ fontSize: 13, fontWeight: 700, marginRight: 4 }}>HURRY!</span>
                  )}
                  <span className={clsx('bomb-anim', timer <= 3 && 'fuse-glow')} style={{ fontSize: 28 }}>💣</span>
                  <span style={{
                    fontSize: 24, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: timer > 5 ? 'var(--at-ink)' : timer > 2 ? 'var(--at-amber)' : 'var(--at-red)',
                  }}>{timer}</span>
                </div>
              </div>

              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--at-ink)', lineHeight: 1.5, marginBottom: 20 }}>
                {activeQuestion.question}
              </p>

              {activeQuestion.type === 'multiple' && activeQuestion.choices ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {activeQuestion.choices.map((choice, ci) => (
                    <button
                      key={ci}
                      onClick={() => setSelectedChoice(choice)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: `2px solid ${selectedChoice === choice ? 'var(--at-blue)' : 'var(--at-ink-hair)'}`,
                        background: selectedChoice === choice ? 'var(--at-blue-pale)' : '#fff',
                        color: selectedChoice === choice ? 'var(--at-blue-deep)' : 'var(--at-ink)',
                        fontSize: 14, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ marginRight: 8, fontSize: 12, color: 'var(--at-ink-faint)' }}>{String.fromCharCode(65 + ci)}.</span>
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <input
                    type="text"
                    value={subjectiveAnswer}
                    onChange={e => setSubjectiveAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                    placeholder="정답을 입력하세요..."
                    autoFocus
                    style={{
                      width: '100%', padding: '14px 16px',
                      borderRadius: 12, border: '2px solid var(--at-ink-line)',
                      fontSize: 15, fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                </div>
              )}

              <button
                onClick={submitAnswer}
                disabled={
                  activeQuestion.type === 'subjective'
                    ? !subjectiveAnswer.trim()
                    : !selectedChoice
                }
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 12,
                  background: 'var(--at-ink)',
                  color: '#fff',
                  fontSize: 15, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  opacity: (activeQuestion.type === 'subjective' ? subjectiveAnswer.trim() : selectedChoice) ? 1 : 0.4,
                }}
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last message toast (after modal closes) */}
      {lastMessage && !activeQuestion && (
        <div style={{
          position: 'fixed',
          left: '50%', bottom: 32,
          transform: 'translateX(-50%)',
          zIndex: 40,
          padding: '14px 24px',
          borderRadius: 14,
          background: lastMessage.correct ? 'var(--at-green)' : 'var(--at-red)',
          color: '#fff',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 16px 32px -8px rgba(0,0,0,0.25)',
        }}
          onAnimationEnd={() => setLastMessage(null)}
        >
          {lastMessage.text}
        </div>
      )}

      {/* Explosion overlay */}
      {showExplosion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="relative">
            <div className="explode-anim text-8xl">💥</div>
            <div className="shockwave-anim absolute inset-0 rounded-full border-red-500" style={{ width: 80, height: 80, margin: 'auto', top: 0, bottom: 0, left: 0, right: 0 }} />
          </div>
          <p className="absolute bottom-1/3 text-3xl font-bold text-red-500 animate-pulse">시간 초과!</p>
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

          <div className="relative mx-4 max-w-md w-full rounded-xl bg-white p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md">
              <Trophy size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-brand-900">축하합니다!</h2>
            <p className="mt-2 text-lg font-bold text-amber-600">빙고 3줄 완성!</p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-5 py-3">
              <Gift size={20} className="text-accent-600" />
              <span className="text-sm font-bold text-amber-700">선물이 지급됩니다! 관리자에게 알림이 발송되었습니다.</span>
            </div>
            <p className="mt-3 text-xs text-warm-400">
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
    </>
  )
}
