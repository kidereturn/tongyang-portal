import { Bot, Send, MessageSquare, Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
}

// Gemini API 설정 - gemini-2.0-flash 우선, 할당량 초과 시 1.5-flash 자동 전환
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL_2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`
const GEMINI_URL_15 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`

// 시스템 프롬프트: 동양 내부회계 전문 어시스턴트
const SYSTEM_PROMPT = `당신은 (주)동양의 내부회계관리제도(ICFR) 전문 AI 어시스턴트입니다.
다음 역할을 수행합니다:
- 임직원의 증빙 업로드, 결재 프로세스 관련 질문 답변
- 내부회계관리제도 개념 및 절차 설명
- 통제활동 증빙 작성 가이드 제공
- 반려된 증빙 처리 방법 안내
- 시스템 사용 방법 안내

답변 시 주의사항:
- 한국어로 간결하고 명확하게 답변하세요
- 전문 용어 사용 시 쉽게 설명을 추가하세요
- 필요한 경우 번호 목록(①②③)을 사용하세요
- 이 시스템과 무관한 질문(법률 자문, 개인 재정 등)은 정중히 거절하세요`

const SUGGESTIONS = [
  '내부회계관리제도란 무엇인가요?',
  '통제활동 증빙 작성 시 주의사항이 있나요?',
  '결재상신 절차를 설명해주세요',
  '반려된 증빙은 어떻게 처리하나요?',
  '모집단이란 무엇인가요?',
  '핵심통제와 비핵심통제 차이는?',
]

async function callGemini(messages: Message[]): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다.')
  }

  // 대화 히스토리 구성 (시스템 프롬프트 + 대화 내용)
  const contents = [
    // 시스템 프롬프트를 첫 번째 user 턴으로 전달 (Gemini 방식)
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: '네, 저는 (주)동양 내부회계관리 AI 어시스턴트입니다. 무엇이든 도와드리겠습니다.' }] },
    // 실제 대화
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
  ]

  const requestBody = JSON.stringify({
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  })

  // gemini-2.0-flash 우선 시도
  let res = await fetch(GEMINI_URL_2, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
  })

  // 할당량 초과(429) 시 gemini-1.5-flash로 재시도
  if (res.status === 429) {
    res = await fetch(GEMINI_URL_15, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    })
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `API 오류 (${res.status})`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '응답을 받을 수 없습니다.'
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: '안녕하세요! 내부회계관리 AI 어시스턴트입니다 🤖\n증빙 업로드, 결재 프로세스, 내부통제에 관한 질문을 도와드립니다.\n\n아래 추천 질문을 클릭하거나 직접 질문해 주세요.',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      // 어시스턴트 메시지만 필터 (시스템 제외)
      const historyForApi = updatedMessages.filter(m => m.content !== updatedMessages[0]?.content || m.role !== 'assistant')
      const reply = await callGemini(historyForApi)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      }])
    } catch (e: any) {
      setError(e.message ?? 'AI 응답 중 오류가 발생했습니다.')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
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
      content: '대화가 초기화되었습니다. 무엇을 도와드릴까요? 🤖',
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }])
    setError(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Bot size={22} className="text-brand-600" />AI 챗봇
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">내부회계관리 AI 어시스턴트 (Gemini 2.0 Flash)</p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-700">
          <Sparkles size={12} />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      {!GEMINI_KEY && (
        <div className="card p-4 bg-amber-50 border-amber-100 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">API 키 미설정</p>
            <p className="text-xs text-amber-700 mt-0.5">.env.local에 VITE_GEMINI_API_KEY를 설정해주세요.</p>
          </div>
        </div>
      )}

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
                <p className="text-xs text-emerald-500">● Gemini 2.0 Flash</p>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="btn-ghost text-xs py-1.5 px-2"
            >
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
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                  <span className="text-xs text-gray-400 ml-2">Gemini가 생각하는 중...</span>
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
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="질문을 입력하세요... (Enter로 전송)"
                className="form-input flex-1 text-sm"
                disabled={thinking || !GEMINI_KEY}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || thinking || !GEMINI_KEY}
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
                  disabled={thinking}
                  className="w-full text-left text-xs px-3 py-2.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-100 hover:border-brand-100 rounded-lg transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-brand-600" />
              <p className="text-sm font-bold text-gray-900">AI 정보</p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>모델</span>
                <span className="font-medium text-gray-900">Gemini 2.0 Flash</span>
              </div>
              <div className="flex justify-between">
                <span>무료 할당량</span>
                <span className="font-medium text-emerald-700">1,500회/일</span>
              </div>
              <div className="flex justify-between">
                <span>대화 히스토리</span>
                <span className="font-medium text-gray-900">유지됨</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
