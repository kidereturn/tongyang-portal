/**
 * Supabase 쿼리 타임아웃 래퍼
 *
 * 배경:
 * - 브라우저 탭이 백그라운드로 들어갔다 돌아올 때, in-flight fetch 가 영구
 *   hang 되는 경우가 관찰됨 (특히 모바일 Safari/Chrome).
 * - Supabase-js 는 기본 AbortController 연결을 제공하지 않음.
 * - 타임아웃 없는 await 는 setLoading(false) 를 영영 실행하지 않고 화면을
 *   스켈레톤 상태로 고정시킴.
 *
 * 해결:
 * - 모든 페이지 레벨 쿼리를 이 래퍼로 감싼다.
 * - 지정 시간(기본 12s) 안에 응답이 안 오면 `{ data: null, error: TimeoutError }`
 *   형태로 빠르게 실패 처리하여 finally 블록이 반드시 실행되게 한다.
 *
 * 주의:
 * - Promise.race 로 구현하므로 실제 네트워크 요청은 계속 진행될 수 있음.
 *   그러나 후속 상태 업데이트는 무시되므로 UI 관점에서는 안전하다.
 */
export class QueryTimeoutError extends Error {
  constructor(tag: string, ms: number) {
    super(`[queryWithTimeout] "${tag}" timed out after ${ms}ms`)
    this.name = 'QueryTimeoutError'
  }
}

export async function queryWithTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = 12_000,
  tag: string = 'query',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new QueryTimeoutError(tag, ms)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * supabase 쿼리 결과를 { data, error } 형태로 안전하게 반환.
 * 타임아웃/예외 시 error 를 채워주고 data 는 null 로 세팅.
 */
export async function safeQuery<T>(
  promise: PromiseLike<{ data: T | null; error: unknown } | unknown>,
  ms: number = 12_000,
  tag: string = 'query',
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const res = (await queryWithTimeout(promise, ms, tag)) as { data: T | null; error: unknown } | unknown
    if (res && typeof res === 'object' && 'data' in res) {
      const r = res as { data: T | null; error: unknown }
      return { data: r.data ?? null, error: r.error ? new Error(String((r.error as any)?.message ?? r.error)) : null }
    }
    return { data: (res as T) ?? null, error: null }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn(`[safeQuery] ${tag}:`, err.message)
    return { data: null, error: err }
  }
}

/**
 * 큰 IN 리스트를 chunk 로 나누어 순차 실행 (URL 길이 초과 방지).
 * PostgREST 는 기본 8KB URL 제한 — 400~500 한글 키는 쉽게 초과.
 *
 * @param buildQuery  chunk 가 주어지면 `.in('col', chunk)` 가 적용된 쿼리를 반환
 * @param values      IN 에 들어갈 전체 배열
 * @param chunkSize   기본 100
 * @param tag         로그용
 */
export async function chunkedIn<T>(
  buildQuery: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>,
  values: string[],
  chunkSize: number = 100,
  ms: number = 12_000,
  tag: string = 'chunkedIn',
): Promise<{ data: T[]; error: Error | null }> {
  if (values.length === 0) return { data: [], error: null }
  const unique = Array.from(new Set(values))
  const out: T[] = []
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await safeQuery<T[]>(buildQuery(chunk), ms, `${tag}[${i}/${unique.length}]`)
    if (error) return { data: out, error }
    if (data) out.push(...data)
  }
  return { data: out, error: null }
}
