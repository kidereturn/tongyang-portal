import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.')
}

/**
 * In-memory mutex lock — 동일 탭 내 토큰 갱신 동시 실행 방지
 *
 * 핵심 수정: timeout 을 반드시 존중!
 * 이전 버전은 _timeout 을 무시해서, fn() 이 느려지면 영구 데드락 발생.
 * 모든 후속 인증 호출(getSession, refreshSession 등)이 영원히 차단되어
 * "수분 후 먹통" 현상의 직접적 원인이었음.
 */
const locks = new Map<string, Promise<unknown>>()

function memoryLock(
  name: string,
  timeout: number,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  const effectiveTimeout = Math.max(timeout || 5000, 3000) // 최소 3초
  const prev = locks.get(name) ?? Promise.resolve()

  const next = prev.catch(() => {}).then(() =>
    // fn() 과 타임아웃 중 먼저 끝나는 것을 사용
    Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[memoryLock] "${name}" timed out (${effectiveTimeout}ms)`)),
          effectiveTimeout,
        ),
      ),
    ]),
  ).finally(() => {
    if (locks.get(name) === next) locks.delete(name)
  })

  locks.set(name, next)
  return next
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,   // Supabase SDK 내장 자동갱신만 사용
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    lock: memoryLock,
  } as any, // lock 은 gotrue-js 내부 옵션이라 타입에 미노출
})

// ⚠️ 별도 healthCheck / refreshRetry 제거됨
// Supabase SDK 의 autoRefreshToken 이 충분하며,
// 중복 refresh 호출이 memoryLock 데드락의 주범이었음.
