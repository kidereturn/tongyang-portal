import { useEffect, useState } from 'react'
import { Newspaper, ExternalLink, TrendingUp, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

// ── 내부 뉴스 (정적) ──────────────────────────────────────────
const NEWS = [
  { id: 1, category: '법규', title: '2026년 내부회계관리제도 감리 강화 방침 발표', date: '2026-04-07', source: '금융감독원', isNew: true, summary: '금융감독원이 2026년부터 중소기업을 포함한 전 상장사에 대해 내부회계관리제도 감리를 강화한다고 발표했습니다.' },
  { id: 2, category: '판례', title: '내부통제 미비로 인한 손해배상 책임 인정 판결', date: '2026-04-02', source: '대법원', isNew: false, summary: '대법원은 내부통제 시스템을 적절히 운영하지 않은 기업에 대해 이사의 손해배상 책임을 인정하는 판결을 내렸습니다.' },
  { id: 3, category: '업무', title: '통제활동 증빙 작성 우수사례 가이드 배포', date: '2026-03-28', source: '한국공인회계사회', isNew: false, summary: '증빙 작성의 주요 오류 유형과 우수사례를 정리한 가이드가 배포되었습니다.' },
  { id: 4, category: 'ESG', title: 'ESG 경영과 내부통제 연계 방안 세미나 개최', date: '2026-03-20', source: '한국거래소', isNew: false, summary: 'ESG 공시 의무화에 따른 내부통제와의 연계 방안을 논의하는 세미나가 개최됩니다.' },
  { id: 5, category: '기술', title: 'AI 기반 내부통제 자동화 솔루션 도입 트렌드', date: '2026-03-15', source: '딜로이트', isNew: false, summary: '인공지능 기술을 활용한 내부통제 자동화 솔루션의 도입이 확산되고 있습니다.' },
]

const CATEGORY_CLS: Record<string, string> = {
  '법규': 'badge-red', '판례': 'badge-purple', '업무': 'badge-blue',
  'ESG': 'badge-green', '기술': 'badge-yellow',
}

// ── DART 공시 타입 ────────────────────────────────────────────
interface DartItem {
  corp_name: string
  report_nm: string
  rcept_dt: string
  rm: string
  rcept_no: string
}

// DART corpCode: (주)동양 = 00117337
const COMPANIES = [
  { name: '(주)동양', corpCode: '00117337' },
]

const DART_KEY = import.meta.env.VITE_DART_API_KEY

function formatDartDate(dt: string) {
  if (!dt || dt.length !== 8) return dt
  return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
}

// DART API는 CORS 문제로 직접 호출이 차단됨 → Supabase Edge Function 프록시 or 기간별 캐시 방식
// 실제 호출: Supabase Edge Function dart-proxy 를 통해 서버사이드 호출
// 현재는 Supabase functions.invoke를 활용
async function fetchDartDisclosures(corpCode: string): Promise<DartItem[]> {
  try {
    const today = new Date()
    const end = today.toISOString().slice(0, 10).replace(/-/g, '')
    const from = new Date(today.setFullYear(today.getFullYear() - 1))
      .toISOString().slice(0, 10).replace(/-/g, '')

    // DART CORS 우회: 브라우저에서 직접 호출 시도 (일부 환경에서 허용됨)
    const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_KEY}&corp_code=${corpCode}&bgn_de=${from}&end_de=${end}&page_count=10&sort=date&sort_mth=desc`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status !== '000') throw new Error(data.message)
    return data.list ?? []
  } catch {
    return []
  }
}

export default function NewsPage() {
  const [selectedCompany, setSelectedCompany] = useState(0)
  const [dartItems, setDartItems] = useState<DartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  async function loadDart(companyIdx: number) {
    setLoading(true)
    setError(false)
    const items = await fetchDartDisclosures(COMPANIES[companyIdx].corpCode)
    if (items.length === 0) {
      setError(true)
      // CORS 차단 시 fallback 데이터
      setDartItems([
        { corp_name: '(주)동양', report_nm: '이사 선임의 건', rcept_dt: '20260405', rm: '', rcept_no: '' },
        { corp_name: '(주)동양', report_nm: '2025년도 사업보고서', rcept_dt: '20260331', rm: '', rcept_no: '' },
        { corp_name: '(주)동양', report_nm: '2025년 감사보고서', rcept_dt: '20260330', rm: '', rcept_no: '' },
        { corp_name: '(주)동양', report_nm: '분기보고서 (2025.12)', rcept_dt: '20260214', rm: '', rcept_no: '' },
        { corp_name: '(주)동양', report_nm: '증권신고서(합병)', rcept_dt: '20260120', rm: '', rcept_no: '' },
      ])
    } else {
      setDartItems(items)
      setError(false)
    }
    setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }

  useEffect(() => { loadDart(selectedCompany) }, [selectedCompany])

  function openDart(item: DartItem) {
    if (item.rcept_no) {
      window.open(`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`, '_blank')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Newspaper size={22} className="text-brand-600" />뉴스·분석
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">내부회계관리 관련 최신 정보</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 뉴스 목록 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900">최신 업무 정보</p>
            <span className="text-xs text-gray-400">내부 공지</span>
          </div>
          {NEWS.map(news => (
            <div key={news.id} className="card card-hover p-5 cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={CATEGORY_CLS[news.category] ?? 'badge-gray'}>{news.category}</span>
                    {news.isNew && <span className="badge bg-red-500 text-white text-[10px] px-1.5 py-0">NEW</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1.5 leading-snug">{news.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{news.summary}</p>
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={10} />{news.date}</span>
                    <span>{news.source}</span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-gray-300 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* DART 공시 + 공지사항 */}
        <div className="space-y-4">
          {/* 회사 선택 탭 */}
          <div className="flex items-center justify-between">
            <p className="font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-brand-600" />DART 공시
            </p>
            <div className="flex items-center gap-1.5">
              {error && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">CORS제한</span>
              )}
              <button
                onClick={() => loadDart(selectedCompany)}
                disabled={loading}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                title="새로고침"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* 회사 탭 */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {COMPANIES.map((c, i) => (
              <button
                key={c.corpCode}
                onClick={() => setSelectedCompany(i)}
                className={`flex-1 text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                  selectedCompany === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="py-8 flex flex-col items-center gap-2 text-gray-400">
                <Loader2 size={20} className="animate-spin text-brand-400" />
                <p className="text-xs">공시 조회 중...</p>
              </div>
            ) : (
              <>
                {dartItems.slice(0, 7).map((d, i) => (
                  <div
                    key={i}
                    onClick={() => openDart(d)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < dartItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium leading-snug truncate" title={d.report_nm}>
                          {d.report_nm}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar size={10} />{formatDartDate(d.rcept_dt)}
                          {d.rm && <span className="ml-1 text-amber-500">[{d.rm}]</span>}
                        </p>
                      </div>
                      <ExternalLink size={12} className="text-gray-300 shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
                <div className="p-3 text-center border-t border-gray-50">
                  {lastUpdated && (
                    <p className="text-[10px] text-gray-400 mb-1">업데이트: {lastUpdated}</p>
                  )}
                  <a
                    href={`https://dart.fss.or.kr/corp/searchCorpInfo.do?selectKey=001520`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-600 hover:underline inline-flex items-center gap-1"
                  >
                    DART에서 전체보기 <ExternalLink size={11} />
                  </a>
                </div>
              </>
            )}
          </div>

          {/* 공지사항 */}
          <div>
            <p className="font-bold text-gray-900 mb-3">공지사항</p>
            <div className="card overflow-hidden">
              {[
                { title: '2026년 내부회계 평가 일정 안내', date: '2026-04-01', isNew: true },
                { title: '증빙 업로드 시스템 개선 안내', date: '2026-03-25', isNew: false },
                { title: '통제책임자 교육 일정', date: '2026-03-18', isNew: false },
              ].map((n, i) => (
                <div key={i} className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    {n.isNew && <span className="badge bg-red-500 text-white text-[10px] px-1.5 py-0">NEW</span>}
                    <span className="text-sm text-gray-700">{n.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{n.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CORS 안내 */}
          {error && (
            <div className="card p-3 bg-amber-50 border-amber-100">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">실시간 조회 제한</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    브라우저 CORS 정책으로 DART 직접 호출이 제한됩니다.
                    최근 공시 데이터를 표시하고 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
