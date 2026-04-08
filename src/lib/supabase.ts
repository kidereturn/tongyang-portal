import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.')
}

// navigator.locks 대신 단순 in-memory lock 사용
// navigator.locks 는 탭이 닫혀도 브라우저에 잔존해 다음 방문 때 5초 블로킹 발생
// 단일 SPA에서는 lock이 불필요하므로 no-op으로 대체
const noopLock = (
  _name: string,
  _timeout: number,
  fn: () => Promise<unknown>
): Promise<unknown> => fn()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
    lock: noopLock,
  } as any, // lock 은 gotrue-js 내부 옵션이라 타입에 미노출
})
