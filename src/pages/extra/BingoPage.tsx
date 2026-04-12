import { useState, useEffect } from 'react'
import { Trophy, RotateCcw, Gamepad2, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react'
import clsx from 'clsx'

// ── 퀴즈 문항 (25개) ─────────────────────────────────────────
const ALL_QUESTIONS: { word: string; question: string; answer: string }[] = [
  { word: '내부통제', question: '재무보고의 신뢰성 확보를 위해 기업이 설계·운영하는 시스템은?', answer: '내부통제' },
  { word: '통제활동', question: '위험을 감소시키기 위해 경영진이 수립한 정책 및 절차는?', answer: '통제활동' },
  { word: '증빙서류', question: '통제가 실제로 수행되었음을 입증하는 문서는?', answer: '증빙서류' },
  { word: '핵심통제', question: '재무제표 목적에 직접적으로 연결되어 특히 중요한 통제는?', answer: '핵심통제' },
  { word: '모집단', question: '테스트 대상이 되는 전체 거래 집합을 무엇이라 하나요?', answer: '모집단' },
  { word: '결재상신', question: '담당자가 증빙 업로드 후 승인자에게 검토를 요청하는 행위는?', answer: '결재상신' },
  { word: '통제번호', question: 'RCM에서 각 통제활동을 식별하는 고유 코드는?', answer: '통제번호' },
  { word: '수동통제', question: '사람이 직접 판단하고 수행하는 통제 유형은?', answer: '수동통제' },
  { word: '자동통제', question: 'IT 시스템이 자동으로 수행하는 통제 유형은?', answer: '자동통제' },
  { word: '감사보고서', question: '외부 감사인이 재무제표에 대한 의견을 표명한 문서는?', answer: '감사보고서' },
  { word: '표본추출', question: '모집단에서 일부를 선택하여 테스트하는 방법은?', answer: '표본추출' },
  { word: '미비점', question: '내부통제의 설계 또는 운영상의 결함을 의미하는 용어는?', answer: '미비점' },
  { word: '결재반려', question: '통제책임자가 증빙을 검토 후 재작성을 요구하는 행위는?', answer: '결재반려' },
  { word: '통제책임자', question: '증빙을 검토하고 승인하는 권한을 가진 역할은?', answer: '통제책임자' },
  { word: '증빙담당자', question: '증빙을 직접 수집하고 업로드하는 역할은?', answer: '증빙담당자' },
  { word: '고유키', question: '통제번호와 관련부서를 조합하여 만드는 식별자는?', answer: '고유키' },
  { word: '평가기간', question: '내부회계 통제 운영을 테스트하는 시간적 범위는?', answer: '평가기간' },
  { word: '운영평가', question: '설계된 통제가 실제로 효과적으로 작동하는지 확인하는 활동은?', answer: '운영평가' },
  { word: 'KPI점수', question: '증빙 업로드 실적을 수치화한 성과 지표는?', answer: 'KPI점수' },
  { word: '설계평가', question: '내부통제가 위험을 적절히 감소시키도록 설계되었는지 판단하는 활동은?', answer: '설계평가' },
  { word: '재무보고', question: '이해관계자에게 기업의 재무 상태를 알리는 활동은?', answer: '재무보고' },
  { word: '위험평가', question: '재무제표 왜곡 가능성이 있는 사항을 식별하는 과정은?', answer: '위험평가' },
  { word: '승인', question: '통제책임자가 증빙을 검토하고 적합하다고 판단하는 행위는?', answer: '승인' },
  { word: '사업보고서', question: '상장사가 연간 경영 실적을 공시하는 주요 문서는?', answer: '사업보고서' },
  { word: '내부감사', question: '외부 기관이 아닌 회사 내부에서 실시하는 감사 활동은?', answer: '내부감사' },
]

function checkBingo(marked: boolean[], size = 5): number {
  let count = 0
  // 가로
  for (let r = 0; r < size; r++) {
    if (Array.from({ length: size }, (_, c) => marked[r * size + c]).every(Boolean)) count++
  }
  // 세로
  for (let c = 0; c < size; c++) {
    if (Array.from({ length: size }, (_, r) => marked[r * size + c]).every(Boolean)) count++
  }
  // 대각선
  if (Array.from({ length: size }, (_, i) => marked[i * size + i]).every(Boolean)) count++
  if (Array.from({ length: size }, (_, i) => marked[i * size + (size - 1 - i)]).every(Boolean)) count++
  return count
}

function getBingoLines(marked: boolean[], size = 5): Set<number> {
  const lineIndices = new Set<number>()
  // 가로
  for (let r = 0; r < size; r++) {
    if (Array.from({ length: size }, (_, c) => marked[r * size + c]).every(Boolean)) {
      for (let c = 0; c < size; c++) lineIndices.add(r * size + c)
    }
  }
  // 세로
  for (let c = 0; c < size; c++) {
    if (Array.from({ length: size }, (_, r) => marked[r * size + c]).every(Boolean)) {
      for (let r = 0; r < size; r++) lineIndices.add(r * size + c)
    }
  }
  // 대각선
  if (Array.from({ length: size }, (_, i) => marked[i * size + i]).every(Boolean)) {
    for (let i = 0; i < size; i++) lineIndices.add(i * size + i)
  }
  if (Array.from({ length: size }, (_, i) => marked[i * size + (size - 1 - i)]).every(Boolean)) {
    for (let i = 0; i < size; i++) lineIndices.add(i * size + (size - 1 - i))
  }
  return lineIndices
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function BingoPage() {
  const [questions, setQuestions] = useState(() => shuffle(ALL_QUESTIONS).slice(0, 25))
  const [marked, setMarked] = useState<boolean[]>(Array(25).fill(false))
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [bingoCount, setBingoCount] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    const newBingo = checkBingo(marked)
    setBingoCount(newBingo)
    if (newBingo >= 5) setGameOver(true)
  }, [marked])

  function handleCellClick(idx: number) {
    if (marked[idx] || gameOver) return
    setActiveQuestion(idx)
    setInputVal('')
    setFeedback(null)
  }

  function handleSubmit() {
    if (activeQuestion === null) return
    const correct = questions[activeQuestion].answer
    const isCorrect = inputVal.trim().replace(/\s/g, '') === correct.replace(/\s/g, '')

    if (isCorrect) {
      setFeedback('correct')
      const newMarked = [...marked]
      newMarked[activeQuestion] = true
      setMarked(newMarked)
      setScore(s => s + 10)
      setTimeout(() => {
        setActiveQuestion(null)
        setFeedback(null)
      }, 1000)
    } else {
      setFeedback('wrong')
      setTimeout(() => setFeedback(null), 1500)
    }
  }

  function resetGame() {
    setQuestions(shuffle(ALL_QUESTIONS).slice(0, 25))
    setMarked(Array(25).fill(false))
    setActiveQuestion(null)
    setInputVal('')
    setFeedback(null)
    setBingoCount(0)
    setGameOver(false)
    setScore(0)
  }

  const bingoLines = getBingoLines(marked)
  const markedCount = marked.filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Gamepad2 size={22} className="text-brand-600" />내부회계 빙고 퀴즈
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">칸을 클릭해 퀴즈를 풀고 빙고를 완성하세요!</p>
        </div>
        <button onClick={resetGame} className="btn-secondary text-sm py-2">
          <RotateCcw size={14} />새 게임
        </button>
      </div>

      {/* 점수판 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-brand-600">{bingoCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">빙고 라인</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{markedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">정답 수</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-black text-amber-500">{score}</p>
          <p className="text-xs text-gray-500 mt-0.5">점수</p>
        </div>
      </div>

      {/* 게임 클리어 */}
      {gameOver && (
        <div className="card p-6 bg-gradient-to-br from-brand-50 to-purple-50 border-brand-200 text-center"
          style={{ animation: 'scaleIn 0.3s ease-out' }}>
          <Trophy size={40} className="text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-gray-900 mb-1">빙고 5줄 달성! 🎉</h2>
          <p className="text-gray-600 mb-4">최종 점수: <b className="text-brand-600 text-lg">{score}점</b></p>
          <button onClick={resetGame} className="btn-primary mx-auto">
            <RotateCcw size={15} />다시 하기
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* 빙고판 */}
        <div className="lg:col-span-3">
          <div className="card p-4">
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, idx) => {
                const isMarked = marked[idx]
                const isBingoLine = bingoLines.has(idx)
                const isActive = activeQuestion === idx

                return (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(idx)}
                    disabled={isMarked || gameOver}
                    className={clsx(
                      'aspect-square flex flex-col items-center justify-center rounded-xl text-center text-xs font-bold transition-all duration-200 select-none relative overflow-hidden',
                      isMarked && isBingoLine
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md scale-95'
                        : isMarked
                        ? 'bg-emerald-500 text-white shadow-sm scale-95'
                        : isActive
                        ? 'bg-brand-600 text-white shadow-lg scale-105 ring-2 ring-brand-300'
                        : 'bg-gray-50 hover:bg-brand-50 hover:text-brand-700 text-gray-700 border border-gray-100 hover:border-brand-200 hover:scale-105'
                    )}
                  >
                    {isMarked ? (
                      <>
                        <CheckCircle2 size={14} className="mb-0.5" />
                        <span className="text-[9px] leading-tight px-0.5">{q.word}</span>
                        {isBingoLine && (
                          <Sparkles size={10} className="absolute top-0.5 right-0.5 opacity-80" />
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] leading-tight px-0.5 break-keep">{q.word}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-center text-xs text-gray-400 mt-3">
              칸을 클릭하면 퀴즈가 출제됩니다
            </p>
          </div>
        </div>

        {/* 퀴즈 입력 */}
        <div className="lg:col-span-2 space-y-4">
          {activeQuestion !== null ? (
            <div className="card p-5 space-y-4" style={{ animation: 'scaleIn 0.15s ease-out' }}>
              <div className="flex items-start gap-2">
                <HelpCircle size={18} className="text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">문제 {activeQuestion + 1}</p>
                  <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                    {questions[activeQuestion].question}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="정답을 입력하세요..."
                  className={clsx(
                    'form-input text-sm w-full transition-all',
                    feedback === 'correct' && 'border-emerald-400 bg-emerald-50',
                    feedback === 'wrong' && 'border-red-400 bg-red-50 animate-pulse'
                  )}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={!inputVal.trim()}
                  className="btn-primary w-full disabled:opacity-40"
                >
                  확인 (Enter)
                </button>
              </div>

              {feedback === 'correct' && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-sm font-semibold">
                  <CheckCircle2 size={16} />정답입니다! +10점 🎉
                </div>
              )}
              {feedback === 'wrong' && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm">
                  <span>❌</span>틀렸습니다. 다시 시도해보세요!
                </div>
              )}

              <button
                onClick={() => { setActiveQuestion(null); setFeedback(null) }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="card p-5 text-center text-gray-400">
              <Gamepad2 size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">왼쪽 빙고판에서 칸을 클릭하세요</p>
              <p className="text-xs mt-1">정답을 맞히면 해당 칸이 표시됩니다</p>
            </div>
          )}

          {/* 빙고 현황 */}
          <div className="card p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">진행 현황</p>
            <div className="space-y-2">
              {[
                { label: '5줄 빙고 달성', target: 5, current: bingoCount, color: 'bg-brand-500' },
                { label: '정답 맞힌 칸', target: 25, current: markedCount, color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-900">{item.current}/{item.target}</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${Math.min(100, (item.current / item.target) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 힌트 */}
          <div className="card p-4 bg-blue-50 border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-1.5">💡 게임 방법</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>① 빙고판에서 단어 칸을 클릭</li>
              <li>② 출제된 설명을 읽고 정답 입력</li>
              <li>③ 맞히면 칸이 초록색으로 표시</li>
              <li>④ 5줄 빙고 달성 시 게임 클리어!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
