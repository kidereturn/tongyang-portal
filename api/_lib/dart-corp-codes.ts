/// <reference types="node" />
import { inflateRawSync } from 'node:zlib'

export type CorpEntry = {
  corp_code: string
  corp_name: string
  stock_code: string
  modify_date: string
}

const DART_API_KEY = process.env.VITE_DART_API_KEY ?? process.env.DART_API_KEY

/* ── 글로벌 인메모리 캐시 (Vercel warm function 재사용) ── */
let cache: { entries: CorpEntry[]; loadedAt: number } | null = null
const CACHE_TTL = 12 * 60 * 60 * 1000 // 12시간

/**
 * ZIP 파일에서 첫 번째 파일을 추출하는 최소 파서
 * Node.js 내장 zlib만 사용 (외부 라이브러리 불필요)
 */
function extractFirstFileFromZip(buffer: Buffer): Buffer {
  // ZIP local file header signature: PK\x03\x04
  if (buffer.length < 30 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('Not a valid ZIP file')
  }

  const compressionMethod = buffer.readUInt16LE(8)
  const compressedSize = buffer.readUInt32LE(18)
  const fileNameLength = buffer.readUInt16LE(26)
  const extraFieldLength = buffer.readUInt16LE(28)

  const dataStart = 30 + fileNameLength + extraFieldLength
  const compressedData = buffer.subarray(dataStart, dataStart + compressedSize)

  if (compressionMethod === 0) return Buffer.from(compressedData) // Stored
  if (compressionMethod === 8) return inflateRawSync(compressedData) // Deflated

  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`)
}

/**
 * DART corpCode.xml ZIP을 다운로드해서 전체 법인 코드 목록을 로드합니다.
 * warm function에서는 캐시된 데이터를 반환합니다.
 */
export async function getCorpCodes(): Promise<CorpEntry[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL) {
    return cache.entries
  }

  if (!DART_API_KEY) throw new Error('DART_API_KEY not configured')

  const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`corpCode download failed: ${response.status}`)

  const arrayBuf = await response.arrayBuffer()
  const zipBuffer = Buffer.from(arrayBuf)
  const xmlBuffer = extractFirstFileFromZip(zipBuffer)
  const xmlText = xmlBuffer.toString('utf-8')

  const entries: CorpEntry[] = []
  const regex =
    /<list>\s*<corp_code>([^<]*)<\/corp_code>\s*<corp_name>([^<]*)<\/corp_name>\s*<stock_code>\s*([^<]*?)\s*<\/stock_code>\s*<modify_date>([^<]*)<\/modify_date>\s*<\/list>/g

  let match: RegExpExecArray | null = null
  while ((match = regex.exec(xmlText))) {
    entries.push({
      corp_code: match[1].trim(),
      corp_name: match[2].trim(),
      stock_code: match[3].trim(),
      modify_date: match[4].trim(),
    })
  }

  cache = { entries, loadedAt: Date.now() }
  return entries
}

/**
 * 회사명으로 법인 코드 목록을 검색합니다.
 * 정확 일치 → 시작 일치 → 포함 일치 순으로 정렬하며,
 * 상장사를 우선 표시합니다.
 */
export function searchCorps(
  entries: CorpEntry[],
  query: string,
  limit = 30,
): CorpEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const sortByListed = (a: CorpEntry, b: CorpEntry) => {
    const aL = a.stock_code ? 0 : 1
    const bL = b.stock_code ? 0 : 1
    return aL - bL
  }

  const exact = entries.filter(e => e.corp_name.toLowerCase() === q).sort(sortByListed)
  const startsWith = entries
    .filter(e => e.corp_name.toLowerCase() !== q && e.corp_name.toLowerCase().startsWith(q))
    .sort(sortByListed)
  const contains = entries
    .filter(
      e =>
        e.corp_name.toLowerCase() !== q &&
        !e.corp_name.toLowerCase().startsWith(q) &&
        e.corp_name.toLowerCase().includes(q),
    )
    .sort(sortByListed)

  return [...exact, ...startsWith, ...contains].slice(0, limit)
}

/**
 * 회사명으로 corp_code + stock_code를 찾습니다.
 */
export async function findCorpCode(
  corpName: string,
): Promise<{ corp_code: string; stock_code: string } | null> {
  try {
    const entries = await getCorpCodes()

    // 1) 정확 일치
    const exact = entries.find(e => e.corp_name === corpName)
    if (exact) return { corp_code: exact.corp_code, stock_code: exact.stock_code }

    // 2) 부분 일치 (상장사 우선)
    const partial = entries
      .filter(e => e.corp_name.includes(corpName) || corpName.includes(e.corp_name))
      .sort((a, b) => (a.stock_code ? 0 : 1) - (b.stock_code ? 0 : 1))

    if (partial.length > 0) {
      return { corp_code: partial[0].corp_code, stock_code: partial[0].stock_code }
    }
  } catch {
    /* corp code loading failed */
  }
  return null
}
