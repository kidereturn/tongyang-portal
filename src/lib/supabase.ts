import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인하세요.')
}

// 페이지 로드 시 이전 세션의 stale navigator.locks 강제 해제
// Supabase JWT 갱신 중 탭이 닫히면 lock이 잔존해 다음 접속 때 5초 블로킹 발생
if (typeof navigator !== 'undefined' && 'locks' in navigator) {
  const lockName = `lock:sb-${supabaseUrl?.split('https://')[1]?.split('.')[0]}-auth-token`
  navigator.locks.request(lockName, { steal: true }, () => Promise.resolve())
    .catch(() => {/* 무시 */})
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
  },
})
