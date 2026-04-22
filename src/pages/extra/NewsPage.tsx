import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Building2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import clsx from 'clsx'

/* ──────── Types ──────── */
type NewsItem = { id: string; title: string; source: string; date: string; url: string }
type DartItem = { corp_name: string; report_nm: string; rcept_dt: string; rm: string; rcept_no: string; url: string }
type FinanceRow = { account_nm: string; thstrm_amount: string; frmtrm_amount: string; bfefrmtrm_amount: string }
type StockInfo = {
  name: string; price: string; change: string; changeRate: string
  marketCap: string; per: string; pbr: string; dividendYield: string
  high52w: string; low52w: string; volume: string
}

type FeedResponse = {
  ok: boolean; refreshedAt: string; corpName: string; corpCode: string
  stockCode?: string; dartAllUrl: string
  newsItems: NewsItem[]; dartItems: DartItem[]; financials: FinanceRow[]
  stockInfo?: StockInfo | null
}

type CompanySearchResult = {
  corp_code: string; corp_name: string; stock_code: string
  listed: boolean; ceo_nm?: string; corp_cls?: string; induty_code?: string
}

/* ──────── Helpers ──────── */
function formatDartDate(v: string) {
  if (!v || v.length !== 8) return v
  return `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6, 8)}`
}

function formatAmount(v: string) {
  if (!v || v === '-') return '-'
  const n = Number(v.replace(/,/g, ''))
  if (Number.isNaN(n)) return v
  // Convert to 백만원 (millions)
  const millions = Math.round(n / 1_000_000)
  return millions.toLocaleString('ko-KR')
}

/* ──────── Main Page ──────── */
export default function NewsPage() {
  const [data, setData] = useState<FeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* DART 검색 필터 */
  const [corpName, setCorpName] = useState('동양')
  const [corpCode, setCorpCode] = useState('')
  const [stockCode, setStockCode] = useState('')
  const [bgnDe, setBgnDe] = useState('')
  const [endDe, setEndDe] = useState('')
  const [showSearchPopup, setShowSearchPopup] = useState(false)

  const loadFeed = useCallback(
    async (overrides?: { name?: string; code?: string; stock?: string }) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('corp_name', overrides?.name ?? corpName)
      if (overrides?.code ?? corpCode) params.set('corp_code', overrides?.code ?? corpCode)
      if (overrides?.stock ?? stockCode) params.set('stock_code', overrides?.stock ?? stockCode)
      if (bgnDe) params.set('bgn_de', bgnDe)
      if (endDe) params.set('end_de', endDe)

      try {
        const response = await fetch(`/api/news-feed?${params}`, { cache: 'no-store' })
        const payload = (await response.json()) as FeedResponse & { error?: string }
        if (!response.ok || !payload.ok) throw new Error(payload.error ?? '데이터를 불러오지 못했습니다.')
        setData(payload)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    },
    [corpName, corpCode, stockCode, bgnDe, endDe],
  )

  useEffect(() => {
    void loadFeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDartSearch(e: React.FormEvent) {
    e.preventDefault()
    loadFeed()
  }

  function handleCompanySelect(result: CompanySearchResult) {
    setCorpName(result.corp_name)
    setCorpCode(result.corp_code)
    setStockCode(result.stock_code)
    setShowSearchPopup(false)
    loadFeed({ name: result.corp_name, code: result.corp_code, stock: result.stock_code })
  }

  /* 계열사 정보 (corp_code, stock_code 포함) - 상장사 우선 */
  const AFFILIATES: { name: string; corp_code: string; stock_code: string }[] = [
    { name: '동양', corp_code: '00117337', stock_code: '001520' },
    { name: '유진기업', corp_code: '00184667', stock_code: '023410' },
    { name: '유진투자증권', corp_code: '00130608', stock_code: '001200' },
    { name: 'YTN', corp_code: '00200275', stock_code: '040300' },
    { name: '티엑스알로보틱스', corp_code: '01458161', stock_code: '484810' },
    { name: '한일합섬', corp_code: '01569856', stock_code: '' },
    { name: '유진홈센터', corp_code: '00856931', stock_code: '' },
    { name: '금왕에프원', corp_code: '01718540', stock_code: '' },
    { name: '유진리츠운용', corp_code: '01934917', stock_code: '' },
    { name: '유진이엔티', corp_code: '01795868', stock_code: '' },
  ]

  function handleAffiliateClick(aff: { name: string; corp_code: string; stock_code: string }) {
    setCorpName(aff.name.replace('㈜', ''))
    setCorpCode(aff.corp_code)
    setStockCode(aff.stock_code)
    loadFeed({ name: aff.name.replace('㈜', ''), code: aff.corp_code, stock: aff.stock_code })
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">Live Feed<span className="sep" />공시 · 주가 · 뉴스</div>
            <h1>뉴스 · 공시 · 재무. <span className="soft">숫자와 흐름을 한 번에.</span></h1>
            <p className="lead">DART 공시, 실시간 주가, 재무제표, 네이버 금융 뉴스를 통합 조회합니다.</p>
          </div>
          {/* 상단 큰 "새로 고침" 버튼 제거 — 탭별 새로고침은 하단 NewsTabs에 이미 존재 */}
        </div>
      </div>

      <div className="pg-body">
      {/* Main grid: DART left, News right */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ───── LEFT: DART 공시 ───── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-700" />
            <h2 className="text-lg font-bold text-brand-900">DART 공시</h2>
            {data?.corpName && <span className="badge-blue text-xs">{data.corpName}</span>}
          </div>

          {/* 검색 필터 */}
          <form onSubmit={handleDartSearch} className="rounded-lg border border-sky-200 bg-white p-4 shadow-sm">
            {/* 계열사 빠른 선택 */}
            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] font-semibold text-warm-500">계열사 바로가기</label>
              <div className="flex flex-wrap gap-1.5">
                {AFFILIATES.map(aff => (
                  <button
                    key={aff.name}
                    type="button"
                    onClick={() => handleAffiliateClick(aff)}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      (corpCode === aff.corp_code || (!corpCode && corpName === aff.name.replace('㈜', '')))
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
                    )}
                  >
                    {aff.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-warm-500">회사명</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400" />
                  <input
                    type="text"
                    value={corpName}
                    readOnly
                    onClick={() => setShowSearchPopup(true)}
                    placeholder="회사명찾기를 클릭하세요"
                    className="form-input pl-8 pr-20 text-sm cursor-pointer bg-warm-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSearchPopup(true)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-sky-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-sky-700 transition"
                  >
                    회사명찾기
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-warm-500">시작일</label>
                <input type="date" value={bgnDe} onChange={e => setBgnDe(e.target.value)} className="form-input text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-warm-500">종료일</label>
                <input type="date" value={endDe} onChange={e => setEndDe(e.target.value)} className="form-input text-sm" />
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  조회
                </button>
              </div>
            </div>
          </form>

          {/* 주가 정보 (상장사) */}
          {data?.stockInfo && <StockInfoCard info={data.stockInfo} />}

          {/* 공시 목록 */}
          <div className="overflow-hidden rounded-lg bg-sky-50 border border-sky-200 shadow-md">
            <div className="border-b border-sky-200 bg-sky-100 px-5 py-3">
              <p className="text-sm font-bold text-sky-900">
                {data?.corpName ?? '동양'} 공시 ({data?.dartItems.length ?? 0}건)
              </p>
            </div>

            {loading && !data ? (
              <div className="flex items-center justify-center py-12 text-sky-400">
                <Loader2 size={20} className="animate-spin mr-2" />
                로딩 중...
              </div>
            ) : (
              <div className="divide-y divide-sky-100 max-h-[500px] overflow-y-auto">
                {(data?.dartItems ?? []).map(item => (
                  <a
                    key={item.rcept_no}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3 px-5 py-3 bg-white hover:bg-sky-50 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sky-700">{item.corp_name}</p>
                      <p className="mt-0.5 text-sm font-medium leading-5 text-brand-900 truncate">{item.report_nm}</p>
                      <p className="mt-0.5 text-[11px] text-warm-500">
                        {formatDartDate(item.rcept_dt)}
                        {item.rm ? ` · ${item.rm}` : ''}
                      </p>
                    </div>
                    <ExternalLink size={14} className="mt-1 shrink-0 text-sky-400 transition group-hover:text-sky-700" />
                  </a>
                ))}
                {data && data.dartItems.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-warm-400">조회 결과가 없습니다.</div>
                )}
              </div>
            )}

            <div className="border-t border-sky-200 bg-sky-50 px-5 py-3">
              <a
                href={data?.dartAllUrl ?? 'https://dart.fss.or.kr/'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 transition hover:text-sky-900"
              >
                DART에서 전체보기 <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* 재무제표 요약 */}
          {(data?.financials ?? []).length > 0 && (
            <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-900">
                <BarChart3 size={16} className="text-sky-600" />
                {data?.corpName} 주요 재무지표
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-sky-100 text-left text-[11px] font-semibold text-warm-500">
                      <th className="py-2 pr-4">항목</th>
                      <th className="py-2 pr-4 text-right">당기</th>
                      <th className="py-2 pr-4 text-right">전기</th>
                      <th className="py-2 text-right">전전기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.financials ?? []).map((r, i) => {
                      const isNegative = (v: string) => {
                        const n = Number(v.replace(/,/g, ''))
                        return !Number.isNaN(n) && n < 0
                      }
                      return (
                        <tr key={i} className="border-b border-warm-50 hover:bg-sky-50/50 transition">
                          <td className="py-2.5 pr-4 font-semibold text-brand-800 text-xs">{r.account_nm}</td>
                          <td className={clsx('py-2.5 pr-4 text-right font-bold text-xs', isNegative(r.thstrm_amount) ? 'text-red-600' : 'text-brand-900')}>
                            {formatAmount(r.thstrm_amount)}
                          </td>
                          <td className={clsx('py-2.5 pr-4 text-right text-xs', isNegative(r.frmtrm_amount) ? 'text-red-500' : 'text-warm-500')}>
                            {formatAmount(r.frmtrm_amount)}
                          </td>
                          <td className={clsx('py-2.5 text-right text-xs', isNegative(r.bfefrmtrm_amount) ? 'text-red-400' : 'text-warm-400')}>
                            {formatAmount(r.bfefrmtrm_amount)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-warm-400">
                출처: DART 전자공시 (연결재무제표 우선, 개별재무제표 폴백 / 단위: 백만원)
              </p>
            </div>
          )}
        </section>

        {/* ───── RIGHT: 뉴스 4탭 ───── */}
        <NewsTabs newsItems={data?.newsItems ?? []} refreshedAt={data?.refreshedAt} loading={loading && !data} error={error} />
      </div>

      {/* 회사명찾기 팝업 */}
      {showSearchPopup && (
        <CompanySearchPopup
          initialQuery={corpName}
          onSelect={handleCompanySelect}
          onClose={() => setShowSearchPopup(false)}
        />
      )}
      </div>
    </>
  )
}

/* ──────── 주가 정보 카드 ──────── */
function StockInfoCard({ info }: { info: StockInfo }) {
  const isNeg = info.change.startsWith('-')
  const isPos = info.change.startsWith('+')

  // Mini price range chart (52-week)
  const parsePriceNum = (v: string) => Number(v.replace(/,/g, '').replace(/원/g, ''))
  const low = parsePriceNum(info.low52w || '0')
  const high = parsePriceNum(info.high52w || '0')
  const cur = parsePriceNum(info.price || '0')
  const range = high - low
  const pct = range > 0 ? Math.max(0, Math.min(100, ((cur - low) / range) * 100)) : 50

  return (
    <div className="rounded-lg border border-warm-200 bg-gradient-to-br from-white to-warm-50 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-sky-600" />
          {info.name || '주가 정보'}
        </h3>
        <div className="text-right">
          <p className="text-xl font-bold text-brand-900">{info.price || '-'}<span className="text-xs text-warm-400 ml-1">원</span></p>
          {info.change && (
            <p className={clsx('text-xs font-bold', isNeg ? 'text-blue-600' : isPos ? 'text-red-600' : 'text-warm-500')}>
              {info.change} ({info.changeRate})
            </p>
          )}
        </div>
      </div>

      {/* 52-week mini price chart */}
      {info.high52w && info.low52w && (
        <div className="mb-3 rounded-xl bg-white border border-warm-100 p-3">
          <p className="text-[10px] font-semibold text-warm-400 mb-2">52주 가격범위</p>
          <div className="relative h-6">
            {/* Background bar */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-blue-100 via-warm-100 to-red-100" />
            {/* Current position marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${pct}%` }}
            >
              <div className={clsx(
                'w-4 h-4 rounded-full border-2 shadow-md',
                isPos ? 'bg-red-500 border-red-300' : isNeg ? 'bg-blue-500 border-blue-300' : 'bg-warm-500 border-warm-300'
              )} />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-blue-500 font-semibold">{info.low52w}</span>
            <span className="text-[10px] text-warm-400 font-semibold">현재 {Math.round(pct)}%</span>
            <span className="text-[10px] text-red-500 font-semibold">{info.high52w}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: '시가총액', value: info.marketCap },
          { label: 'PER', value: info.per },
          { label: 'PBR', value: info.pbr },
          { label: '배당수익률', value: info.dividendYield },
          { label: '52주 최고', value: info.high52w },
          { label: '52주 최저', value: info.low52w },
          { label: '거래량', value: info.volume },
        ]
          .filter(x => x.value)
          .map((x, i) => (
            <div key={i} className="rounded-lg bg-white border border-warm-100 px-3 py-2">
              <p className="text-[10px] font-semibold text-warm-400">{x.label}</p>
              <p className="text-xs font-bold text-brand-800 mt-0.5">{x.value}</p>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ──────── 회사명찾기 팝업 ──────── */
function CompanySearchPopup({
  initialQuery,
  onSelect,
  onClose,
}: {
  initialQuery: string
  onSelect: (r: CompanySearchResult) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setSearching(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/dart-company-search?query=${encodeURIComponent(q.trim())}`, { cache: 'no-store' })
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  function handleInputChange(value: string) {
    setQuery(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 400)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    doSearch(query)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg bg-white shadow-md border border-warm-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-warm-200 bg-sky-50 px-5 py-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-sky-900">
            <Building2 size={20} />
            회사명 찾기 (DART)
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-200 hover:text-warm-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 p-4 border-b border-warm-100">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="회사명을 입력하세요 (예: 삼성전자, 한일합섬)"
              className="w-full rounded-xl border border-warm-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 transition disabled:opacity-50"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : '검색'}
          </button>
        </form>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {searching ? (
            <div className="flex items-center justify-center py-12 text-sky-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              DART 법인 데이터에서 검색 중...
            </div>
          ) : results.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-warm-50 border-b border-warm-200">
                <tr className="text-left text-[11px] font-semibold text-warm-500">
                  <th className="px-4 py-2.5">회사명</th>
                  <th className="px-4 py-2.5">대표자</th>
                  <th className="px-4 py-2.5">종목코드</th>
                  <th className="px-4 py-2.5">법인코드</th>
                  <th className="px-4 py-2.5">상장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r, i) => (
                  <tr
                    key={`${r.corp_code}-${i}`}
                    onClick={() => onSelect(r)}
                    className="cursor-pointer hover:bg-sky-50 transition"
                  >
                    <td className="px-4 py-2.5 font-bold text-brand-900">{r.corp_name}</td>
                    <td className="px-4 py-2.5 text-warm-600">{r.ceo_nm || '-'}</td>
                    <td className="px-4 py-2.5 text-warm-600 font-mono text-xs">{r.stock_code || '-'}</td>
                    <td className="px-4 py-2.5 text-warm-400 font-mono text-[11px]">{r.corp_code}</td>
                    <td className="px-4 py-2.5">
                      {r.listed ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">상장</span>
                      ) : (
                        <span className="inline-block rounded-full bg-warm-100 px-2 py-0.5 text-[10px] font-bold text-warm-500">비상장</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : searched ? (
            <div className="py-12 text-center text-sm text-warm-400">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-warm-400">
              회사명을 입력하면 DART에 등록된 약 90,000개 법인에서 검색합니다.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-warm-200 bg-warm-50 px-5 py-3 text-[11px] text-warm-400">
          출처: DART 전자공시시스템 법인 코드 데이터
        </div>
      </div>
    </div>
  )
}

/* ──────── 뉴스 4탭 ──────── */
type NewsTabItem = { id: string; title: string; url: string }
const NEWS_TABS = [
  { key: 'finance', label: '금융', query: '금융+주식+증시+경제' },
  { key: 'remicon', label: '레미콘', query: '레미콘+레디믹스트+콘크리트+시멘트+골재' },
  { key: 'construction', label: '건설', query: '건설+건축+토목+시공+산업+인프라' },
  { key: 'plant', label: '플랜트·환경', query: '플랜트+산업용송풍기+환경설비+집진기+배기가스+소각로' },
] as const

function NewsTabs({
  newsItems,
  refreshedAt,
  loading,
  error,
}: {
  newsItems: NewsItem[]
  refreshedAt?: string
  loading: boolean
  error: string | null
}) {
  const [tab, setTab] = useState<string>('finance')
  const [tabNews, setTabNews] = useState<Record<string, NewsTabItem[]>>({})
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (newsItems.length > 0) {
      setTabNews(prev => ({ ...prev, finance: newsItems.map(n => ({ id: n.id, title: n.title, url: n.url })) }))
    }
  }, [newsItems])

  useEffect(() => {
    if (tab === 'finance' || tabNews[tab]) return
    setTabLoading(prev => ({ ...prev, [tab]: true }))
    const tabDef = NEWS_TABS.find(t => t.key === tab)
    if (!tabDef) return

    fetch(`/api/news-feed?news_query=${encodeURIComponent(tabDef.query)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: FeedResponse) => {
        setTabNews(prev => ({
          ...prev,
          [tab]: (d.newsItems ?? []).map(n => ({ id: n.id, title: n.title, url: n.url })),
        }))
      })
      .catch(() => {
        setTabNews(prev => ({ ...prev, [tab]: [] }))
      })
      .finally(() => {
        setTabLoading(prev => ({ ...prev, [tab]: false }))
      })
  }, [tab, tabNews])

  const currentItems = tabNews[tab] ?? []
  const isLoading = tab === 'finance' ? loading : (tabLoading[tab] ?? false)

  function refreshCurrentTab() {
    // 현재 탭의 캐시를 비우면 useEffect가 자동 재요청 → 강제 새로고침 효과
    setTabNews(prev => {
      const next = { ...prev }
      delete next[tab]
      return next
    })
    // finance는 상위 loadFeed()가 주기적으로 전달. tab 전환 시 재요청됨.
    setTabLoading(prev => ({ ...prev, [tab]: true }))
    const tabDef = NEWS_TABS.find(t => t.key === tab)
    if (!tabDef) return
    fetch(`/api/news-feed?news_query=${encodeURIComponent(tabDef.query)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: FeedResponse) => {
        setTabNews(prev => ({
          ...prev,
          [tab]: (d.newsItems ?? []).map(n => ({ id: n.id, title: n.title, url: n.url })),
        }))
      })
      .catch(() => {
        setTabNews(prev => ({ ...prev, [tab]: [] }))
      })
      .finally(() => {
        setTabLoading(prev => ({ ...prev, [tab]: false }))
      })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-900">News &amp; Coverage</h2>
        <div className="flex items-center gap-3">
          {refreshedAt && (
            <p className="text-[11px] text-warm-400">{new Date(refreshedAt).toLocaleString('ko-KR')}</p>
          )}
          <button
            type="button"
            onClick={refreshCurrentTab}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-warm-200 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:border-brand-300 disabled:opacity-50"
            title="현재 탭 새로고침"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 rounded-xl bg-warm-100 p-1">
        {NEWS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
              tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-warm-500 hover:text-brand-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {error && tab === 'finance' ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card px-4 py-2.5">
              <div className="skeleton h-4 w-4/5 rounded" />
              <div className="mt-2 skeleton h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {currentItems.slice(0, 30).map((item, i) => (
            <a
              key={item.id + '-' + i}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-warm-100 bg-white px-4 py-2 transition hover:border-brand-100 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-5 text-brand-900 transition group-hover:text-brand-700 line-clamp-1">
                  {item.title}
                </h3>
              </div>
              <ExternalLink size={13} className="mt-0.5 shrink-0 text-warm-300 transition group-hover:text-brand-700" />
            </a>
          ))}
          {currentItems.length === 0 && (
            <div className="text-center py-8 text-sm text-warm-400">뉴스가 없습니다.</div>
          )}
        </div>
      )}
    </section>
  )
}
