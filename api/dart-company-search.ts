/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DART_API_KEY = process.env.VITE_DART_API_KEY ?? process.env.DART_API_KEY

/* ── 정적 법인코드 데이터 로드 ── */
// 포맷: [[corp_code, corp_name], [corp_code, corp_name, stock_code], ...]
let corpData: string[][] | null = null

function getCorpData(): string[][] {
  if (corpData) return corpData
  try {
    const dir = dirname(fileURLToPath(import.meta.url))
    const raw = readFileSync(join(dir, 'corp-codes.json'), 'utf-8')
    corpData = JSON.parse(raw)
    return corpData!
  } catch {
    // 파일 경로 대체 시도
    try {
      const raw2 = readFileSync(join(process.cwd(), 'api', 'corp-codes.json'), 'utf-8')
      corpData = JSON.parse(raw2)
      return corpData!
    } catch {
      return []
    }
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  })
}

type SearchResult = {
  corp_code: string
  corp_name: string
  stock_code: string
  listed: boolean
  ceo_nm: string
  induty_code: string
}

function searchCorps(data: string[][], query: string, limit = 30): SearchResult[] {
  const lq = query.toLowerCase().trim()
  if (!lq) return []

  const exact: SearchResult[] = []
  const starts: SearchResult[] = []
  const contains: SearchResult[] = []

  for (const entry of data) {
    const corpCode = entry[0]
    const corpName = entry[1]
    const stockCode = entry[2] ?? ''
    const ln = corpName.toLowerCase()

    const item: SearchResult = {
      corp_code: corpCode,
      corp_name: corpName,
      stock_code: stockCode,
      listed: !!stockCode,
      ceo_nm: '',
      induty_code: '',
    }

    if (ln === lq) exact.push(item)
    else if (ln.startsWith(lq)) starts.push(item)
    else if (ln.includes(lq)) contains.push(item)
  }

  const byListed = (a: SearchResult, b: SearchResult) =>
    (a.listed ? 0 : 1) - (b.listed ? 0 : 1)

  return [...exact.sort(byListed), ...starts.sort(byListed), ...contains.sort(byListed)].slice(0, limit)
}

/**
 * GET /api/dart-company-search?query=한일합섬
 *
 * 116,000+ 법인에서 회사명을 검색합니다.
 * 정적 데이터 파일 기반 — 네트워크 요청 없이 즉시 응답합니다.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')?.trim()
    if (!query) return json({ ok: false, results: [], error: 'query required' }, 400)

    const data = getCorpData()
    if (data.length === 0) {
      return json({ ok: false, results: [], error: 'corp-codes.json not loaded' }, 500)
    }

    const matches = searchCorps(data, query, 30)

    // 상위 5건 DART company.json에서 대표자/업종 보강
    if (DART_API_KEY) {
      const enrichPromises = matches.slice(0, 5).map(async (item) => {
        try {
          const r = await fetch(
            `https://opendart.fss.or.kr/api/company.json?crtfc_key=${DART_API_KEY}&corp_code=${item.corp_code}`,
            { cache: 'no-store' },
          )
          if (r.ok) {
            const d = await r.json()
            if (d.status === '000') {
              item.ceo_nm = d.ceo_nm ?? ''
              item.induty_code = d.induty_code ?? ''
            }
          }
        } catch { /* skip */ }
      })
      await Promise.all(enrichPromises)
    }

    return json({
      ok: true,
      query,
      totalLoaded: data.length,
      resultCount: matches.length,
      results: matches,
    })
  } catch (error) {
    return json({ ok: false, results: [], error: error instanceof Error ? error.message : String(error) }, 500)
  }
}
