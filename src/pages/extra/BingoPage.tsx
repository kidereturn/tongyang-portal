import { useEffect, useMemo, useRef, useState } from 'react'
import { Gamepad2, Gift, RefreshCw, Sparkles, Trophy, X } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type QuizQuestion = {
  id: string
  type: 'multiple' | 'subjective'
  question: string
  choices?: string[]
  answer: string
  explanation: string
}

// ────────────────────────────────────────────
// 문제 은행 (25+ 문제, 난이도 상)
// ────────────────────────────────────────────
const ALL_QUESTIONS: QuizQuestion[] = [
  // 객관식 20문제
  {
    id: 'q1', type: 'multiple',
    question: 'COSO 내부통제 프레임워크(2013)의 5가지 구성요소 중 "정보와 의사소통"에 해당하지 않는 항목은?',
    choices: ['관련성 있는 양질의 정보 확보', '내부통제 관련 정보의 내부 전달', '외부 이해관계자와의 정보 교환', '통제환경의 윤리적 가치 설정'],
    answer: '통제환경의 윤리적 가치 설정',
    explanation: '윤리적 가치 설정은 "통제환경" 구성요소에 해당합니다.',
  },
  {
    id: 'q2', type: 'multiple',
    question: '"중요한 취약점"과 "유의적 미비점"을 구분하는 핵심 기준은?',
    choices: ['발견된 미비점의 개수', '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성', '미비점이 발견된 계정과목의 수', '통제활동 담당자의 직급'],
    answer: '재무제표 중요한 왜곡표시 가능성의 크기와 발생가능성',
    explanation: '중요한 취약점은 중요한 왜곡표시가 적시에 예방·발견되지 못할 합리적 가능성이 있는 경우입니다.',
  },
  {
    id: 'q3', type: 'multiple',
    question: '외감법에 따라 내부회계관리제도 "감사"가 의무화되는 회사 기준은?',
    choices: ['모든 주식회사', '자산총액 1천억 원 이상 상장회사', '자산총액 5천억 원 이상 상장회사부터 단계적 적용', '코스닥 상장회사 전체'],
    answer: '자산총액 5천억 원 이상 상장회사부터 단계적 적용',
    explanation: '외감법 개정에 따라 자산총액 5천억 원 이상부터 단계적으로 감사가 의무화되었습니다.',
  },
  {
    id: 'q4', type: 'multiple',
    question: '재무제표 경영진 주장 중 "발생"과 "완전성"의 관계로 올바른 것은?',
    choices: ['두 주장은 동일한 방향의 위험을 다룬다', '발생은 과대계상, 완전성은 과소계상 위험과 관련', '완전성은 자산 계정에만 적용', '발생은 부채 계정에만 적용'],
    answer: '발생은 과대계상, 완전성은 과소계상 위험과 관련',
    explanation: '발생은 기록된 거래가 실제 발생했는지(과대계상), 완전성은 모든 거래가 기록되었는지(과소계상)를 다룹니다.',
  },
  {
    id: 'q6', type: 'multiple',
    question: '직무분리(SoD)의 3가지 핵심 기능으로 올바르게 짝지어진 것은?',
    choices: ['기획-실행-보고', '승인(Authorization)-기록(Recording)-보관(Custody)', '계획-조직-통제', '입력-처리-출력'],
    answer: '승인(Authorization)-기록(Recording)-보관(Custody)',
    explanation: '직무분리는 거래의 승인, 회계기록, 자산보관 기능을 서로 다른 담당자가 수행하도록 합니다.',
  },
  {
    id: 'q7', type: 'multiple',
    question: 'IT 응용통제 중 "입력통제"에 해당하지 않는 것은?',
    choices: ['데이터 유효성 검사', '한도 점검', '마스터 데이터 변경 로그 감시', '중복 입력 방지'],
    answer: '마스터 데이터 변경 로그 감시',
    explanation: '마스터 데이터 변경 로그 감시는 ITGC 중 변경관리 영역에 해당합니다.',
  },
  {
    id: 'q8', type: 'multiple',
    question: '내부회계관리제도 운영실태 보고에서 경영진이 사용하는 평가 기준은?',
    choices: ['K-IFRS', '내부회계관리제도 설계 및 운영 개념체계(모범규준)', '기업회계기준서 제1001호', '감사기준서 제315호'],
    answer: '내부회계관리제도 설계 및 운영 개념체계(모범규준)',
    explanation: '경영진은 모범규준을 평가 기준으로 사용합니다.',
  },
  {
    id: 'q9', type: 'multiple',
    question: 'Walk-through 테스트의 주된 목적은?',
    choices: ['통제의 운영 효과성 통계적 검증', '거래 흐름 추적하여 통제 설계 적합성 확인', '재무제표 계정잔액 정확성 확인', '경영진 서면진술 신뢰성 검증'],
    answer: '거래 흐름 추적하여 통제 설계 적합성 확인',
    explanation: 'Walk-through는 거래의 개시부터 재무제표 반영까지 추적하여 통제 설계를 확인합니다.',
  },
  {
    id: 'q10', type: 'multiple',
    question: '"예방통제"와 "발견통제"의 조합이 올바른 것은?',
    choices: ['예방: 승인권한 매트릭스 / 발견: 월말 계정 대사', '예방: 은행잔고 조정표 / 발견: 접근권한 설정', '예방: 이상거래 모니터링 / 발견: 전자결재 승인', '예방: 내부감사 / 발견: 직무분리'],
    answer: '예방: 승인권한 매트릭스 / 발견: 월말 계정 대사',
    explanation: '승인권한 매트릭스는 사전 예방, 월말 계정 대사는 사후 발견 통제입니다.',
  },
  {
    id: 'q11', type: 'multiple',
    question: 'Top-down Risk Assessment에서 가장 먼저 수행하는 단계는?',
    choices: ['개별 통제활동의 운영 효과성 테스트', '유의적 계정과 공시항목 식별', '전표 표본 추출 및 검증', '통제활동 담당자 면담'],
    answer: '유의적 계정과 공시항목 식별',
    explanation: 'Top-down 접근법은 유의적 계정 식별 → 주장 파악 → 위험 평가 → 통제 식별 → 테스트 순서입니다.',
  },
  {
    id: 'q12', type: 'multiple',
    question: '부정 삼각형(Fraud Triangle)의 3가지 요소는?',
    choices: ['동기·기회·정당화', '이익·손실·위험', '계획·실행·은폐', '압력·통제·보상'],
    answer: '동기·기회·정당화',
    explanation: '동기/압력, 기회, 정당화/합리화 3요소가 동시에 존재할 때 부정이 발생합니다.',
  },
  {
    id: 'q13', type: 'multiple',
    question: '한국 외감법과 미국 SOX법의 차이점으로 올바른 것은?',
    choices: ['한국은 외부감사 의무가 없다', '한국은 "감사"로 전환 전까지 "검토" 수준이 허용되었다', 'SOX는 비상장회사에도 전면 적용', '한국은 COSO 사용을 금지'],
    answer: '한국은 "감사"로 전환 전까지 "검토" 수준이 허용되었다',
    explanation: '한국은 기존 "검토" 수준에서 단계적으로 "감사" 수준으로 강화되었습니다.',
  },
  {
    id: 'q14', type: 'multiple',
    question: '"경영진 무력화(Management Override)"에 대한 설명으로 가장 적절한 것은?',
    choices: ['경영진이 통제를 강화하는 행위', '경영진이 자신의 권한으로 기존 통제를 우회하는 위험', '외부감사인이 경영진 판단을 번복하는 상황', '이사회가 경영진을 교체하는 절차'],
    answer: '경영진이 자신의 권한으로 기존 통제를 우회하는 위험',
    explanation: '경영진 무력화는 모든 감사에서 유의적 위험으로 추정됩니다.',
  },
  {
    id: 'q15', type: 'multiple',
    question: 'PCAOB AS 2201의 "통합감사(Integrated Audit)"란?',
    choices: ['내부감사와 외부감사 동시 수행', '재무제표 감사와 내부통제 감사를 하나로 통합 수행', '모든 해외 자회사 포함 연결감사', 'IT 감사와 업무 감사를 통합'],
    answer: '재무제표 감사와 내부통제 감사를 하나로 통합 수행',
    explanation: '통합감사는 재무제표 감사와 ICFR 감사를 하나의 프로세스로 수행하는 것입니다.',
  },
  {
    id: 'q16', type: 'multiple',
    question: 'ITGC 4대 영역에 해당하지 않는 것은?',
    choices: ['프로그램 개발', '프로그램 변경', '데이터 분석', '접근 보안'],
    answer: '데이터 분석',
    explanation: 'ITGC 4대 영역은 프로그램 개발, 변경, 컴퓨터 운영, 접근 보안입니다.',
  },
  {
    id: 'q17', type: 'multiple',
    question: '자동화된 통제가 수동통제에 비해 갖는 장점은?',
    choices: ['설계 변경이 용이', '일관되게 작동하여 인적 오류 위험이 낮다', '별도 ITGC 불필요', '감사 증거 확보 불필요'],
    answer: '일관되게 작동하여 인적 오류 위험이 낮다',
    explanation: '자동화 통제는 프로그래밍대로 일관 작동하여 인적 오류가 낮지만, ITGC가 뒷받침되어야 합니다.',
  },
  {
    id: 'q18', type: 'multiple',
    question: '통제 수행 빈도가 "매일 1회"인 경우 일반 권장 최소 표본 크기는?',
    choices: ['5건', '15건', '25건', '40건'],
    answer: '25건',
    explanation: '매일 수행 통제 테스트 표본은 일반적으로 25건이 권장됩니다.',
  },
  {
    id: 'q19', type: 'multiple',
    question: '내부통제 미비점 심각도 평가 시 고려하는 두 가지 핵심 차원은?',
    choices: ['비용과 효과', '발생가능성과 영향크기', '빈도와 기간', '설계와 운영'],
    answer: '발생가능성과 영향크기',
    explanation: '미비점 심각도는 왜곡표시 발생가능성과 영향크기를 종합하여 평가합니다.',
  },
  {
    id: 'q20', type: 'multiple',
    question: 'SOC 1 보고서에 대한 올바른 설명은?',
    choices: ['보안 취약점 진단 보고서', '서비스 조직 내부통제가 위탁기업 재무보고에 미치는 영향 평가 보고서', '개인정보보호 인증 보고서', 'ESG 평가 보고서'],
    answer: '서비스 조직 내부통제가 위탁기업 재무보고에 미치는 영향 평가 보고서',
    explanation: 'SOC 1 보고서는 서비스 조직의 내부통제가 이용기업의 재무보고 내부통제에 미치는 영향을 다룹니다.',
  },
  {
    id: 'q21', type: 'multiple',
    question: '"간접적 기업수준통제(Indirect ELC)"의 특징은?',
    choices: ['거래수준통제를 완전히 대체', '특정 주장에 직접 대응', '다른 통제의 효과적 운영을 감시하는 역할', '연 1회만 테스트'],
    answer: '다른 통제의 효과적 운영을 감시하는 역할',
    explanation: '간접적 ELC는 다른 거래수준통제가 효과적으로 운영되는지 감시·지원합니다.',
  },
  {
    id: 'q22', type: 'multiple',
    question: '통제활동의 "정밀도(Precision)"란?',
    choices: ['통제 수행 빈도', '왜곡표시를 감지할 수 있는 임계값 수준', '통제 담당자 전문성', '자동/수동 통제 비율'],
    answer: '왜곡표시를 감지할 수 있는 임계값 수준',
    explanation: '정밀도가 높을수록 작은 규모의 왜곡표시까지 감지할 수 있습니다.',
  },
  // 주관식 5문제 (positions 5, 10, 15에 배치됨)
  {
    id: 'sub1', type: 'subjective',
    question: 'COSO 내부통제 프레임워크의 5가지 구성요소 중 나머지 4개의 기반이 되는 가장 근본적인 구성요소를 한글로 적어주세요. (4글자)',
    answer: '통제환경',
    explanation: '통제환경은 조직의 윤리적 가치, 거버넌스 등을 포함하며 나머지 4개 구성요소의 기반입니다.',
  },
  {
    id: 'sub2', type: 'subjective',
    question: '통제 미비점을 보완하기 위해 별도로 설계된 대체 통제를 영문으로 적어주세요. (OO Control, 13자)',
    answer: 'Compensating Control',
    explanation: 'Compensating Control(보완통제)은 주요 통제의 부재를 보완하는 대체 통제입니다.',
  },
  {
    id: 'sub3', type: 'subjective',
    question: '일정 주기(일/주/월/분기)마다 수행되는 검토성 통제를 무엇이라 하는가? (한글 5글자)',
    answer: '주기적통제',
    explanation: '주기적통제는 정해진 주기로 수행되는 모니터링성 통제입니다.',
  },
  {
    id: 'sub4', type: 'subjective',
    question: '재무제표의 거래에 대한 경영진 주장 중, 기록된 금액이 적절하게 측정되었는지를 다루는 주장은? (한글 3글자)',
    answer: '정확성',
    explanation: '정확성(Accuracy) 주장은 거래 금액과 관련 데이터가 정확하게 기록되었는지를 다룹니다.',
  },
  {
    id: 'sub5', type: 'subjective',
    question: '계정잔액에 대한 경영진 주장 중, 자산/부채가 적절한 금액으로 측정되었는지를 다루는 주장은? (한글 2글자)',
    answer: '평가',
    explanation: '평가(Valuation)는 자산·부채가 적절한 금액으로 기록되었는지를 다룹니다.',
  },
]

// ────────────────────────────────────────────
// 25문제를 랜덤 배치, 5번/10번/15번은 주관식
// ────────────────────────────────────────────
function buildBingoQuestions(): QuizQuestion[] {
  const multiples = ALL_QUESTIONS.filter(q => q.type === 'multiple')
  const subjectives = ALL_QUESTIONS.filter(q => q.type === 'subjective')

  // Shuffle
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

  const result: QuizQuestion[] = []
  let mi = 0
  let si = 0

  for (let pos = 1; pos <= 25; pos++) {
    if (pos === 5 || pos === 10 || pos === 15) {
      // Subjective slots — cycle through available subjective questions
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeIdxRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)

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

  function cancelQuestion() {
    if (timerRef.current) clearInterval(timerRef.current)
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
        await supabase.functions.invoke('send-email', {
          body: {
            to: 'junghoon.ha@tongyanginc.co.kr',
            subject: `[동양 LMS] 빙고퀴즈 3줄 완성 - ${userName}`,
            html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <h2 style="color:#1e40af;">빙고퀴즈 3줄 완성 알림</h2>
              <p>이름: ${userName} / 사번: ${employeeId} / 부서: ${dept}</p>
              <p>달성일: ${today}</p>
              <p style="color:#64748b;">선물 지급을 검토해 주세요.</p>
            </div>`,
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
        .bomb-anim { animation: bombShake 0.8s ease-in-out infinite; }
        .fuse-glow { animation: fuseGlow 0.5s ease-in-out infinite; }
        .confetti { animation: confettiFall 3s linear forwards; }
        .explode-anim { animation: explode 1s ease-out forwards; }
        .shockwave-anim { animation: shockwave 0.8s ease-out forwards; }
      `}</style>

      {/* Header */}
      <div className="rounded-[28px] bg-gradient-to-r from-brand-700 via-indigo-700 to-slate-900 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-brand-100/70">BINGO QUIZ</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <Gamepad2 size={28} className="text-brand-200" />
          빙고퀴즈 5x5
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-50/90">
          25칸 빙고판에서 문제를 풀어 정답 칸을 채우세요. 5번·10번·15번째 문제는 주관식!
          <br />한 문제당 <b className="text-yellow-300">10초</b> 시간제한. <b className="text-yellow-300">빙고 3줄 완성</b> 시 축하와 함께 선물을 증정합니다!
        </p>
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
        <button onClick={resetGame} className="ml-auto btn-ghost text-xs">
          <RefreshCw size={14} /> 새 게임
        </button>
      </div>

      {/* Bingo Board */}
      <div className="mx-auto max-w-lg">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {questions.map((_q, idx) => {
            const answered = answers[idx]
            const isActive = activeIdx === idx
            const isBingoLine = bingoIndices.has(idx)
            const cellNum = idx + 1
            const isSubjective = cellNum === 5 || cellNum === 10 || cellNum === 15

            return (
              <button
                key={idx}
                onClick={() => openCell(idx)}
                disabled={answered !== undefined || activeIdx !== null}
                className={clsx(
                  'relative aspect-square rounded-xl sm:rounded-2xl border-2 text-lg sm:text-xl font-black transition-all duration-200',
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
                {isSubjective && answered === undefined && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 text-[9px] sm:text-[10px] font-semibold text-amber-500">주관</span>
                )}
                {answered?.correct && (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl opacity-30">O</span>
                )}
                {answered && !answered.correct && (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl opacity-30">X</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

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
      {activeQuestion && activeIdx !== null && (
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

            {/* Action buttons */}
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
              <button onClick={cancelQuestion} className="btn-ghost">
                <X size={15} /> 취소
              </button>
            </div>
          </div>
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
