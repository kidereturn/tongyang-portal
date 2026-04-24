// 클라이언트 캐시 자동 무효화
// - 빌드 ID 가 바뀌면 Cache API, Service Worker, sessionStorage 를 싹 비우고 하드 리로드
// - 이번 한 번은 'ty_flushed_20260424' 플래그로 전 사용자 강제 1회 플러시
// - Supabase auth 세션 (localStorage 의 sb-*-auth-token) 은 의도적으로 보존

const BUILD_KEY = 'ty_build_id'
const FLUSH_ONCE_KEY = 'ty_flushed_20260424' // 이번 한 번만 실행되는 강제 플러시

type FlushOptions = { clearSessionStorage?: boolean; clearAuth?: boolean }

async function hardFlush(opts: FlushOptions = {}) {
  const { clearSessionStorage = true, clearAuth = false } = opts
  try {
    // 1) Cache API — PWA 나 Workbox 캐시
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch (e) { console.warn('[cacheReset] caches failed', e) }

  try {
    // 2) Service Worker — 등록된 SW 전부 해지
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
  } catch (e) { console.warn('[cacheReset] SW failed', e) }

  try {
    if (clearSessionStorage) sessionStorage.clear()
  } catch (e) { console.warn('[cacheReset] session failed', e) }

  try {
    if (clearAuth) {
      // auth 토큰까지 전부 날릴 때
      localStorage.clear()
    } else {
      // auth 세션은 보존하되 그 외 앱 캐시만 제거
      const keep: string[] = []
      const authPrefix = 'sb-'
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k) continue
        if (k.startsWith(authPrefix) || k === BUILD_KEY || k === FLUSH_ONCE_KEY) keep.push(k)
      }
      const saved: Record<string, string> = {}
      for (const k of keep) saved[k] = localStorage.getItem(k) ?? ''
      localStorage.clear()
      for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v)
    }
  } catch (e) { console.warn('[cacheReset] local failed', e) }
}

/**
 * 앱 시작 시 호출. 빌드 ID 가 바뀌었거나 이번 최초 방문이면
 * 캐시/SW 를 비우고 하드 리로드하여 신번들을 강제로 내려받게 한다.
 */
export async function ensureFreshBundle(): Promise<void> {
  try {
    const current = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
    const stored = localStorage.getItem(BUILD_KEY)
    const flushedOnce = localStorage.getItem(FLUSH_ONCE_KEY)

    // (A) 최초 1회 전 사용자 강제 플러시
    if (!flushedOnce) {
      localStorage.setItem(FLUSH_ONCE_KEY, '1')
      localStorage.setItem(BUILD_KEY, current)
      await hardFlush({ clearSessionStorage: true, clearAuth: false })
      // 리로드하여 새 번들 로드 (URL 에 플래그 추가로 SW/HTTP 캐시 우회)
      const url = new URL(window.location.href)
      url.searchParams.set('_cf', current)
      window.location.replace(url.toString())
      return
    }

    // (B) 빌드 ID 변경 감지 → 하드 플러시 + 리로드
    if (stored && stored !== current) {
      localStorage.setItem(BUILD_KEY, current)
      await hardFlush({ clearSessionStorage: true, clearAuth: false })
      const url = new URL(window.location.href)
      url.searchParams.set('_cf', current)
      window.location.replace(url.toString())
      return
    }

    if (!stored) localStorage.setItem(BUILD_KEY, current)
  } catch (e) {
    console.warn('[cacheReset] ensureFreshBundle error', e)
  }
}

/**
 * 로그인 페이지 진입 시 수동으로 캐시를 털고 싶을 때 쓰는 유틸.
 * 로그인 버튼 바로 옆 "캐시 삭제" 같은 버튼에 연결 가능.
 */
export async function flushAndReload(clearAuth = true): Promise<void> {
  await hardFlush({ clearSessionStorage: true, clearAuth })
  const url = new URL(window.location.href)
  url.searchParams.set('_cf', Date.now().toString())
  window.location.replace(url.toString())
}
