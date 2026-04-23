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
  { emoji: '🌟', label: '사내 이벤트 참여', points: 15 },
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
// 25문제 랜덤 배치 — 객관식만 (주관식 제거 — 사용자 요청)
// ────────────────────────────────────────────
function buildBingoQuestions(): QuizQuestion[] {
  const multiples = ALL_QUESTIONS.filter(q => q.type === 'multiple')

  const shuffleArr = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffledMulti = shuffleArr(multiples)
  const result: QuizQuestion[] = []
  for (let pos = 0; pos < 25; pos++) {
    result.push(shuffledMulti[pos % shuffledMulti.length])
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
  const [aiQuestionsSource, setAiQuestionsSource] = useState<'ai' | 'static'>('static')

  // Try to load AI-generated questions from today's cache (generates if missing, server-cached).
  // Falls back to static pool on failure — zero disruption.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/generate-bingo', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json()
        if (!data?.ok || !Array.isArray(data.questions) || data.questions.length < 25) return
        if (cancelled) return
        // Map server format → QuizQuestion shape
        const mapped: QuizQuestion[] = data.questions.slice(0, 25).map((q: any, i: number) => ({
          id: `ai-${data.date}-${i}`,
          type: 'multiple',
          question: q.question,
          choices: q.choices,
          answer: q.answer,
          explanation: q.explanation,
          difficulty: 'medium',
        }))
        setQuestions(mapped)
        setAiQuestionsSource('ai')
      } catch { /* keep static fallback */ }
    })()
    return () => { cancelled = true }
  }, [])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState('')
  const [answers, setAnswers] = useState<Record<number, { correct: boolean; explanation: string }>>({})
  const [timer, setTimer] = useState(10)
  const [showCelebration, setShowCelebration] = useState(false)
  const [lastMessage, setLastMessage] = useState<{ correct: boolean; text: string } | null>(null)
  const [showExplosion, setShowExplosion] = useState(false)
  const [dailyPlays, setDailyPlays] = useState(0)
  const [showRewards, setShowRewards] = useState(false)
  const [myTotalPoints, setMyTotalPoints] = useState<number>(0)
  const [myMaxLines, setMyMaxLines] = useState<number>(0)
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

  // ESC: 팝업 닫기 + 오답 처리 (사용자 요청)
  useEffect(() => {
    if (activeIdx === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        const idx = activeIdx
        if (idx === null) return
        if (timerRef.current) clearInterval(timerRef.current)
        const q = questions[idx]
        // 오답으로 마킹
        const explanation = `ESC 로 취소 → 오답. 정답: "${q.answer}". ${q.explanation}`
        const isFirstAnswerInSession = Object.keys(answers).length === 0
        setAnswers(prev => ({ ...prev, [idx]: { correct: false, explanation } }))
        setLastMessage({ correct: false, text: `취소 처리 → 오답. 정답: "${q.answer}"` })
        setActiveIdx(null)
        setSubjectiveAnswer('')
        setSelectedChoice('')
        if (isFirstAnswerInSession) {
          incrementDailyPlays()
          if (profile?.id) {
            void (supabase as any).from('user_points').insert({
              user_id: profile.id,
              action: 'bingo_attempt',
              points: 10,
              description: '빙고 참여 포인트',
            })
          }
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, questions])

  // Load my rewards (points + max bingo lines)
  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      try {
        const { data: pts } = await (supabase as any)
          .from('user_points')
          .select('points')
          .eq('user_id', profile.id)
        const total = (pts ?? []).reduce((s: number, r: { points: number }) => s + (r.points ?? 0), 0)
        setMyTotalPoints(total)
      } catch { /* silent */ }
      try {
        const { data: ach } = await (supabase as any)
          .from('bingo_achievements')
          .select('max_lines')
          .eq('user_id', profile.id)
          .maybeSingle()
        setMyMaxLines(ach?.max_lines ?? 0)
      } catch { /* silent */ }
    })()
  }, [profile?.id, showRewards])

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

  // 이달 누적 빙고 줄 수 (다른 세션 포함)
  const [monthlyLines, setMonthlyLines] = useState<number>(0)
  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      try {
        const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0)
        const { data } = await (supabase as any)
          .from('bingo_achievements')
          .select('max_lines, created_at')
          .eq('user_id', profile.id)
          .gte('created_at', firstOfMonth.toISOString())
        const sum = (data ?? []).reduce((s: number, r: any) => s + (r.max_lines ?? 0), 0)
        setMonthlyLines(sum)
      } catch { /* silent */ }
    })()
  }, [profile?.id, bingoCount])

  // 이달의 빙고왕 실시간 랭킹 — TOP 10
  // bingo_achievements 는 user_id onConflict 로 single row 유지 → updated_at 이 이달 이면 포함
  const [ranking, setRanking] = useState<Array<{ user_id: string; name: string; dept: string | null; lines: number }>>([])
  useEffect(() => {
    (async () => {
      try {
        const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0)
        // updated_at 필터 (이달 활동자) — 실패 시 폴백으로 전체 max_lines
        let achs: Array<{ user_id: string; max_lines: number; updated_at?: string }> | null = null
        try {
          const res = await (supabase as any)
            .from('bingo_achievements')
            .select('user_id, max_lines, updated_at')
            .gte('updated_at', firstOfMonth.toISOString())
            .order('max_lines', { ascending: false })
            .limit(100)
          achs = res.data
        } catch {
          const res = await (supabase as any)
            .from('bingo_achievements')
            .select('user_id, max_lines')
            .order('max_lines', { ascending: false })
            .limit(100)
          achs = res.data
        }
        if (!achs || achs.length === 0) { setRanking([]); return }
        const byUser: Record<string, number> = {}
        for (const a of achs) {
          if (!a.user_id) continue
          byUser[a.user_id] = Math.max(byUser[a.user_id] ?? 0, a.max_lines ?? 0)
        }
        const userIds = Object.keys(byUser).filter(uid => byUser[uid] > 0)
        if (userIds.length === 0) { setRanking([]); return }
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, department')
          .in('id', userIds)
        const byId: Record<string, { full_name: string | null; department: string | null }> = {}
        for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null; department: string | null }>) byId[p.id] = { full_name: p.full_name, department: p.department }
        const list = userIds
          .map(uid => ({ user_id: uid, name: byId[uid]?.full_name ?? '익명', dept: byId[uid]?.department ?? null, lines: byUser[uid] }))
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 10)
        setRanking(list)
      } catch (e) {
        console.warn('[Bingo] ranking fetch failed:', e)
      }
    })()
  }, [bingoCount, profile?.id])

  // Celebration — 매 줄 완성 시 (1~5줄 모두 축하)
  const lastCelebratedRef = useRef<number>(0)
  useEffect(() => {
    if (bingoCount > lastCelebratedRef.current) {
      lastCelebratedRef.current = bingoCount
      setShowCelebration(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingoCount])

  function openCell(idx: number) {
    if (answers[idx] !== undefined || activeIdx !== null) return
    if (!canPlay && Object.keys(answers).length === 0) {
      alert(`오늘의 도전 기회 ${MAX_DAILY_PLAYS}회를 모두 사용했습니다.\n내일 다시 도전하세요!`)
      return
    }
    // 도전 횟수 증가는 submitAnswer()에서 첫 정답/오답 제출 시에만 발생.
    // ESC로 창을 닫아도 카운트되지 않음.
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

    // 실제 답을 제출한 시점에 첫 정답이면 도전 횟수 증가 (ESC 취소엔 카운트 X)
    const isFirstAnswerInSession = Object.keys(answers).length === 0
    setAnswers(prev => ({ ...prev, [activeIdx]: { correct, explanation } }))
    setLastMessage({ correct, text: correct ? '정답입니다!' : `오답. 정답: "${q.answer}"` })
    setActiveIdx(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    if (isFirstAnswerInSession) {
      incrementDailyPlays()
      // 빙고 참여 1회당 10점 포인트 적립 (세션별 1회) — 사용자 요청
      if (profile?.id) {
        void (supabase as any).from('user_points').insert({
          user_id: profile.id,
          action: 'bingo_attempt',
          points: 10,
          description: '빙고 참여 포인트',
        })
      }
    }
  }

  // notifyAdminBingoWin 함수 제거 — 랭킹제로 변경되어 실시간 알림/메일 불필요
  // 월말 집계에서 TOP 3 산정 → 자동 시상

  function resetGame() {
    // 오늘 도전 한도 소진 시 경고 후 리셋 진행 X
    if (!canPlay && dailyPlays >= MAX_DAILY_PLAYS) {
      alert(`오늘 도전 ${MAX_DAILY_PLAYS}회를 모두 사용했습니다.\n내일 다시 도전하세요!`)
      return
    }
    setQuestions(buildBingoQuestions())
    setAnswers({})
    setActiveIdx(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    setShowCelebration(false)
    setLastMessage(null)
    notifiedRef.current = false
    lastCelebratedRef.current = 0
  }

  // Persist bingo achievement whenever bingoCount or correct count changes
  useEffect(() => {
    if (!profile?.id) return
    if (bingoCount === 0 && correctSet.size === 0) return
    ;(async () => {
      try {
        await (supabase as any).from('bingo_achievements').upsert({
          user_id: profile.id,
          max_lines: Math.max(myMaxLines, bingoCount),
          lines_completed: bingoCount,
          total_correct: correctSet.size,
          total_wins: bingoCount >= 3 ? 1 : 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        if (bingoCount > myMaxLines) setMyMaxLines(bingoCount)
      } catch { /* silent */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bingoCount, correctSet.size])

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
            <h1>빙고. <span className="soft">1줄 완성 = 1회 · 월간 TOP 3 시상.</span></h1>
            <p className="lead">
              이번 달 25개 미션. 참여 1회당 +10P 적립. 월간 빙고 1줄 완성 누적 TOP 3 에게 시상합니다 (🥇 치킨 / 🥈 배민 1만원 / 🥉 스타벅스 아아).
              문제당 <b>10초</b> · 하루 <b>{MAX_DAILY_PLAYS}회</b> 도전.
              {aiQuestionsSource === 'ai' && (
                <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#EEF4FE', border: '1px solid #DCE8FB', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#1E40AF' }}>
                  ✨ AI가 사내 문서에서 오늘의 문제를 생성함
                </span>
              )}
            </p>
          </div>
          <div className="actions">
            <button className="btn-compact" onClick={resetGame}>
              <RefreshCw size={13} />새 게임
            </button>
            <button className="btn-compact primary" onClick={() => setShowRewards(true)}>
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

                if (isCorrect) {
                  cellStyle.background = isBingoLine
                    ? 'linear-gradient(135deg, #F59E0B, #EAB308)'
                    : 'linear-gradient(135deg, #3182F6, #4B93F7)'
                  cellStyle.color = 'var(--at-white)'
                  if (isBingoLine) cellStyle.boxShadow = '0 6px 16px -4px rgba(245,158,11,0.4)'
                } else if (isWrong) {
                  // Wrong answer: red box for clear distinction
                  cellStyle.background = 'linear-gradient(135deg, #FEE2E2, #FCA5A5)'
                  cellStyle.border = '1px solid #EF4444'
                  cellStyle.color = '#991B1B'
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
                    onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {/* Checkmark badge (top-right) when correct */}
                    {isCorrect && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'grid', placeItems: 'center' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                    )}
                    {isWrong && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#FCA5A5', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>×</div>
                    )}

                    {/* 아이콘 크기 50% 축소 (36 → 18) */}
                    <div style={{ fontSize: 18, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>{tpl?.emoji ?? '🌟'}</div>
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
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-dark-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>MONTHLY RANK</div>
                <div style={{ fontFamily: 'var(--f-display)', fontSize: 18, fontWeight: 600 }}>TOP 3 시상</div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-dark-soft)' }}>매월 1줄 누적 최다</div>
              </div>
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div>
            <div className="at-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>LEADERBOARD · LIVE</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>이달의 빙고왕</div>
              {ranking.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--at-ink-mute)', padding: '20px 0', textAlign: 'center' }}>
                  아직 이달 랭킹 데이터가 수집되지 않았습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ranking.map((r, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
                    const isMe = r.user_id === profile?.id
                    return (
                      <div
                        key={r.user_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: i < 3 ? 'linear-gradient(90deg, rgba(255,215,0,0.08) 0%, transparent 100%)' : isMe ? 'var(--at-bg-soft)' : 'transparent',
                          border: i < 3 ? '1px solid rgba(255,180,0,0.25)' : '1px solid var(--at-ink-hair)',
                        }}
                      >
                        <div style={{ width: 24, textAlign: 'center', fontSize: i < 3 ? 16 : 12, fontFamily: 'var(--f-mono)', fontWeight: 700, color: i < 3 ? 'inherit' : 'var(--at-ink-faint)' }}>{medal}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: isMe ? 700 : 600, color: isMe ? '#3182F6' : 'var(--at-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.name}{isMe && <span style={{ fontSize: 10, marginLeft: 4, color: '#3182F6' }}>(나)</span>}
                          </div>
                          {r.dept && <div style={{ fontSize: 10, color: 'var(--at-ink-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dept}</div>}
                        </div>
                        <div style={{ fontFamily: 'var(--f-mono)', fontSize: 13, fontWeight: 700, color: 'var(--at-ink)' }}>
                          {r.lines}<span style={{ fontSize: 10, color: 'var(--at-ink-faint)', marginLeft: 2 }}>줄</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="at-card" style={{ padding: 24 }}>
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>REWARDS</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>리워드</div>
              <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', marginBottom: 10, lineHeight: 1.5 }}>
                빙고 1줄 완성 = 1회 카운트. 월 누적 완성 횟수 기준 월간 TOP 3 에게 시상.
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--at-ink-hair)', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥇</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>월간 1등</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>치킨 세트</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--at-ink-hair)', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥈</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>월간 2등</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>배민 상품권 1만원</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--at-ink-hair)', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>🥉</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>월간 3등</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>스타벅스 아아</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, padding: '14px 0', alignItems: 'center' }}>
                <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>⭐</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontSize: 14, fontWeight: 600 }}>참여 포인트</div>
                  <div style={{ fontSize: 12, color: 'var(--at-ink-mute)' }}>빙고 1회 참여당 자동 적립</div>
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--at-blue)', fontWeight: 500, letterSpacing: '0.08em' }}>+10P</div>
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
            <p className="mt-2 text-lg font-bold text-amber-600">빙고 {bingoCount}줄 완성!</p>
            <div className="mt-4 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-5 py-4 space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <Gift size={16} className="text-accent-600" />
                <span className="text-sm font-bold text-amber-700">이달 누적 완성 횟수: {monthlyLines + bingoCount}줄</span>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                월말 랭킹 기준 <b>TOP 3</b> 에게 시상 (🥇치킨세트 · 🥈배민 1만원 · 🥉스타벅스 아아).<br/>
                많이 참여할수록 당첨 확률이 높아집니다!
              </p>
            </div>
            <p className="mt-3 text-xs text-warm-400">
              이번 판: 정답 {correctSet.size}/25 · 빙고 {bingoCount}줄
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

      {/* 내 리워드 popup */}
      {showRewards && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setShowRewards(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 100%)', background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>MY REWARDS</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>🎁 내 리워드</div>
              </div>
              <button onClick={() => setShowRewards(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div style={{ padding: 18, background: 'linear-gradient(135deg, #EEF4FE, #DCE8FB)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#1E40AF', fontWeight: 600, letterSpacing: '0.08em' }}>내 포인트</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#1E40AF', marginTop: 4, fontFamily: 'var(--f-display)' }}>{myTotalPoints}<span style={{ fontSize: 14, marginLeft: 4 }}>P</span></div>
              </div>
              <div style={{ padding: 18, background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, letterSpacing: '0.08em' }}>빙고 줄 최고</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#92400E', marginTop: 4, fontFamily: 'var(--f-display)' }}>{Math.max(myMaxLines, bingoCount)}<span style={{ fontSize: 14, marginLeft: 4 }}>줄</span></div>
              </div>
            </div>

            <div style={{ padding: 14, background: 'var(--at-ivory)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)', lineHeight: 1.6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-ink)', marginBottom: 4 }}>오늘의 진행</div>
              맞힌 칸: <b style={{ color: 'var(--at-ink)' }}>{correctSet.size}/25</b><br />
              현재 줄: <b style={{ color: '#3182F6' }}>{bingoCount}줄</b> · 다음 줄까지 <b style={{ color: 'var(--at-ink)' }}>{5 - (correctSet.size % 5)}칸</b><br />
              오늘 도전 남은 횟수: <b style={{ color: 'var(--at-ink)' }}>{Math.max(0, MAX_DAILY_PLAYS - dailyPlays)}회</b>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--at-ink-faint)' }}>
              🏆 3줄 이상 → 스타벅스 아메리카노 · 4줄 → 치킨 세트 · 5줄(풀빙고) → 상품권 10만원
            </div>
          </div>
        </div>
      )}
    </>
  )
}
