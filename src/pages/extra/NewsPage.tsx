import { useEffect, useState } from 'react'
import { ExternalLink, Newspaper, RefreshCw, TrendingUp } from 'lucide-react'

type NewsItem = {
  id: string
  title: string
  summary: string
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

type FeedResponse = {
  ok: boolean
  refreshedAt: string
  refreshMode: string
  refreshDescription: string
  dartAllUrl: string
  newsItems: NewsItem[]
  dartItems: DartItem[]
}

function formatDartDate(value: string) {
  if (!value || value.length !== 8) return value
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

export default function NewsPage() {
  const [data, setData] = useState<FeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadFeed() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/news-feed', { cache: 'no-store' })
      const payload = (await response.json()) as FeedResponse & { error?: string }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? '뉴스를 불러오지 못했습니다.')
      }
      setData(payload)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : String(fetchError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFeed()
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">LIVE FEED</p>
            <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
              <Newspaper size={28} className="text-brand-300" />
              뉴스 분석
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              네이버 금융 뉴스와 DART 공시를 서버에서 직접 조회합니다. 이제 브라우저 CORS 제한 문구 없이
              실제 링크로 이동할 수 있고, 새로 고침을 누를 때마다 최신 데이터를 다시 가져옵니다.
            </p>
          </div>

          <button
            onClick={() => void loadFeed()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로 고침
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">네이버 금융 뉴스</h2>
            {data?.refreshedAt && (
              <p className="text-xs text-slate-400">
                업데이트 {new Date(data.refreshedAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="card p-5">
                  <div className="skeleton h-4 w-16 rounded" />
                  <div className="mt-3 skeleton h-6 w-4/5 rounded" />
                  <div className="mt-3 skeleton h-4 w-full rounded" />
                  <div className="mt-2 skeleton h-4 w-2/3 rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-red-100 bg-red-50 p-6 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="grid gap-4">
              {data?.newsItems.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="badge-blue">{item.source}</span>
                      <h3 className="mt-3 text-lg font-black leading-7 text-slate-900 transition group-hover:text-brand-700">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-500">{item.summary}</p>
                      <p className="mt-3 text-xs text-slate-400">{item.date}</p>
                    </div>
                    <ExternalLink size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="text-lg font-black text-slate-900">DART 공시</h2>
          </div>

          <div className="overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-2xl">
            <div className="border-b border-white/10 px-5 py-4">
              <p className="text-sm font-bold text-white">실제 공시 링크 연결</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                화면 진입 시 조회하고, 새로 고침 버튼을 누르면 다시 가져옵니다. 완전 실시간 스트리밍은 아니고
                수동 새로 고침형 실시간 조회에 가깝습니다.
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {(data?.dartItems ?? []).map(item => (
                <a
                  key={item.rcept_no}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block px-5 py-4 transition hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold leading-6 text-white">{item.report_nm}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDartDate(item.rcept_dt)}
                        {item.rm ? ` · 비고 ${item.rm}` : ''}
                      </p>
                    </div>
                    <ExternalLink size={15} className="mt-1 shrink-0 text-slate-500 transition group-hover:text-brand-300" />
                  </div>
                </a>
              ))}
            </div>

            <div className="border-t border-white/10 px-5 py-4">
              <a
                href={data?.dartAllUrl ?? 'https://dart.fss.or.kr/'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-300 transition hover:text-white"
              >
                DART에서 전체보기
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
