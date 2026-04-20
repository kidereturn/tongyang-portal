import { Bot, Send, MessageSquare, Sparkles, RefreshCw, AlertCircle, BookOpen } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
}

// ────────────────────────────── 추천 질문 ──────────────────────────────
const SUGGESTIONS = [
  '내부회계관리제도란 무엇인가요?',
  '증빙 업로드 절차를 알려주세요',
  '결재 상신은 어떻게 하나요?',
  '반려된 증빙은 어떻게 처리하나요?',
  'RCM(통제기술서)이란?',
  'COSO 프레임워크를 설명해주세요',
  '핵심통제와 비핵심통제 차이는?',
  '모집단과 표본이란?',
  'IT 일반통제(ITGC)란?',
  '직무분리 원칙이 뭔가요?',
]

// ────────────────────────────── 서버 API 호출 ──────────────────────────────
async function callChatbotAPI(messages: Message[]): Promise<{ reply: string; model?: string; docsCount?: number }> {
  const response = await fetch('/api/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.ok) {
    throw new Error(data.error ?? 'AI 서비스 오류')
  }

  return { reply: data.reply, model: data.model, docsCount: data.docsCount }
}

// ────────────────────────────── 마크다운 간이 렌더링 ──────────────────────────────
function renderMarkdown(text: string) {
  // Bold: **text** or __text__
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
  // Headers: ## text
  html = html.replace(/^### (.+)$/gm, '<div class="font-bold text-sm mt-2 mb-1">$1</div>')
  html = html.replace(/^## (.+)$/gm, '<div class="font-bold text-base mt-2 mb-1">$1</div>')
  // Bullet points
  html = html.replace(/^[•·] (.+)$/gm, '<div class="ml-3">• $1</div>')
  html = html.replace(/^- (.+)$/gm, '<div class="ml-3">• $1</div>')
  return html
}

// ────────────────────────────── 컴포넌트 ──────────────────────────────
export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '안녕하세요! (주)동양 내부회계관리 AI 어시스턴트입니다.\n\n내부회계관리제도 관련 문서를 기반으로 답변합니다.\n아래 추천 질문을 클릭하거나 직접 질문해 주세요.',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modelInfo, setModelInfo] = useState<string>('')
  const [docsCount, setDocsCount] = useState<number>(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    setError(null)

    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    const userMsg: Message = { role: 'user', content: msg, time }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setThinking(true)

    try {
      const historyForApi = updatedMessages.filter(
        m => m.content !== updatedMessages[0]?.content || m.role !== 'assistant'
      )
      const result = await callChatbotAPI(historyForApi)
      if (result.model) setModelInfo(result.model)
      if (result.docsCount) setDocsCount(result.docsCount)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.reply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'AI 응답 중 오류가 발생했습니다.'
      setError(errMsg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `죄송합니다. 오류가 발생했습니다.\n(${errMsg})\n\n잠시 후 다시 시도해 주세요.`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }])
    } finally {
      setThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function resetChat() {
    setMessages([{
      role: 'assistant',
      content: '대화가 초기화되었습니다. 무엇을 도와드릴까요?',
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    }])
    setError(null)
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">AI Assistant<span className="sep" />챗봇</div>
            <h1>AI 챗봇. <span className="soft">묻고 배우세요.</span></h1>
            <p className="lead">내부회계관리 문서 기반으로 답변합니다. 문서에 없는 내용은 답하지 않습니다.</p>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, fontSize: 12, color: '#065F46' }}>
              <Sparkles size={12} /> 문서 기반 AI
            </div>
          </div>
        </div>
      </div>

      <div className="pg-body">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* 채팅 영역 */}
        <div className="lg:col-span-3 card flex flex-col h-[calc(100vh-200px)] sm:h-[500px] lg:h-[580px]">
          {/* 채팅 헤더 */}
          <div className="px-5 py-3 border-b border-warm-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-600">
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-brand-900">내부회계 AI 어시스턴트</p>
                <p className="text-xs text-emerald-500">
                  {modelInfo ? `${modelInfo} · 문서 ${docsCount}건 참조` : '문서 기반 답변'}
                </p>
              </div>
            </div>
            <button onClick={resetChat} className="btn-ghost text-xs py-1.5 px-2">
              <RefreshCw size={12} />초기화
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-brand-500 to-brand-600">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-2.5 rounded-lg text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand-800 text-white rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-warm-50 text-brand-800 border border-warm-100 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div
                        className="whitespace-pre-wrap [&_strong]:font-bold [&_strong]:text-brand-900"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                  <span className="text-[10px] text-warm-400 px-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-brand-500 to-brand-600">
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-warm-50 border border-warm-100 rounded-lg rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-1.5 h-1.5 bg-warm-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                  <span className="text-xs text-warm-400 ml-2">문서를 분석하고 답변을 작성 중...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 입력 영역 */}
          <div className="px-4 py-3 border-t border-warm-100">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="내부회계관리 관련 질문을 입력하세요... (Enter로 전송)"
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

        {/* 사이드바 */}
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-bold text-brand-900 flex items-center gap-1.5 mb-3">
              <MessageSquare size={14} className="text-brand-700" />추천 질문
            </p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={thinking}
                  className="w-full text-left text-xs px-3 py-2.5 bg-warm-50 hover:bg-warm-50 hover:text-brand-700 border border-warm-100 hover:border-brand-100 rounded-lg transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-brand-50 to-warm-50 border-brand-100">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-brand-700" />
              <p className="text-sm font-bold text-brand-900">문서 기반 AI</p>
            </div>
            <div className="space-y-1.5 text-xs text-warm-600">
              <div className="flex justify-between">
                <span>AI 모델</span>
                <span className="font-medium text-brand-900">{modelInfo || 'Gemini 2.5 Flash'}</span>
              </div>
              <div className="flex justify-between">
                <span>참조 문서</span>
                <span className="font-medium text-emerald-700">{docsCount || '-'}건</span>
              </div>
              <div className="flex justify-between">
                <span>답변 방식</span>
                <span className="font-medium text-brand-900">문서 소스만</span>
              </div>
              <div className="flex justify-between">
                <span>이번 세션</span>
                <span className="font-medium text-brand-900">{messages.filter(m => m.role === 'user').length}회 질문</span>
              </div>
              <div className="mt-2 pt-2 border-t border-brand-100/50">
                <p className="text-[10px] text-brand-700 leading-relaxed">
                  내부회계관리제도 관련 문서를 기반으로 답변합니다.
                  문서에 없는 내용은 답변하지 않습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
