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

const DART_API_KEY = process.env.VITE_DART_API_KEY ?? process.env.DART_API_KEY
const DART_CORP_CODE = '00117337'
const DART_COMPANY_NAME = '동양'
const DART_ALL_URL = `https://dart.fss.or.kr/dsab001/main.do?option=corp&textCrpNm=${encodeURIComponent(DART_COMPANY_NAME)}`

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
    .replace(/<[^>]+>/g, '')
    .trim()
}

async function fetchNaverFinanceNews(): Promise<NewsItem[]> {
  const response = await fetch('https://finance.naver.com/news/mainnews.naver', {
    headers: {
      'user-agent': 'Mozilla/5.0',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`naver_finance_failed:${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const html = new TextDecoder('euc-kr').decode(buffer)
  const regex = /<a href="(\/news\/news_read\.naver\?article_id=[^"]+)" title="([^"]+)">([\s\S]*?)<\/a>/g

  const items: NewsItem[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null = null

  while ((match = regex.exec(html)) && items.length < 10) {
    const href = match[1]
    const title = decodeHtml(match[2] || match[3])
    if (!title || seen.has(href)) continue
    seen.add(href)

    const articleId = href.match(/article_id=([0-9]+)/)?.[1] ?? `naver-${items.length + 1}`
    items.push({
      id: articleId,
      title,
      summary: '네이버 금융 메인 뉴스에서 수집한 최신 기사입니다.',
      source: '네이버 금융',
      date: new Date().toISOString().slice(0, 10),
      url: `https://finance.naver.com${href}`,
    })
  }

  return items
}

async function fetchDartDisclosures(): Promise<DartItem[]> {
  if (!DART_API_KEY) {
    return []
  }

  const today = new Date()
  const end = today.toISOString().slice(0, 10).replace(/-/g, '')
  const begin = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')

  const url = `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}&corp_code=${DART_CORP_CODE}&bgn_de=${begin}&end_de=${end}&page_count=8&sort=date&sort_mth=desc`
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`dart_failed:${response.status}`)
  }

  const payload = await response.json()
  if (payload.status !== '000') {
    throw new Error(payload.message ?? 'dart_unknown_error')
  }

  return (payload.list ?? []).map((item: Omit<DartItem, 'url'>) => ({
    ...item,
    url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
  }))
}

export async function GET() {
  try {
    const [newsItems, dartItems] = await Promise.all([
      fetchNaverFinanceNews(),
      fetchDartDisclosures().catch(() => []),
    ])

    return json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      refreshMode: 'manual-refresh-live',
      refreshDescription: '새로 고침 시 네이버 금융과 DART를 다시 조회합니다.',
      dartAllUrl: DART_ALL_URL,
      newsItems,
      dartItems,
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
}
