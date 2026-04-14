/// <reference types="node" />

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

type FinanceRow = {
  account_nm: string
  thstrm_amount: string
  frmtrm_amount: string
  bfefrmtrm_amount: string
}

const DART_API_KEY = process.env.VITE_DART_API_KEY ?? process.env.DART_API_KEY

/* 동양 계열사 및 주요 기업 코드 */
const KNOWN_CORPS: Record<string, string> = {
  '동양': '00117337',
  '동양물산': '00155282',
  '동양생명': '00266965',
  '동양파일': '00351863',
  '동양시멘트': '00126217',
  '동양매직': '00103740',
  '삼성전자': '00126380',
  '현대자동차': '00164742',
  'SK하이닉스': '00164779',
  'LG에너지솔루션': '01637396',
  'NAVER': '00266961',
  '카카오': '00258801',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function decodeHtml(input: string) {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '...')
    .replace(/&middot;/g, '·')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]+>/g, '')
    .trim()
}

async function fetchNaverFinanceNews(): Promise<NewsItem[]> {
  const response = await fetch('https://finance.naver.com/news/mainnews.naver', {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(`naver_finance_failed:${response.status}`)

  const buffer = await response.arrayBuffer()
  const html = new TextDecoder('euc-kr').decode(buffer)
  const regex = /<a href="(\/news\/news_read\.naver\?article_id=[^"]+)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g

  const items: NewsItem[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(html)) && items.length < 12) {
    const href = match[1]
    const rawTitle = match[2] || match[3]
    const title = decodeHtml(rawTitle)
    if (!title || title.length < 4 || seen.has(href)) continue
    seen.add(href)

    const articleId = href.match(/article_id=([0-9]+)/)?.[1] ?? `naver-${items.length + 1}`
    items.push({
      id: articleId,
      title,
      summary: '',
      source: '네이버 금융',
      date: new Date().toISOString().slice(0, 10),
      url: `https://finance.naver.com${href}`,
    })
  }

  return items
}

async function fetchNaverSearchNews(query: string): Promise<NewsItem[]> {
  const encodedQuery = encodeURIComponent(query)
  const response = await fetch(`https://search.naver.com/search.naver?where=news&query=${encodedQuery}&sort=1`, {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    cache: 'no-store',
  })
  if (!response.ok) return []

  const html = await response.text()
  // Match news titles and URLs from Naver search results
  const regex = /<a[^>]*class="news_tit"[^>]*href="([^"]+)"[^>]*title="([^"]+)"/g
  const items: NewsItem[] = []
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(html)) && items.length < 10) {
    const url = match[1]
    const title = decodeHtml(match[2])
    if (!title || title.length < 4) continue
    items.push({
      id: `search-${items.length}`,
      title,
      summary: '',
      source: '네이버 검색',
      date: new Date().toISOString().slice(0, 10),
      url,
    })
  }
  return items
}

async function lookupCorpCode(corpName: string): Promise<string | null> {
  const known = KNOWN_CORPS[corpName]
  if (known) return known

  // Try exact match from DART API
  if (!DART_API_KEY) return null
  try {
    const res = await fetch(`https://opendart.fss.or.kr/api/company.json?crtfc_key=${DART_API_KEY}&corp_name=${encodeURIComponent(corpName)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status === '000' && data.corp_code) return data.corp_code
  } catch { /* ignore */ }

  // Try partial match from known corps
  for (const [name, code] of Object.entries(KNOWN_CORPS)) {
    if (name.includes(corpName) || corpName.includes(name)) return code
  }
  return null
}

async function fetchDartDisclosures(corpCode: string, bgnDe?: string, endDe?: string, pageCount = 10): Promise<DartItem[]> {
  if (!DART_API_KEY) return []

  const today = new Date()
  const end = endDe?.replace(/-/g, '') ?? today.toISOString().slice(0, 10).replace(/-/g, '')
  const begin = bgnDe?.replace(/-/g, '') ?? new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10).replace(/-/g, '')

  const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bgn_de=${begin}&end_de=${end}&page_count=${pageCount}&sort=date&sort_mth=desc`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) return []

  const payload = await response.json()
  if (payload.status !== '000') return []

  return (payload.list ?? []).map((item: Omit<DartItem, 'url'>) => ({
    ...item,
    url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
  }))
}

async function fetchFinancials(corpCode: string): Promise<FinanceRow[]> {
  if (!DART_API_KEY) return []

  const year = new Date().getFullYear() - 1
  // Try annual report (11011), then semi-annual (11012), then Q1 (11013)
  for (const reprtCode of ['11011', '11012', '11013', '11014']) {
    try {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}&fs_div=OFS`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      if (data.status === '000' && data.list?.length > 0) {
        return data.list.map((r: any) => ({
          account_nm: r.account_nm ?? '',
          thstrm_amount: r.thstrm_amount ?? '-',
          frmtrm_amount: r.frmtrm_amount ?? '-',
          bfefrmtrm_amount: r.bfefrmtrm_amount ?? '-',
        }))
      }
    } catch { /* try next */ }
  }
  return []
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    /* ── 뉴스 검색 전용 경로 ── */
    const newsQuery = url.searchParams.get('news_query')
    if (newsQuery) {
      const newsItems = await fetchNaverSearchNews(newsQuery).catch(() => [])
      return json({
        ok: true,
        refreshedAt: new Date().toISOString(),
        corpName: '',
        corpCode: '',
        dartAllUrl: '',
        newsItems,
        dartItems: [],
        financials: [],
      })
    }

    /* ── 기본 경로: DART 공시 + 네이버 금융 뉴스 ── */
    const corpNameParam = url.searchParams.get('corp_name') || '동양'
    const bgnDe = url.searchParams.get('bgn_de') || undefined
    const endDe = url.searchParams.get('end_de') || undefined

    const corpCode = await lookupCorpCode(corpNameParam) ?? '00117337'
    const dartAllUrl = `https://dart.fss.or.kr/dsab001/main.do?option=corp&textCrpNm=${encodeURIComponent(corpNameParam)}`

    const [newsItems, dartItems, financials] = await Promise.all([
      fetchNaverFinanceNews().catch(() => []),
      fetchDartDisclosures(corpCode, bgnDe, endDe).catch(() => []),
      fetchFinancials(corpCode).catch(() => []),
    ])

    return json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      corpName: corpNameParam,
      corpCode,
      dartAllUrl,
      newsItems,
      dartItems,
      financials,
    })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
}
