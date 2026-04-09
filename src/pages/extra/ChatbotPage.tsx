import { Bot, Send, MessageSquare, Sparkles, RefreshCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
}

const SUGGESTIONS = [
  '내부회계관리제도란 무엇인가요?',
  '통제활동 증빙 작성 시 주의사항이 있나요?',
  '결재상신 절차를 설명해주세요',
  '반려된 증빙은 어떻게 처리하나요?',
]

const MOCK_RESPONSES: Record<string, string> = {
  '내부회계관리제도란': '내부회계관리제도(ICFR)는 재무보고의 신뢰성을 확보하기 위해 경영자가 설계·운영·평가하는 내부통제 시스템입니다. 상장기업은 외부감사인의 검토를 받아야 합니다.',
  '통제활동 증빙': '통제활동 증빙 작성 시 주의사항:\n① 증빙은 통제 수행 시점에 즉시 작성\n② 담당자 서명/결재 확인\n③ 파일명은 정해진 규칙에 따라 작성\n④ 원본과 동일한 파일 형식 유지',
  '결재상신': '결재상신 절차:\n① 증빙 파일 업로드 (각 모집단 항목별)\n② 저장 버튼 클릭\n③ 결재상신 버튼 클릭\n④ 승인자에게 자동 이메일 발송\n⑤ 상신여부 "완료"로 변경',
  '반려': '반려된 증빙 처리:\n① 반려 사유 확인 (이메일/결재함)\n② 해당 증빙 수정/보완\n③ 증빙 재업로드\n④ 결재 재상신',
}

function getMockResponse(input: string): string {
  const key = Object.keys(MOCK_RESPONSES).find(k => input.includes(k))
  if (key) return MOCK_RESPONSES[key]
  return '안녕하세요! 내부회계관리 AI 어시스턴트입니다. 증빙 업로드, 결재 프로세스, 내부통제 관련 질문을 도와드립니다.\n\n(참고: 현재 기본 응답 모드입니다. NotebookLM 연동 후 더 정확한 답변이 가능합니다.)'
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '안녕하세요! 내부회계관리 AI 어시스턴트입니다 🤖\n증빙 업로드, 결재 프로세스, 내부통제에 관한 질문을 도와드립니다.',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content: msg, time }])
    setThinking(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: getMockResponse(msg),
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }])
    setThinking(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Bot size={22} className="text-brand-600" />AI 챗봇
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">내부회계관리 AI 어시스턴트</p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
          <Sparkles size={12} />
          <span>NotebookLM 연동 예정</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* 채팅 영역 */}
        <div className="lg:col-span-3 card flex flex-col" style={{ height: '580px' }}>
          {/* 채팅 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">내부회계 AI 어시스턴트</p>
                <p className="text-xs text-emerald-500">● 온라인</p>
              </div>
            </div>
            <button onClick={() => setMessages(prev => prev.slice(0, 1))} className="btn-ghost text-xs py-1.5 px-2">
              <RefreshCw size={12} />초기화
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-tr-sm'
                      : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="질문을 입력하세요..."
                className="form-input flex-1 text-sm"
                disabled={thinking}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking}
                className="btn-primary px-4 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* 추천 질문 */}
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mb-3">
              <MessageSquare size={14} className="text-brand-600" />추천 질문
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left text-xs px-3 py-2.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-100 hover:border-brand-100 rounded-lg transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-brand-600" />
              <p className="text-sm font-bold text-gray-900">NotebookLM 연동</p>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              향후 구글 NotebookLM과 연동하여 증빙 검토 자동화, 내부통제 Q&A 기능이 추가될 예정입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
