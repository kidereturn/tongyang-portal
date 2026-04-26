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
 * 앱 시작 시 호출. 서버의 /version.json 을 fetch 해서 진짜 최신 buildId 와 비교.
 * 클라이언트 번들의 __BUILD_ID__ 만 비교하면 옛 번들이 캐시된 경우 영원히 옛 buildId 만 보임 (닭과 달걀).
 * 서버 fetch 로 진짜 최신을 알아낸 뒤 다르면 hard reload 로 새 번들 강제 다운로드.
 */
const RELOAD_GUARD_KEY = 'ty_reload_guard'

export async function ensureFreshBundle(): Promise<void> {
  try {
    const bundleBuildId = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
    const stored = localStorage.getItem(BUILD_KEY)
    const flushedOnce = localStorage.getItem(FLUSH_ONCE_KEY)

    // 무한 reload 방지 — 같은 세션에서 3회 이상 reload 했으면 중단
    const guardCount = parseInt(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? '0', 10)
    if (guardCount >= 3) {
      console.warn('[cacheReset] reload guard triggered, skipping')
      sessionStorage.removeItem(RELOAD_GUARD_KEY)
      localStorage.setItem(BUILD_KEY, bundleBuildId)
      return
    }

    // (A) 최초 1회 전 사용자 강제 플러시
    if (!flushedOnce) {
      localStorage.setItem(FLUSH_ONCE_KEY, '1')
      localStorage.setItem(BUILD_KEY, bundleBuildId)
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(guardCount + 1))
      await hardFlush({ clearSessionStorage: false, clearAuth: false })  // sessionStorage 보존 (guard 위해)
      const url = new URL(window.location.href)
      url.searchParams.set('_cf', bundleBuildId)
      window.location.replace(url.toString())
      return
    }

    // (B) 서버에서 진짜 최신 buildId 가져오기 (cache: no-store)
    let serverBuildId: string | null = null
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json() as { buildId?: string }
        serverBuildId = json?.buildId ?? null
      }
    } catch (e) {
      console.warn('[cacheReset] version.json fetch failed', e)
    }

    // (C) 서버 buildId 와 번들 buildId 가 다르면 = 옛 번들 캐시됨 → hard reload
    if (serverBuildId && serverBuildId !== bundleBuildId) {
      console.info(`[cacheReset] stale bundle detected: bundle=${bundleBuildId} server=${serverBuildId}`)
      localStorage.setItem(BUILD_KEY, serverBuildId)
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(guardCount + 1))
      await hardFlush({ clearSessionStorage: false, clearAuth: false })
      const url = new URL(window.location.href)
      url.searchParams.set('_cf', serverBuildId)
      window.location.replace(url.toString())
      return
    }

    // (D) localStorage 의 옛 buildId 가 다르면 동기화 (하지만 reload 는 안 함 — 이미 최신 번들이므로)
    if (stored !== bundleBuildId) {
      localStorage.setItem(BUILD_KEY, bundleBuildId)
    }

    // 정상 진입 — guard 카운터 리셋
    sessionStorage.removeItem(RELOAD_GUARD_KEY)
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
