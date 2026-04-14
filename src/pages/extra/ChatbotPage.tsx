import { Bot, Send, MessageSquare, Sparkles, RefreshCw, AlertCircle, Zap } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
  source?: 'gemini' | 'local'
}

// ────────────────────────────── Gemini API 설정 ──────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY

function getGeminiModels() {
  if (!GEMINI_KEY) return []
  return [
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, name: 'Gemini 2.0 Flash' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`, name: 'Gemini 2.0 Flash Lite' },
    { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, name: 'Gemini 1.5 Flash' },
  ]
}

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

// ────────────────────────────── 로컬 지식베이스 (API 소진 시 폴백) ──────────────────────────────
interface KBEntry {
  keywords: string[]
  answer: string
}

const KNOWLEDGE_BASE: KBEntry[] = [
  {
    keywords: ['내부회계', 'ICFR', '내부회계관리제도', '내부회계관리', '제도'],
    answer: `📋 **내부회계관리제도(ICFR)란?**

내부회계관리제도는 기업의 재무보고가 회계처리기준에 따라 작성·공시되도록 하기 위한 내부통제 체계입니다.

① **법적 근거**: 주식회사 등의 외부감사에 관한 법률(외감법)
② **목적**: 재무제표의 신뢰성 확보, 자산 보호, 업무 효율성 제고
③ **구성요소** (COSO 기준):
   • 통제환경(Control Environment)
   • 위험평가(Risk Assessment)
   • 통제활동(Control Activities)
   • 정보와 의사소통(Information & Communication)
   • 모니터링(Monitoring)
④ **평가기준**: 내부회계관리제도 모범규준(한국공인회계사회)
⑤ **보고의무**: 내부회계관리자 → 이사회·감사(위원회) 연 1회 보고`
  },
  {
    keywords: ['증빙', '업로드', '제출', '파일', '첨부'],
    answer: `📎 **증빙 업로드 및 제출 안내**

① **증빙 업로드 절차**:
   • 증빙관리 메뉴 → 해당 통제활동 선택
   • "증빙 업로드" 버튼 클릭
   • 팝업에서 해당 모집단 항목별 파일 첨부
   • 파일명 매칭 검증 결과 확인

② **파일명 주의사항**:
   • 시스템이 파일명과 증빙명을 자동 매칭합니다
   • 올바른 증빙 파일인지 검증 결과를 반드시 확인하세요

③ **중간 저장**: 모든 항목을 완료하지 않아도 중간 저장이 가능합니다
④ **제출**: 모든 증빙이 준비되면 "상신" 버튼으로 결재를 요청합니다

⚠️ 한 번 상신하면 승인자가 검토하기 전까지는 수정이 불가합니다.`
  },
  {
    keywords: ['결재', '상신', '승인', '절차', '프로세스', '워크플로우', '결재상신'],
    answer: `✅ **결재 상신 절차**

① **증빙 담당자(Evidence Owner)**:
   • 할당된 통제활동 확인 → 증빙 업로드 → 파일명 매칭 확인 → 상신

② **통제 책임자(Controller)**:
   • 이메일/알림으로 결재 요청 수신
   • LMS 접속 → 증빙 검토
   • 승인 또는 반려 결정

③ **결재 흐름**:
   📝 작성(Draft) → 📤 상신(Submitted) → ✅ 승인(Approved) / ❌ 반려(Rejected)

④ **반려 시**: 담당자에게 반려 사유와 함께 알림 → 수정 후 재상신 가능
⑤ **관리자**: 전 과정 조회 및 필요 시 승인/반려 취소 가능`
  },
  {
    keywords: ['반려', '거절', '재상신', '수정', '거부'],
    answer: `🔄 **반려된 증빙 처리 방법**

① **반려 알림 확인**: 이메일/시스템 알림에서 반려 사유를 확인합니다
② **반려 사유 파악**: 승인자가 남긴 코멘트를 꼼꼼히 확인합니다
③ **증빙 수정**:
   • 잘못된 파일 → 올바른 파일로 재업로드
   • 누락된 항목 → 추가 증빙 첨부
   • 내용 오류 → 수정된 증빙으로 교체
④ **재상신**: 수정 완료 후 다시 상신 버튼을 클릭합니다

💡 **팁**: 반려 사유를 정확히 파악하지 못했다면 통제 책임자에게 직접 문의하세요.
동일한 사유로 반복 반려되지 않도록 주의합니다.`
  },
  {
    keywords: ['모집단', 'population', '샘플', '표본'],
    answer: `📊 **모집단(Population)이란?**

모집단은 특정 통제활동과 관련된 **전체 거래 또는 항목의 집합**을 의미합니다.

① **예시**:
   • 매입 승인 통제 → 해당 기간의 모든 매입 거래 = 모집단
   • 급여 지급 통제 → 해당 기간의 모든 급여 지급 건 = 모집단

② **모집단 파일**:
   • 관리자가 업로드한 엑셀 파일에서 각 통제활동별 모집단이 정의됩니다
   • 증빙 담당자는 자신에게 배정된 모집단 항목에 대해 증빙을 제출합니다

③ **표본(Sample)**:
   • 외부감사 시 모집단에서 일부를 추출하여 테스트합니다
   • 통제 빈도에 따라 표본 크기가 달라집니다
     (일 1회: 25건, 월 1회: 2~5건, 분기 1회: 2건, 연 1회: 1건)

④ **모집단 완전성**: 모집단이 누락 없이 완전해야 테스트 결과가 신뢰할 수 있습니다.`
  },
  {
    keywords: ['핵심통제', 'key control', '비핵심', '핵심', '통제활동'],
    answer: `🎯 **핵심통제 vs 비핵심통제**

**핵심통제(Key Control)**:
• 재무제표의 중요한 왜곡표시를 예방·발견하는 핵심적인 통제
• 반드시 테스트 대상이며, 미비 시 유의적 미비점 또는 중요한 취약점으로 분류
• 예: 매출 인식 승인, 재고 실사, 은행 잔고 조정

**비핵심통제(Non-key Control)**:
• 핵심통제를 보완하는 추가적인 통제
• 단독으로는 중요한 왜곡표시를 방지하기 어려움
• 테스트 의무는 없으나 전체 통제환경 강화에 기여

**구분 기준**:
① 관련 경영진 주장의 중요성
② 해당 계정과목의 재무적 중요성
③ 통제 미비 시 영향의 크기와 발생가능성`
  },
  {
    keywords: ['RCM', '위험', '통제', '매트릭스', '통제기술서'],
    answer: `📑 **RCM(Risk Control Matrix)이란?**

RCM은 **위험-통제 매핑 문서**로, 내부회계관리제도의 핵심 문서입니다.

① **구성요소**:
   • 프로세스(업무절차)
   • 위험(Risk) - 재무보고 왜곡표시 위험
   • 경영진 주장(Assertion) - 발생, 완전성, 정확성, 분류, 기간귀속 등
   • 통제활동(Control Activity)
   • 통제유형 - 예방/발견, 수동/자동, 핵심/비핵심
   • 통제빈도 - 거래시, 일별, 주별, 월별, 분기별, 연별
   • 담당자 및 책임자

② **우리 시스템에서의 역할**:
   • 관리자가 RCM 엑셀 파일을 업로드
   • 통제활동번호별로 증빙 담당자가 매핑됨
   • 증빙 담당자는 자기 통제활동의 증빙을 제출

③ **TLC(거래수준통제)**: 개별 거래 수준에서 수행되는 통제활동`
  },
  {
    keywords: ['COSO', '프레임워크', '구성요소', '통제환경'],
    answer: `🏛️ **COSO 내부통제 프레임워크(2013)**

COSO는 내부통제의 국제 표준 프레임워크로, 5가지 구성요소와 17가지 원칙으로 구성됩니다.

**5가지 구성요소**:
① **통제환경** (Control Environment)
   • 조직의 윤리적 가치, 이사회 감독, 조직구조, 인적자원 정책
   • 다른 4개 구성요소의 기반

② **위험평가** (Risk Assessment)
   • 재무보고 목적 설정, 위험 식별·분석, 부정위험 고려, 변화 관리

③ **통제활동** (Control Activities)
   • 위험 대응 활동 선택·개발, IT 일반통제, 정책과 절차

④ **정보와 의사소통** (Information & Communication)
   • 관련 정보 확보, 내부·외부 의사소통

⑤ **모니터링** (Monitoring)
   • 지속적 모니터링, 개별평가, 미비점 보고·시정`
  },
  {
    keywords: ['외감법', '감사', '검토', '법률', '의무', '상장'],
    answer: `⚖️ **외감법과 내부회계관리제도**

**주식회사 등의 외부감사에 관한 법률(외감법)**에 따른 의무:

① **대상**: 외부감사 대상 회사 (자산총액 500억 원 이상 등)
② **경영진 책임**: 내부회계관리제도 설계·운영, 운영실태 보고
③ **감사(위원회)**: 내부회계관리제도 운영실태 평가 보고

④ **외부감사 수준** (단계적 강화):
   • 기존: "검토(Review)" → 개정 후: "감사(Audit)"로 전환
   • 2019년: 자산 2조 원 이상
   • 2020년: 자산 5천억 원 이상
   • 2023년: 자산 1천억 원 이상
   • 2024년: 전체 상장회사

⑤ **위반 시 제재**: 과징금, 증권발행 제한, 임원 해임권고 등

⚠️ "검토"는 소극적 확신, "감사"는 적극적 확신을 제공하므로 감사가 더 엄격합니다.`
  },
  {
    keywords: ['직무분리', 'SOD', 'segregation', '분리'],
    answer: `🔐 **직무분리(Segregation of Duties, SOD)**

직무분리는 부정과 오류를 예방하기 위한 핵심 통제원칙입니다.

**3가지 핵심 기능 분리**:
① **승인(Authorization)** - 거래를 승인하는 권한
② **기록(Recording)** - 거래를 회계 시스템에 기록
③ **보관(Custody)** - 자산을 물리적으로 보관·관리

이 세 기능이 한 사람에게 집중되면 부정 위험이 크게 증가합니다.

**예시**:
• ❌ 잘못된 사례: 구매 요청 + 발주 승인 + 입고 확인을 한 사람이 수행
• ✅ 올바른 사례: 구매 요청(현업) → 발주 승인(구매팀) → 입고 확인(자재팀)

**소규모 조직의 대안**: 인원이 부족할 경우 보완통제(Compensating Control)로 대체
(예: 경영진 사후 검토, 시스템 로그 모니터링)`
  },
  {
    keywords: ['부정', 'fraud', '삼각형', '무력화'],
    answer: `⚠️ **부정위험(Fraud Risk)**

**부정 삼각형(Fraud Triangle)**:
부정은 다음 3가지 요소가 동시에 존재할 때 발생합니다.
① **동기/압력(Incentive)** - 재무적 압박, 성과 목표
② **기회(Opportunity)** - 취약한 내부통제, 감독 부재
③ **정당화(Rationalization)** - "나만 그런 게 아니다", "나중에 갚겠다"

**경영진 무력화(Management Override)**:
• 경영진이 자신의 권한을 이용해 통제를 우회하는 위험
• 모든 감사에서 '유의적 위험'으로 추정됨
• 대응: 분개 테스트, 회계추정 검토, 비정상 거래 검토

**내부회계관리제도에서의 대응**:
• 윤리강령 및 내부고발 제도 운영
• 이사회/감사위원회의 독립적 감독
• 부정위험 평가 프로세스 수립`
  },
  {
    keywords: ['시스템', '사용법', '로그인', '메뉴', '사용', '방법'],
    answer: `💻 **(주)동양 내부회계 LMS 사용 안내**

① **로그인**: 사번으로 로그인 (초기 비밀번호 = 사번)
② **메인 메뉴**:
   • 대시보드 - 전체 현황 및 통계
   • 증빙관리 - 증빙 업로드/상신/조회
   • 학습현황 - 온라인 교육 수강 현황
   • 빙고퀴즈 - 내부회계 학습 퀴즈 (만점 시 선물!)
   • 웹툰 - 내부회계 교육 웹툰
   • 지도 - 사업장 위치 정보
   • DART - 공시정보 조회

③ **내 정보**: 상단 "내 정보" 클릭 → 이름, 부서, 연락처 수정 가능
④ **비밀번호 변경**: 내 정보 페이지에서 변경 가능

📱 모바일에서도 접속 가능합니다.
❓ 추가 문의: 내부회계팀으로 연락해 주세요.`
  },
  {
    keywords: ['IT', 'ITGC', '일반통제', '정보기술', '접근권한'],
    answer: `🖥️ **IT 일반통제(ITGC)**

ITGC는 IT 시스템 전반에 걸쳐 적용되는 통제로, 응용통제의 효과적 운영을 뒷받침합니다.

**4대 영역**:
① **접근 보안(Access to Programs & Data)**
   • 시스템 접근 권한 부여/변경/회수 절차
   • 비밀번호 정책, 권한 검토

② **프로그램 변경(Program Changes)**
   • 변경 요청 → 개발 → 테스트 → 승인 → 이관 절차
   • 운영 환경 직접 수정 금지

③ **프로그램 개발(Program Development)**
   • 신규 시스템/모듈 개발 시 통제
   • 요구사항 정의, 테스트, 사용자 수락 절차

④ **컴퓨터 운영(Computer Operations)**
   • 백업/복구 절차
   • 배치 작업 모니터링
   • 장애 대응 절차

⚠️ ITGC가 미비하면 그 위에 작동하는 자동화된 통제(Application Control)의 신뢰성도 영향을 받습니다.`
  },
]

function findLocalAnswer(question: string): string | null {
  const q = question.toLowerCase().replace(/\s+/g, '')
  const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length >= 2)
  let bestMatch: KBEntry | null = null
  let bestScore = 0

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase().replace(/\s+/g, '')
      // 직접 포함
      if (q.includes(kw)) {
        score += keyword.length * 2
      }
      // 단어별 부분 매칭
      for (const word of qWords) {
        if (kw.includes(word) || word.includes(kw)) {
          score += Math.min(word.length, kw.length)
        }
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  // 최소 매칭 점수 이상이어야 답변 제공 (기준 완화: 1 이상)
  return bestScore >= 1 ? bestMatch!.answer : null
}

// ────────────────────────────── 추천 질문 ──────────────────────────────
const SUGGESTIONS = [
  '내부회계관리제도란 무엇인가요?',
  '통제활동 증빙 작성 시 주의사항이 있나요?',
  '결재상신 절차를 설명해주세요',
  '반려된 증빙은 어떻게 처리하나요?',
  '모집단이란 무엇인가요?',
  'RCM(통제기술서)이란?',
  'COSO 프레임워크를 설명해주세요',
  '핵심통제와 비핵심통제 차이는?',
]

// ────────────────────────────── Gemini API 호출 ──────────────────────────────
async function callGemini(messages: Message[]): Promise<string> {
  if (!GEMINI_KEY) {
    throw new Error('API_KEY_MISSING')
  }

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: '네, 저는 (주)동양 내부회계관리 AI 어시스턴트입니다. 무엇이든 도와드리겠습니다.' }] },
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

  let res: Response | null = null
  let lastErrMsg = ''
  const models = getGeminiModels()
  if (models.length === 0) throw new Error('API_KEY_MISSING')
  for (const model of models) {
    try {
      res = await fetch(model.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })
      if (res.ok) break
      const errData = await res.json().catch(() => ({}))
      lastErrMsg = errData?.error?.message ?? `${model.name} 오류 (${res.status})`
      if (res.status === 429 || res.status === 404 || res.status >= 500) {
        res = null
        continue
      }
      break
    } catch {
      lastErrMsg = `${model.name} 네트워크 오류`
      res = null
      continue
    }
  }

  if (!res || !res.ok) {
    if (lastErrMsg.includes('leaked') || lastErrMsg.includes('PERMISSION_DENIED')) {
      throw new Error('API_KEY_BLOCKED')
    }
    if (lastErrMsg.includes('quota') || lastErrMsg.includes('RESOURCE_EXHAUSTED') || lastErrMsg.includes('exceeded') || lastErrMsg.includes('429')) {
      throw new Error('QUOTA_EXHAUSTED')
    }
    throw new Error(lastErrMsg || 'AI 서비스에 일시적인 문제가 발생했습니다.')
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '응답을 받을 수 없습니다.'
}

// ────────────────────────────── 컴포넌트 ──────────────────────────────
export default function ChatbotPage() {
  // API 키가 없으면 바로 로컬 모드
  const hasKey = Boolean(GEMINI_KEY)

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: hasKey
      ? '안녕하세요! 내부회계관리 AI 어시스턴트입니다.\n증빙 업로드, 결재 프로세스, 내부통제에 관한 질문을 도와드립니다.\n\n아래 추천 질문을 클릭하거나 직접 질문해 주세요.'
      : '안녕하세요! 내부회계관리 AI 어시스턴트입니다.\n\n현재 **내장 지식베이스 모드**로 운영 중입니다.\n내부회계관리제도, 증빙 업로드, 결재상신, RCM, COSO 등 주요 주제에 답변 가능합니다.\n\n아래 추천 질문을 클릭해 보세요!',
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    source: hasKey ? 'gemini' : 'local',
  }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [mode, setMode] = useState<'auto' | 'local'>(hasKey ? 'auto' : 'local')
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const quotaExhaustedRef = useRef(!hasKey)

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
      let reply: string
      let source: 'gemini' | 'local' = 'gemini'

      // 모드에 따라 분기
      if (mode === 'local' || quotaExhaustedRef.current) {
        // 로컬 모드: 지식베이스에서 답변
        const localAnswer = findLocalAnswer(msg)
        reply = localAnswer ?? '죄송합니다. 해당 질문에 대한 답변을 찾지 못했습니다.\n\n다음과 같은 주제로 질문해 보세요:\n• 내부회계관리제도\n• 증빙 업로드/제출\n• 결재상신 절차\n• 반려 처리\n• RCM/모집단\n• COSO 프레임워크\n• 직무분리\n• IT 일반통제'
        source = 'local'
      } else {
        // Gemini 우선 시도 → 실패 시 로컬 폴백
        try {
          const historyForApi = updatedMessages.filter(m => m.content !== updatedMessages[0]?.content || m.role !== 'assistant')
          reply = await callGemini(historyForApi)
          source = 'gemini'
        } catch (e: any) {
          if (e.message === 'API_KEY_BLOCKED') {
            quotaExhaustedRef.current = true
            const localAnswer = findLocalAnswer(msg)
            reply = localAnswer
              ? `🔒 *Gemini API 키가 차단되어 내장 지식베이스로 답변합니다.*\n\n${localAnswer}`
              : '🔒 Gemini API 키가 Google에 의해 차단되었습니다.\n관리자에게 새 API 키 발급을 요청해 주세요.\n\n현재는 내장 지식베이스 모드로 동작합니다. 아래 추천 질문을 이용해 주세요.'
            source = 'local'
          } else if (e.message === 'QUOTA_EXHAUSTED') {
            quotaExhaustedRef.current = true
            const localAnswer = findLocalAnswer(msg)
            if (localAnswer) {
              reply = `⚡ *Gemini API 할당량이 소진되어 내장 지식베이스로 답변합니다.*\n\n${localAnswer}`
              source = 'local'
            } else {
              reply = '⚡ Gemini API 할당량이 소진되었습니다.\n\n내장 지식베이스에서도 해당 질문의 답변을 찾지 못했습니다.\n추천 질문을 이용하시거나, API가 초기화된 후 다시 질문해 주세요.'
              source = 'local'
            }
          } else if (e.message === 'API_KEY_MISSING') {
            const localAnswer = findLocalAnswer(msg)
            reply = localAnswer ?? 'API 키가 설정되지 않았습니다. 추천 질문을 이용해 주세요.'
            source = 'local'
          } else {
            // 기타 오류 시에도 로컬 폴백 시도
            const localAnswer = findLocalAnswer(msg)
            if (localAnswer) {
              reply = `⚡ *AI 서비스 연결 오류로 내장 지식베이스에서 답변합니다.*\n\n${localAnswer}`
              source = 'local'
            } else {
              throw e
            }
          }
        }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        source,
      }])
    } catch (e: any) {
      const rawMsg = e.message ?? 'AI 응답 중 오류가 발생했습니다.'
      setError(rawMsg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        source: 'local',
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
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini',
    }])
    setError(null)
    quotaExhaustedRef.current = false
  }

  const isOfflineMode = mode === 'local' || quotaExhaustedRef.current

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Bot size={22} className="text-brand-600" />AI 챗봇
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">내부회계관리 AI 어시스턴트</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 모드 토글 */}
          <button
            onClick={() => setMode(m => m === 'auto' ? 'local' : 'auto')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs border transition ${
              isOfflineMode
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}
          >
            {isOfflineMode ? <Zap size={12} /> : <Sparkles size={12} />}
            <span>{isOfflineMode ? '내장 지식베이스' : 'Gemini AI'}</span>
          </button>
        </div>
      </div>

      {quotaExhaustedRef.current && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Gemini API 사용 불가</p>
            <p className="text-xs text-amber-700 mt-0.5">
              API 키가 차단되었거나 할당량이 소진되어 <strong>내장 지식베이스 모드</strong>로 자동 전환되었습니다.
              내부회계 관련 주요 질문에 답변 가능합니다. 관리자가 새 API 키를 등록하면 AI 모드가 복구됩니다.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* 채팅 영역 */}
        <div className="lg:col-span-3 card flex flex-col h-[calc(100vh-200px)] sm:h-[500px] lg:h-[580px]">
          {/* 채팅 헤더 */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isOfflineMode
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gradient-to-br from-brand-500 to-purple-600'
              }`}>
                <Bot size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">내부회계 AI 어시스턴트</p>
                <p className={`text-xs ${isOfflineMode ? 'text-amber-500' : 'text-emerald-500'}`}>
                  ● {isOfflineMode ? '내장 지식베이스 모드' : 'Gemini 2.0 Flash'}
                </p>
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
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    msg.source === 'local'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : 'bg-gradient-to-br from-brand-500 to-purple-600'
                  }`}>
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
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] text-gray-400">{msg.time}</span>
                    {msg.role === 'assistant' && msg.source === 'local' && (
                      <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">내장KB</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isOfflineMode
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : 'bg-gradient-to-br from-brand-500 to-purple-600'
                }`}>
                  <Bot size={12} className="text-white" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  {[0, 1, 2].map(j => (
                    <div key={j} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                  <span className="text-xs text-gray-400 ml-2">
                    {isOfflineMode ? '지식베이스 검색 중...' : 'Gemini가 생각하는 중...'}
                  </span>
                </div>
              </div>
            )}

            {error && !quotaExhaustedRef.current && (
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
                placeholder={isOfflineMode ? '내부회계 관련 질문을 입력하세요...' : '질문을 입력하세요... (Enter로 전송)'}
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
                  disabled={thinking}
                  className="w-full text-left text-xs px-3 py-2.5 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-100 hover:border-brand-100 rounded-lg transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={`card p-4 border ${
            isOfflineMode
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100'
              : 'bg-gradient-to-br from-brand-50 to-purple-50 border-brand-100'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {isOfflineMode ? <Zap size={14} className="text-amber-600" /> : <Sparkles size={14} className="text-brand-600" />}
              <p className="text-sm font-bold text-gray-900">
                {isOfflineMode ? '내장 지식베이스' : 'Gemini AI'}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              {isOfflineMode ? (
                <>
                  <div className="flex justify-between">
                    <span>모드</span>
                    <span className="font-medium text-amber-700">오프라인 KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>답변 주제</span>
                    <span className="font-medium text-gray-900">13개 영역</span>
                  </div>
                  <div className="flex justify-between">
                    <span>사용 제한</span>
                    <span className="font-medium text-emerald-700">무제한</span>
                  </div>
                  <div className="flex justify-between">
                    <span>커버 범위</span>
                    <span className="font-medium text-gray-900">내부회계 핵심</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200/50">
                    <p className="text-[10px] text-amber-600 leading-relaxed">
                      💡 Gemini 할당량 초기화 후 자동으로 AI 모드로 전환됩니다.
                      "초기화" 버튼을 눌러 재시도해 보세요.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>모델</span>
                    <span className="font-medium text-gray-900">Gemini 2.0 Flash</span>
                  </div>
                  <div className="flex justify-between">
                    <span>무료 할당량</span>
                    <span className="font-medium text-emerald-700">1,500회/일</span>
                  </div>
                  <div className="flex justify-between">
                    <span>이번 세션</span>
                    <span className="font-medium text-gray-900">{messages.filter(m => m.role === 'user').length}회 질문</span>
                  </div>
                  <div className="flex justify-between">
                    <span>폴백</span>
                    <span className="font-medium text-gray-900">내장 KB 자동전환</span>
                  </div>
                  <div className="flex justify-between">
                    <span>초기화</span>
                    <span className="font-medium text-gray-900">매일 오후 4~5시</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
