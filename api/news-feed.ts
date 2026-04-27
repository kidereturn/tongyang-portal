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

type StockInfo = {
  name: string
  price: string
  change: string
  changeRate: string
  marketCap: string
  per: string
  pbr: string
  dividendYield: string
  high52w: string
  low52w: string
  volume: string
}

const DART_API_KEY = process.env.VITE_DART_API_KEY ?? process.env.DART_API_KEY

/* 동양 계열사 및 주요 기업 코드 */
const KNOWN_CORPS: Record<string, { corp_code: string; stock_code: string }> = {
  '동양': { corp_code: '00117337', stock_code: '001520' },
  '한일합섬': { corp_code: '01569856', stock_code: '' },
  '유진홈센터': { corp_code: '00856931', stock_code: '' },
  '금왕에프원': { corp_code: '01718540', stock_code: '' },
  '유진리츠운용': { corp_code: '01934917', stock_code: '' },
  '유진이엔티': { corp_code: '01795868', stock_code: '' },
  '유진기업': { corp_code: '00184667', stock_code: '023410' },
  '동양물산': { corp_code: '00155282', stock_code: '' },
  '동양생명': { corp_code: '00266965', stock_code: '' },
  '동양파일': { corp_code: '00351863', stock_code: '' },
  '동양시멘트': { corp_code: '00126217', stock_code: '' },
  '동양매직': { corp_code: '00103740', stock_code: '' },
  '삼성전자': { corp_code: '00126380', stock_code: '005930' },
  '현대자동차': { corp_code: '00164742', stock_code: '005380' },
  'SK하이닉스': { corp_code: '00164779', stock_code: '000660' },
  'LG에너지솔루션': { corp_code: '01637396', stock_code: '373220' },
  'NAVER': { corp_code: '00266961', stock_code: '035420' },
  '카카오': { corp_code: '00258801', stock_code: '035720' },
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

async function fetchFinanceNews(): Promise<NewsItem[]> {
  const items: NewsItem[] = []
  const seen = new Set<string>()

  // 1) 네이버 금융 뉴스 시도
  try {
    const response = await fetch('https://finance.naver.com/news/mainnews.naver', {
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'no-store',
    })
    if (response.ok) {
      const buffer = await response.arrayBuffer()
      const html = new TextDecoder('euc-kr').decode(buffer)
      const regex = /<a href="(\/news\/news_read\.naver\?article_id=[^"]+)"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
      let match: RegExpExecArray | null = null
      while ((match = regex.exec(html)) && items.length < 30) {
        const href = match[1]
        const rawTitle = match[2] || match[3]
        const title = decodeHtml(rawTitle)
        if (!title || title.length < 4 || seen.has(title)) continue
        seen.add(title)
        items.push({
          id: href.match(/article_id=([0-9]+)/)?.[1] ?? `naver-${items.length + 1}`,
          title, summary: '', source: '네이버 금융',
          date: new Date().toISOString().slice(0, 10),
          url: `https://finance.naver.com${href}`,
        })
      }
    }
  } catch { /* naver failed, continue to Google News */ }

  // 2) 부족하면 Google News RSS로 보충
  if (items.length < 30) {
    try {
      const response = await fetch('https://news.google.com/rss/search?q=%EA%B8%88%EC%9C%B5+%EC%A3%BC%EC%8B%9D+%EC%A6%9D%EC%8B%9C+%EA%B2%BD%EC%A0%9C&hl=ko&gl=KR&ceid=KR:ko', {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
        cache: 'no-store',
      })
      if (response.ok) {
        const xml = await response.text()
        const blocks = xml.split('<item>')
        for (let idx = 1; idx < blocks.length && items.length < 30; idx++) {
          const block = blocks[idx]
          const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)
          const linkMatch = block.match(/<link>(.*?)<\/link>/s)
          const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/s)
          const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/s)
          if (!titleMatch || !linkMatch) continue
          const title = decodeHtml(titleMatch[1].trim())
          if (!title || title.length < 4 || seen.has(title)) continue
          seen.add(title)
          items.push({
            id: `gnews-fin-${items.length}`,
            title, summary: '', source: sourceMatch?.[1]?.trim() ?? 'Google News',
            date: dateMatch?.[1] ? new Date(dateMatch[1].trim()).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            url: linkMatch[1].trim(),
          })
        }
      }
    } catch { /* skip */ }
  }

  return items.slice(0, 30)
}

async function fetchGoogleNewsRSS(query: string): Promise<NewsItem[]> {
  // '+' 또는 공백으로 키워드 분리
  const keywords = query.split(/[+\s]+/).map(k => k.trim()).filter(k => k.length > 0)
  if (keywords.length === 0) return []

  const allItems: NewsItem[] = []
  const seen = new Set<string>()

  // Google News RSS: 키워드별로 검색하여 합침
  for (const keyword of keywords) {
    if (allItems.length >= 30) break
    const encodedQuery = encodeURIComponent(keyword)
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`
    try {
      const response = await fetch(rssUrl, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        cache: 'no-store',
      })
      if (!response.ok) continue

      const xml = await response.text()
      // RSS XML에서 <item> 파싱 — title, link, pubDate, source 추출
      const items = xml.split('<item>')
      for (let idx = 1; idx < items.length && allItems.length < 30; idx++) {
        const block = items[idx]
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)
        const linkMatch = block.match(/<link>(.*?)<\/link>/s)
        const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/s)
        const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/s)
        if (!titleMatch || !linkMatch) continue

        const rawTitle = titleMatch[1].trim()
        const url = linkMatch[1].trim()
        const title = decodeHtml(rawTitle)
        if (!title || title.length < 4 || seen.has(title)) continue
        seen.add(title)

        const pubDate = dateMatch?.[1]?.trim()
        let date: string
        try { date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) }
        catch { date = new Date().toISOString().slice(0, 10) }
        const source = decodeHtml(sourceMatch?.[1]?.trim() ?? 'Google News')

        allItems.push({
          id: `gnews-${allItems.length}`,
          title,
          summary: '',
          source: `${source} (${keyword})`,
          date,
          url,
        })
      }
    } catch { /* skip keyword on error */ }
  }

  // 결과가 부족하면 전체 키워드를 합쳐서 다시 시도
  if (allItems.length < 10 && keywords.length > 1) {
    const fullQuery = encodeURIComponent(keywords.join(' '))
    try {
      const response = await fetch(`https://news.google.com/rss/search?q=${fullQuery}&hl=ko&gl=KR&ceid=KR:ko`, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        cache: 'no-store',
      })
      if (response.ok) {
        const xml = await response.text()
        const items = xml.split('<item>')
        for (let idx = 1; idx < items.length && allItems.length < 30; idx++) {
          const block = items[idx]
          const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)
          const linkMatch = block.match(/<link>(.*?)<\/link>/s)
          const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/s)
          const sourceMatch = block.match(/<source[^>]*>(.*?)<\/source>/s)
          if (!titleMatch || !linkMatch) continue
          const title = decodeHtml(titleMatch[1].trim())
          const url = linkMatch[1].trim()
          if (!title || title.length < 4 || seen.has(title)) continue
          seen.add(title)
          allItems.push({
            id: `gnews-${allItems.length}`,
            title, summary: '', source: sourceMatch?.[1]?.trim() ?? 'Google News',
            date: dateMatch?.[1] ? new Date(dateMatch[1].trim()).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            url,
          })
        }
      }
    } catch { /* skip */ }
  }

  return allItems.slice(0, 30)
}

function lookupCorpCode(corpName: string): { corp_code: string; stock_code: string } {
  // 1) KNOWN_CORPS에서 빠르게 찾기
  const known = KNOWN_CORPS[corpName]
  if (known) return known

  // 2) 부분 일치
  for (const [name, entry] of Object.entries(KNOWN_CORPS)) {
    if (name.includes(corpName) || corpName.includes(name)) {
      return entry
    }
  }

  // 기본값: 동양 (회사명찾기 팝업에서 정확한 corp_code를 전달받는 것이 정상 흐름)
  return { corp_code: '00117337', stock_code: '001520' }
}

async function fetchDartDisclosures(corpCode: string, bgnDe?: string, endDe?: string, pageCount = 20): Promise<DartItem[]> {
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

/**
 * DART 재무제표 주요 항목만 추출합니다.
 * - CFS(연결) 우선, OFS(개별) 폴백
 * - 중복 제거: account_nm 정규화 후 첫 등장만 유지
 * - 핵심 6개 항목만 반환
 */
type FinancialResult = { rows: FinanceRow[]; meta: { bsnsYear: number; reprtCode: string; fsDiv: string } | null }

async function fetchFinancials(corpCode: string): Promise<FinancialResult> {
  if (!DART_API_KEY) return { rows: [], meta: null }

  const year = new Date().getFullYear() - 1

  // 연결(CFS) → 개별(OFS)  순서로 시도
  for (const fsDiv of ['CFS', 'OFS']) {
    // 사업보고서(11011) → 반기(11012) → 1분기(11013) → 3분기(11014)
    for (const reprtCode of ['11011', '11012', '11013', '11014']) {
      try {
        const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${reprtCode}&fs_div=${fsDiv}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) continue
        const data = await res.json()
        if (data.status !== '000' || !data.list?.length) continue

        // 핵심 항목 정규화 맵 (표시명 → 정규화 키)
        const KEY_MAP: [string, RegExp][] = [
          ['자산총계', /자산총계/],
          ['부채총계', /부채총계/],
          ['자본총계', /자본총계/],
          ['매출액', /^매출액$|^매출$/],
          ['영업이익', /^영업이익$|^영업이익\(/],
          ['당기순이익', /당기순이익|당기순손익/],
        ]

        const seen = new Set<string>()
        const filtered: FinanceRow[] = []

        for (const r of data.list) {
          const rawName: string = r.account_nm ?? ''

          // 핵심 항목 매칭
          let matchedKey: string | null = null
          for (const [key, pattern] of KEY_MAP) {
            if (pattern.test(rawName)) {
              matchedKey = key
              break
            }
          }
          if (!matchedKey || seen.has(matchedKey)) continue
          seen.add(matchedKey)

          filtered.push({
            account_nm: matchedKey,
            thstrm_amount: r.thstrm_amount ?? '-',
            frmtrm_amount: r.frmtrm_amount ?? '-',
            bfefrmtrm_amount: r.bfefrmtrm_amount ?? '-',
          })
        }

        if (filtered.length >= 3) {
          return { rows: filtered, meta: { bsnsYear: year, reprtCode, fsDiv } }
        }
      } catch {
        /* try next report type */
      }
    }
  }

  // 전년도에 데이터가 없으면 2년 전 시도
  const prevYear = year - 1
  for (const fsDiv of ['CFS', 'OFS']) {
    try {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${prevYear}&reprt_code=11011&fs_div=${fsDiv}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      if (data.status !== '000' || !data.list?.length) continue

      const KEY_MAP: [string, RegExp][] = [
        ['자산총계', /자산총계/],
        ['부채총계', /부채총계/],
        ['자본총계', /자본총계/],
        ['매출액', /^매출액$|^매출$/],
        ['영업이익', /^영업이익$|^영업이익\(/],
        ['당기순이익', /당기순이익|당기순손익/],
      ]
      const seen = new Set<string>()
      const filtered: FinanceRow[] = []
      for (const r of data.list) {
        const rawName: string = r.account_nm ?? ''
        let matchedKey: string | null = null
        for (const [key, pattern] of KEY_MAP) {
          if (pattern.test(rawName)) { matchedKey = key; break }
        }
        if (!matchedKey || seen.has(matchedKey)) continue
        seen.add(matchedKey)
        filtered.push({
          account_nm: matchedKey,
          thstrm_amount: r.thstrm_amount ?? '-',
          frmtrm_amount: r.frmtrm_amount ?? '-',
          bfefrmtrm_amount: r.bfefrmtrm_amount ?? '-',
        })
      }
      if (filtered.length >= 3) return { rows: filtered, meta: { bsnsYear: prevYear, reprtCode: '11011', fsDiv } }
    } catch { /* try next */ }
  }

  return { rows: [], meta: null }
}

/**
 * 네이버 증권 모바일 API에서 주식 시세 + 시장 데이터를 가져옵니다.
 * stock_code가 있는 상장사만 조회 가능합니다.
 */
async function fetchStockInfo(stockCode: string): Promise<StockInfo | null> {
  if (!stockCode) return null
  try {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

    // 1) 기본 시세 정보
    const [basicRes, integRes] = await Promise.all([
      fetch(`https://m.stock.naver.com/api/stock/${stockCode}/basic`, { headers: { 'user-agent': ua }, cache: 'no-store' }),
      fetch(`https://m.stock.naver.com/api/stock/${stockCode}/integration`, { headers: { 'user-agent': ua }, cache: 'no-store' }),
    ])

    if (!basicRes.ok) return null
    const basic = await basicRes.json()

    // 2) 통합 시세 정보 (시총, 거래량 등)
    let marketCap = ''
    let volume = ''
    let foreignRate = ''
    if (integRes.ok) {
      const integ = await integRes.json()
      const infos: Array<{ key: string; value: string }> = integ.totalInfos ?? []
      for (const item of infos) {
        if (item.key === '시총') marketCap = item.value ?? ''
        else if (item.key === '거래량') volume = item.value ?? ''
        else if (item.key === '외인소진율') foreignRate = item.value ?? ''
      }
    }

    // 3) 전일대비
    const comp = basic.compareToPreviousPrice ?? {}
    const isRising = comp.name === 'RISING'
    const isFalling = comp.name === 'FALLING'
    const changeDir = isRising ? '+' : isFalling ? '-' : ''
    const changeVal = String(basic.compareToPreviousClosePrice ?? '').replace(/^[-+]/, '')
    const changeRate = String(basic.fluctuationsRatio ?? '').replace(/^[-+]/, '')

    return {
      name: basic.stockName ?? '',
      price: String(basic.closePrice ?? ''),
      change: changeVal ? `${changeDir}${changeVal}` : '',
      changeRate: changeRate ? `${changeDir}${changeRate}%` : '',
      marketCap,
      per: '',
      pbr: '',
      dividendYield: foreignRate ? `외인 ${foreignRate}` : '',
      high52w: '',
      low52w: '',
      volume,
    }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    /* ── 뉴스 검색 전용 경로 ── */
    const newsQuery = url.searchParams.get('news_query')
    if (newsQuery) {
      const newsItems = await fetchGoogleNewsRSS(newsQuery).catch(() => [])
      return json({
        ok: true,
        refreshedAt: new Date().toISOString(),
        corpName: '',
        corpCode: '',
        dartAllUrl: '',
        newsItems,
        dartItems: [],
        financials: [],
        financialMeta: null,
      })
    }

    /* ── 기본 경로: DART 공시 + 네이버 금융 뉴스 ── */
    const corpNameParam = url.searchParams.get('corp_name') || '동양'
    const corpCodeParam = url.searchParams.get('corp_code') || ''
    const stockCodeParam = url.searchParams.get('stock_code') || ''
    const bgnDe = url.searchParams.get('bgn_de') || undefined
    const endDe = url.searchParams.get('end_de') || undefined

    // corp_code가 직접 전달되면 사용, 아니면 회사명으로 검색
    let corpCode = corpCodeParam
    let stockCode = stockCodeParam
    if (!corpCode) {
      const found = await lookupCorpCode(corpNameParam)
      corpCode = found.corp_code
      stockCode = stockCode || found.stock_code
    }

    const dartAllUrl = `https://dart.fss.or.kr/dsab001/main.do?option=corp&textCrpNm=${encodeURIComponent(corpNameParam)}`

    const [newsItems, dartItems, financialResult, stockInfo] = await Promise.all([
      fetchFinanceNews().catch(() => []),
      fetchDartDisclosures(corpCode, bgnDe, endDe).catch(() => []),
      fetchFinancials(corpCode).catch(() => ({ rows: [], meta: null })),
      fetchStockInfo(stockCode).catch(() => null),
    ])

    return json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      corpName: corpNameParam,
      corpCode,
      stockCode,
      dartAllUrl,
      newsItems,
      dartItems,
      financials: financialResult.rows,
      financialMeta: financialResult.meta,
      stockInfo,
    })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
}
