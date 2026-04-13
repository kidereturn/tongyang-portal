import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Gamepad2, Gift, RefreshCw, Sparkles, Trophy } from 'lucide-react'
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

const QUIZ_BANK: QuizQuestion[][] = [
  // 세트 1
  [
    {
      id: 'q1-1', type: 'multiple',
      question: '내부회계관리제도에서 통제활동의 목적에 가장 가까운 것은 무엇인가요?',
      choices: ['매출 확대', '위험 감소', '채용 확대', '사무실 이전', '광고 집행', '원가 인상', '제품 출시'],
      answer: '위험 감소',
      explanation: '통제활동은 재무보고의 위험을 줄이기 위한 정책과 절차입니다.',
    },
    {
      id: 'q1-2', type: 'multiple',
      question: 'RCM은 주로 무엇을 정리하는 문서인가요?',
      choices: ['연말정산 결과', '위험과 통제 매핑', '급여 대장', '채용 현황', '법인카드 사용 내역', '영업 실적표', '자산 매각 계획'],
      answer: '위험과 통제 매핑',
      explanation: 'RCM(Risk Control Matrix)은 위험요소와 그에 대응하는 통제활동을 매핑한 문서입니다.',
    },
    {
      id: 'q1-3', type: 'multiple',
      question: '증빙 결재 상신 전 가장 먼저 확인해야 할 항목은 무엇인가요?',
      choices: ['이미지 해상도', '대표이사 승인 여부', '첨부 증빙의 관련성', '회사 로고 위치', '메일 제목 길이', '브라우저 버전', '폰트 종류'],
      answer: '첨부 증빙의 관련성',
      explanation: '상신 전에는 첨부된 증빙이 해당 통제활동과 관련이 있는지 반드시 확인해야 합니다.',
    },
    {
      id: 'q1-4', type: 'multiple',
      question: '모집단과 RCM을 사번 기준으로 연결하려는 가장 큰 이유는 무엇인가요?',
      choices: ['화면 색상을 맞추기 위해', '사용자 개인화 광고를 위해', '담당자 식별을 일관되게 하기 위해', '파일 용량을 줄이기 위해', '지도를 출력하기 위해', '로그인 화면을 숨기기 위해', '비밀번호를 길게 만들기 위해'],
      answer: '담당자 식별을 일관되게 하기 위해',
      explanation: '사번은 고유 식별자로, 담당자를 일관되게 연결하는 데 필수적입니다.',
    },
    {
      id: 'q1-5', type: 'subjective',
      question: '증빙이 반려되었을 때 가장 먼저 해야 하는 조치를 짧게 한 단어로 적어주세요.',
      answer: '확인',
      explanation: '반려 사유를 먼저 확인한 후 수정하여 재상신합니다.',
    },
  ],
  // 세트 2
  [
    {
      id: 'q2-1', type: 'multiple',
      question: '내부회계관리제도의 궁극적인 목적은 무엇인가요?',
      choices: ['이익 극대화', '재무보고의 신뢰성 확보', '직원 복지 개선', '고객 서비스 향상', '주가 상승', '세금 절감', '시장 점유율 확대'],
      answer: '재무보고의 신뢰성 확보',
      explanation: '내부회계관리제도는 기업의 재무보고가 정확하고 신뢰할 수 있도록 보장하는 제도입니다.',
    },
    {
      id: 'q2-2', type: 'multiple',
      question: '통제활동 증빙으로 적합하지 않은 것은 무엇인가요?',
      choices: ['결재 완료된 품의서', '승인된 지출결의서', '개인 일기장', '검토 완료된 보고서', '회의록', '거래명세서', '감사보고서'],
      answer: '개인 일기장',
      explanation: '증빙은 공식적인 업무 문서여야 하며, 개인 기록은 증빙으로 인정되지 않습니다.',
    },
    {
      id: 'q2-3', type: 'multiple',
      question: '핵심통제(Key Control)의 특징으로 올바른 것은 무엇인가요?',
      choices: ['모든 통제활동을 포함한다', '재무제표 왜곡을 방지하거나 발견하는 중요한 통제이다', '자동으로 실행된다', '연 1회만 테스트한다', '경영진만 수행한다', '외부감사만 평가한다', 'IT 통제만 해당한다'],
      answer: '재무제표 왜곡을 방지하거나 발견하는 중요한 통제이다',
      explanation: '핵심통제는 재무보고의 중요한 왜곡표시를 예방하거나 적시에 발견할 수 있는 통제활동입니다.',
    },
    {
      id: 'q2-4', type: 'multiple',
      question: '전사수준통제(Entity Level Control)에 해당하지 않는 것은 무엇인가요?',
      choices: ['윤리강령', '내부감사', '이사회 감독', '개별 전표 승인', '리스크 관리 체계', '내부고발 제도', '정보보안 정책'],
      answer: '개별 전표 승인',
      explanation: '개별 전표 승인은 거래수준통제(Transaction Level Control)에 해당합니다.',
    },
    {
      id: 'q2-5', type: 'subjective',
      question: '내부회계관리제도를 영문 약자 4글자로 적어주세요.',
      answer: 'ICFR',
      explanation: 'ICFR = Internal Control over Financial Reporting (재무보고에 대한 내부통제)',
    },
  ],
  // 세트 3
  [
    {
      id: 'q3-1', type: 'multiple',
      question: '증빙 업로드 후 파일명 매칭 검증의 목적은 무엇인가요?',
      choices: ['파일 용량 확인', '올바른 증빙이 첨부되었는지 확인', '바이러스 검사', '파일 형식 변환', '자동 번역', '이미지 리사이즈', '백업 생성'],
      answer: '올바른 증빙이 첨부되었는지 확인',
      explanation: '파일명 매칭은 잘못된 증빙이 제출되는 것을 방지하기 위한 검증 절차입니다.',
    },
    {
      id: 'q3-2', type: 'multiple',
      question: '결재 프로세스에서 "반려" 상태란 무엇을 의미하나요?',
      choices: ['승인 완료', '검토 대기', '승인자가 거절하여 재작성이 필요한 상태', '자동 삭제', '시스템 오류', '임시 저장', '최종 확인'],
      answer: '승인자가 거절하여 재작성이 필요한 상태',
      explanation: '반려는 승인자가 증빙을 거절한 것으로, 담당자가 수정 후 재상신해야 합니다.',
    },
    {
      id: 'q3-3', type: 'multiple',
      question: '내부회계관리제도에서 IT 일반통제(ITGC)에 해당하는 것은 무엇인가요?',
      choices: ['매출 확인', '재고 실사', '접근 권한 관리', '고객 상담', '제품 개발', '마케팅 전략', '인사 평가'],
      answer: '접근 권한 관리',
      explanation: 'ITGC(IT General Controls)는 접근 권한, 변경 관리, 운영 관리 등 IT 전반의 통제를 포함합니다.',
    },
    {
      id: 'q3-4', type: 'multiple',
      question: '통제 테스트(Test of Controls)의 목적은 무엇인가요?',
      choices: ['신제품 테스트', '통제활동이 효과적으로 운영되는지 검증', '직원 역량 평가', '시스템 속도 측정', '고객 만족도 조사', '예산 편성', '조직 개편'],
      answer: '통제활동이 효과적으로 운영되는지 검증',
      explanation: '통제 테스트는 설계된 통제활동이 실제로 효과적으로 운영되고 있는지 확인하는 절차입니다.',
    },
    {
      id: 'q3-5', type: 'subjective',
      question: '통제활동의 두 가지 유형 중 사람이 직접 수행하는 통제를 무엇이라 하나요? (두 글자)',
      answer: '수동',
      explanation: '수동통제(Manual Control)는 사람이 직접 판단하고 수행하는 통제이며, 반대는 자동통제(Automated Control)입니다.',
    },
  ],
]

function getTodayQuizSet(): QuizQuestion[] {
  // 날짜 기반으로 세트 선택 (매일 다른 세트)
  const today = new Date()
  const dayIndex = Math.floor(today.getTime() / 86400000) % QUIZ_BANK.length
  return QUIZ_BANK[dayIndex]
}

function checkAnswer(question: QuizQuestion, userAnswer: string): boolean {
  const normalizedUser = userAnswer.trim().toLowerCase().replace(/\s+/g, '')
  const normalizedCorrect = question.answer.trim().toLowerCase().replace(/\s+/g, '')
  // 주관식은 부분 매칭도 허용
  if (question.type === 'subjective') {
    return normalizedUser === normalizedCorrect || normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)
  }
  return normalizedUser === normalizedCorrect
}

export default function BingoPage() {
  const { profile } = useAuth()
  const [questions] = useState<QuizQuestion[]>(getTodayQuizSet)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [subjectiveAnswer, setSubjectiveAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, { correct: boolean }>>({})
  const [showCelebration, setShowCelebration] = useState(false)
  const notifiedRef = useRef(false)

  const activeQuestion = useMemo(
    () => questions.find(q => q.id === activeId) ?? null,
    [activeId, questions]
  )

  const correctCount = Object.values(answers).filter(a => a.correct).length
  const totalAnswered = Object.keys(answers).length
  const allCompleted = totalAnswered === questions.length
  const allCorrect = correctCount === questions.length

  // 만점 달성 시 축하 효과 + 관리자 알림
  useEffect(() => {
    if (allCorrect && allCompleted && !notifiedRef.current) {
      notifiedRef.current = true
      setShowCelebration(true)
      notifyAdminPerfectScore()
    }
  }, [allCorrect, allCompleted])

  async function notifyAdminPerfectScore() {
    try {
      const userName = profile?.full_name ?? '알 수 없음'
      const employeeId = profile?.employee_id ?? ''
      const dept = profile?.department ?? ''
      const today = new Date().toLocaleDateString('ko-KR')

      // 1) notifications 테이블에 알림 삽입 (모든 admin에게)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: admins } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true)

      if (admins && admins.length > 0) {
        const notifications = admins.map((a: { id: string }) => ({
          recipient_id: a.id,
          sender_id: profile?.id ?? null,
          title: `🏆 빙고퀴즈 만점자 발생! - ${userName} (${employeeId})`,
          body: `${today} 빙고퀴즈에서 만점자가 나왔습니다.\n\n• 이름: ${userName}\n• 사번: ${employeeId}\n• 부서: ${dept}\n\n선물 지급을 검토해 주세요.`,
          is_read: false,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('notifications').insert(notifications)
      }

      // 2) 관리자 이메일로 알림 (Edge Function이 있을 경우)
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: 'junghoon.ha@tongyanginc.co.kr',
            subject: `[동양 LMS] 🏆 빙고퀴즈 만점자 발생 - ${userName}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                <h2 style="color:#1e40af;">🏆 빙고퀴즈 만점자 알림</h2>
                <table style="border-collapse:collapse;width:100%;margin:16px 0;">
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">이름</td><td style="padding:8px;border:1px solid #e2e8f0;">${userName}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">사번</td><td style="padding:8px;border:1px solid #e2e8f0;">${employeeId}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">부서</td><td style="padding:8px;border:1px solid #e2e8f0;">${dept}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;">달성일</td><td style="padding:8px;border:1px solid #e2e8f0;">${today}</td></tr>
                </table>
                <p style="color:#64748b;font-size:14px;">선물 지급을 검토해 주세요.</p>
              </div>
            `,
          },
        })
      } catch {
        // Edge Function 미배포 시 무시 — notifications 테이블에는 이미 저장됨
        console.log('Email edge function not available, notification saved to DB')
      }
    } catch (err) {
      console.error('Failed to notify admin:', err)
    }
  }

  function submitAnswer() {
    if (!activeQuestion) return
    const answer = activeQuestion.type === 'subjective' ? subjectiveAnswer : selectedChoice
    if (!answer.trim()) return

    const correct = checkAnswer(activeQuestion, answer)

    setAnswers(prev => ({ ...prev, [activeQuestion.id]: { correct } }))
    setMessage(
      correct
        ? '정답입니다! ' + activeQuestion.explanation
        : `틀렸습니다. 정답은 "${activeQuestion.answer}" 입니다. ${activeQuestion.explanation}`
    )

    setActiveId(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
  }

  function resetQuiz() {
    setAnswers({})
    setActiveId(null)
    setSubjectiveAnswer('')
    setSelectedChoice('')
    setMessage(null)
    setShowCelebration(false)
    notifiedRef.current = false
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
          매일 5문제의 내부회계 퀴즈를 풀어보세요. 4문제는 7지선다 객관식, 1문제는 주관식입니다.
          모두 맞히면 축하 메시지가 표시됩니다!
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">오늘의 문제</span>
              <span className="text-sm text-slate-500">
                {correctCount}/{questions.length} 정답
              </span>
            </div>
            <button onClick={resetQuiz} className="btn-secondary py-2 text-xs">
              <RefreshCw size={14} />
              다시 풀기
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {questions.map((question, index) => {
              const answerState = answers[question.id]
              return (
                <button
                  key={question.id}
                  onClick={() => {
                    if (!answerState) {
                      setActiveId(question.id)
                      setMessage(null)
                      setSelectedChoice('')
                      setSubjectiveAnswer('')
                    }
                  }}
                  disabled={Boolean(answerState)}
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

          {allCompleted && allCorrect && (
            <div className={clsx(
              'relative overflow-hidden rounded-[28px] border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 p-6 shadow-xl',
              showCelebration && 'animate-bounce-once'
            )}>
              {/* 축하 배경 효과 */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-4 -top-4 text-6xl opacity-20">🎉</div>
                <div className="absolute -bottom-2 -left-4 text-5xl opacity-20">🎊</div>
                <div className="absolute right-1/3 top-1/4 text-4xl opacity-15">⭐</div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/30">
                    <Trophy size={24} className="text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-amber-900">🎉 축하합니다!</p>
                    <p className="text-sm font-semibold text-amber-700">오늘의 5문제를 모두 맞혔습니다!</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-yellow-200 bg-white/70 p-4">
                  <div className="flex items-start gap-3">
                    <Gift size={22} className="mt-0.5 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-base font-black text-slate-800">🎁 선물을 보내드립니다!</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        내부회계관리에 대한 뛰어난 이해력을 보여주셨습니다.<br />
                        만점 달성 기념 선물이 준비되어 있으니, 곧 개별 안내드리겠습니다.
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        ※ 관리자에게 만점 달성 알림이 전송되었습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-500" />
                  <p className="text-xs font-medium text-amber-600">
                    {profile?.full_name ?? '사용자'}님, 정말 대단합니다! 앞으로도 내부회계 학습에 힘써주세요. 💪
                  </p>
                </div>
              </div>
            </div>
          )}

          {allCompleted && !allCorrect && (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <p className="text-lg font-black">오늘의 퀴즈를 완료했습니다!</p>
              </div>
              <p className="mt-2 text-sm">
                {questions.length}문제 중 {correctCount}문제를 맞혔습니다.
                "다시 풀기"를 눌러 다시 도전해 보세요!
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
          {activeQuestion ? (
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
                  onChange={e => setSubjectiveAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  className="form-input"
                  placeholder="정답을 입력해 주세요."
                />
              )}

              <button
                onClick={submitAnswer}
                disabled={!selectedChoice && !subjectiveAnswer.trim()}
                className="btn-primary w-full justify-center py-3"
              >
                <CheckCircle2 size={16} />
                답안 제출
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-slate-500">
              <Gamepad2 size={36} className="text-slate-300" />
              <p className="mt-4 text-lg font-bold text-slate-700">
                {allCompleted ? '오늘의 퀴즈를 모두 완료했습니다!' : '왼쪽 빙고칸을 눌러 문제를 선택해 주세요.'}
              </p>
              <p className="mt-2 text-sm leading-6">
                {allCompleted ? '"다시 풀기" 버튼으로 재도전할 수 있습니다.' : '5문제를 풀고 빙고를 완성하세요!'}
              </p>
            </div>
          )}

          {message && (
            <div className={clsx(
              'mt-5 rounded-2xl border px-4 py-3 text-sm leading-6',
              message.startsWith('정답')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            )}>
              {message}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
