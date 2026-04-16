import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.')
}

/**
 * In-memory mutex lock — 동일 탭 내 토큰 갱신 동시 실행 방지
 * navigator.locks 는 탭이 닫혀도 브라우저에 잔존해 블로킹 유발하므로
 * 대신 메모리 기반 뮤텍스로 구현
 */
const locks = new Map<string, Promise<unknown>>()

function memoryLock(
  name: string,
  _timeout: number,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const prev = locks.get(name) ?? Promise.resolve()
  const next = prev.then(fn, fn).finally(() => {
    if (locks.get(name) === next) locks.delete(name)
  })
  locks.set(name, next)
  return next
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    lock: memoryLock,
  } as any, // lock 은 gotrue-js 내부 옵션이라 타입에 미노출
})

/**
 * 세션 건강 체크 — 주기적으로 토큰이 유효한지 확인하고 갱신
 * 탭 복귀(visibilitychange) 시에도 즉시 체크
 */
let healthTimer: ReturnType<typeof setInterval> | null = null

async function checkSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.warn('[supabase] session check error:', error.message)
      // 세션이 깨졌으면 강제 갱신 시도
      await supabase.auth.refreshSession()
      return
    }
    if (!session) return // 로그인 안 된 상태

    // JWT 만료 10분 전이면 선제 갱신
    const expiresAt = session.expires_at ?? 0
    const now = Math.floor(Date.now() / 1000)
    if (expiresAt - now < 600) {
      console.info('[supabase] preemptive token refresh')
      await supabase.auth.refreshSession()
    }
  } catch (err) {
    console.warn('[supabase] session health check failed:', err)
  }
}

function startHealthCheck() {
  if (healthTimer) return
  // 3분마다 세션 건강 체크
  healthTimer = setInterval(checkSession, 3 * 60 * 1000)

  // 탭이 다시 활성화될 때 즉시 세션 체크
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSession()
    }
  })

  // 네트워크 복구 시 즉시 세션 체크
  window.addEventListener('online', () => {
    console.info('[supabase] network restored, checking session...')
    checkSession()
  })
}

startHealthCheck()
