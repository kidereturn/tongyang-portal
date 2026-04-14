import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Newspaper, RefreshCw, Search, TrendingUp } from 'lucide-react'

type NewsItem = {
  id: string
  title: string
  source: string
  date: string
  url: string
}

type DartItem = {
  corp_name: string
  report_nm: string
  rcept_dt: string
  rm: string
  rcept_no: string
  url: string
}

type FinanceRow = {
  account_nm: string
  thstrm_amount: string
  frmtrm_amount: string
  bfefrmtrm_amount: string
}

type FeedResponse = {
  ok: boolean
  refreshedAt: string
  corpName: string
  corpCode: string
  dartAllUrl: string
  newsItems: NewsItem[]
  dartItems: DartItem[]
  financials: FinanceRow[]
}

function formatDartDate(v: string) {
  if (!v || v.length !== 8) return v
  return `${v.slice(0, 4)}.${v.slice(4, 6)}.${v.slice(6, 8)}`
}

function formatAmount(v: string) {
  if (!v || v === '-') return '-'
  const n = Number(v.replace(/,/g, ''))
  if (Number.isNaN(n)) return v
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}억`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString()
}

export default function NewsPage() {
  const [data, setData] = useState<FeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* DART 검색 필터 */
  const [corpName, setCorpName] = useState('동양')
  const [bgnDe, setBgnDe] = useState('')
  const [endDe, setEndDe] = useState('')

  async function loadFeed(searchCorpName?: string) {
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('corp_name', searchCorpName ?? corpName)
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
  }

  useEffect(() => { void loadFeed() }, [])

  function handleDartSearch(e: React.FormEvent) {
    e.preventDefault()
    loadFeed()
  }

  /* 재무제표 주요 항목 필터 */
  const KEY_ACCOUNTS = ['자산총계', '부채총계', '자본총계', '매출액', '영업이익', '당기순이익']
  const keyFinancials = (data?.financials ?? []).filter(r => KEY_ACCOUNTS.some(k => r.account_nm.includes(k)))

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">LIVE FEED</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
              <Newspaper size={28} className="text-brand-300" />
              뉴스 · 공시
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              DART 공시와 네이버 금융 뉴스를 실시간 조회합니다.
            </p>
          </div>
          <button
            onClick={() => loadFeed()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로 고침
          </button>
        </div>
      </div>

      {/* Main grid: DART left, News right */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ───── LEFT: DART 공시 ───── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="text-lg font-black text-slate-900">DART 공시</h2>
            {data?.corpName && (
              <span className="badge-blue text-xs">{data.corpName}</span>
            )}
          </div>

          {/* 검색 필터 */}
          <form onSubmit={handleDartSearch} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">회사명</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={corpName}
                    onChange={e => setCorpName(e.target.value)}
                    placeholder="동양"
                    className="form-input pl-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">시작일</label>
                <input type="date" value={bgnDe} onChange={e => setBgnDe(e.target.value)} className="form-input text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">종료일</label>
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

          {/* 공시 목록 */}
          <div className="overflow-hidden rounded-2xl bg-sky-50 border border-sky-200 shadow-lg">
            <div className="border-b border-sky-200 bg-sky-100 px-5 py-3">
              <p className="text-sm font-bold text-sky-900">
                {data?.corpName ?? '동양'} 공시 ({data?.dartItems.length ?? 0}건)
              </p>
            </div>

            {loading && !data ? (
              <div className="flex items-center justify-center py-12 text-sky-400">
                <Loader2 size={20} className="animate-spin mr-2" />로딩 중...
              </div>
            ) : (
              <div className="divide-y divide-sky-100">
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
                      <p className="mt-0.5 text-sm font-medium leading-5 text-slate-900 truncate">{item.report_nm}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatDartDate(item.rcept_dt)}
                        {item.rm ? ` · ${item.rm}` : ''}
                      </p>
                    </div>
                    <ExternalLink size={14} className="mt-1 shrink-0 text-sky-400 transition group-hover:text-sky-700" />
                  </a>
                ))}
                {data && data.dartItems.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-slate-400">조회 결과가 없습니다.</div>
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
          {keyFinancials.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-black text-slate-900">
                {data?.corpName} 주요 재무지표 ({new Date().getFullYear() - 1}년)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-500">
                      <th className="py-2 pr-4">항목</th>
                      <th className="py-2 pr-4 text-right">당기</th>
                      <th className="py-2 pr-4 text-right">전기</th>
                      <th className="py-2 text-right">전전기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyFinancials.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50 text-xs">
                        <td className="py-2 pr-4 font-medium text-slate-800">{r.account_nm}</td>
                        <td className="py-2 pr-4 text-right font-bold text-slate-900">{formatAmount(r.thstrm_amount)}</td>
                        <td className="py-2 pr-4 text-right text-slate-500">{formatAmount(r.frmtrm_amount)}</td>
                        <td className="py-2 text-right text-slate-400">{formatAmount(r.bfefrmtrm_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">출처: DART 전자공시 (개별재무제표 기준, 단위: 원)</p>
            </div>
          )}
        </section>

        {/* ───── RIGHT: 네이버 뉴스 ───── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">금융 뉴스</h2>
            {data?.refreshedAt && (
              <p className="text-[11px] text-slate-400">
                {new Date(data.refreshedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          {loading && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card px-4 py-3">
                  <div className="skeleton h-4 w-4/5 rounded" />
                  <div className="mt-2 skeleton h-3 w-1/3 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">{error}</div>
          ) : (
            <div className="space-y-1.5">
              {data?.newsItems.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-2.5 transition hover:border-brand-100 hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold leading-5 text-slate-900 transition group-hover:text-brand-700 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">{item.source} · {item.date}</p>
                  </div>
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
                </a>
              ))}
              {data?.newsItems.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">뉴스를 불러올 수 없습니다.</div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
