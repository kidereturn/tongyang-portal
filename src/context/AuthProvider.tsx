import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, 'signOut'>>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })
  const lastProfileJson = useRef<string>('')
  const fetchingProfile = useRef(false)

  // Stable profile setter — only updates if profile data actually changed
  const setProfileStable = useCallback((data: Profile | null) => {
    const json = JSON.stringify(data)
    if (json === lastProfileJson.current) return // no change, skip re-render
    lastProfileJson.current = json
    setState(prev => ({ ...prev, profile: data, loading: false }))
  }, [])

  useEffect(() => {
    let mounted = true

    // Profile fetch with timeout + single retry (6s + 4s). 이유:
    // 1) hanging Supabase query 로 profile 미설정 → 사용자님 표시 + skeleton 12s
    // 2) 첫 시도 실패해도 재시도로 복구
    async function fetchProfileOnce(userId: string, ms: number) {
      const timer = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error(`profile fetch timed out ${ms}ms`) }), ms),
      )
      const q = (supabase as any).from('profiles').select('*').eq('id', userId).maybeSingle()
      return Promise.race([q, timer]) as Promise<{ data: Profile | null; error: unknown }>
    }

    async function fetchProfile(userId: string) {
      if (fetchingProfile.current) return
      fetchingProfile.current = true
      const t0 = performance.now()
      try {
        let res = await fetchProfileOnce(userId, 6000)
        if (!mounted) return
        if (res.error || !res.data) {
          console.warn(`[AuthProvider] profile fetch 1st fail (${Math.round(performance.now() - t0)}ms) — retry`)
          res = await fetchProfileOnce(userId, 4000)
          if (!mounted) return
        }
        if (res.error) {
          console.warn('[AuthProvider] profile fetch failed after retry:', (res.error as Error).message)
          setState(prev => ({ ...prev, loading: false }))
          return
        }
        setProfileStable((res.data ?? null) as Profile | null)
        console.info(`[AuthProvider] profile loaded in ${Math.round(performance.now() - t0)}ms`)
      } catch (e) {
        console.warn('[AuthProvider] fetchProfile exception:', e)
        if (mounted) setState(prev => ({ ...prev, loading: false }))
      } finally {
        fetchingProfile.current = false
      }
    }

    // Log login to DB
    async function logLogin(userId: string, profileData: Profile | null) {
      try {
        let ip = ''
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json')
          const ipData = await ipRes.json()
          ip = ipData.ip ?? ''
        } catch { /* fallback */ }

        await (supabase as any).from('login_logs').insert({
          user_id: userId,
          employee_id: profileData?.employee_id ?? null,
          full_name: profileData?.full_name ?? null,
          department: profileData?.department ?? null,
          ip_address: ip,
          user_agent: navigator.userAgent.slice(0, 200),
        })
      } catch { /* silent */ }
    }

    // Single listener — fires INITIAL_SESSION on load, then auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (session?.user) {
          setState(prev => ({ ...prev, session, user: session.user }))
          // 재fetch 는 실제 로그인 또는 INITIAL_SESSION 시에만.
          // TOKEN_REFRESHED 등 다른 이벤트에서는 절대 재fetch 안함.
          // 이전 버그: `!state.profile` (stale closure) 로 매 TOKEN_REFRESHED 마다
          // 불필요한 profile 재fetch 발생 → 네트워크 부하 + 타임아웃 연쇄.
          // lastProfileJson.current 는 mutable ref 라 최신값 참조 가능.
          const hasProfile = lastProfileJson.current !== ''
          if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && !hasProfile)) {
            await fetchProfile(session.user.id)
            // Log login on actual sign-in
            if (event === 'SIGNED_IN') {
              const json = lastProfileJson.current
              const profileData = json ? JSON.parse(json) as Profile : null
              logLogin(session.user.id, profileData)
              // Award login points
              try {
                await (supabase as any).from('user_points').insert({
                  user_id: session.user.id,
                  action: 'login',
                  points: 10,
                  description: '로그인 포인트',
                })
              } catch { /* silent */ }
            }
          } else {
            setState(prev => ({ ...prev, loading: false }))
          }
        } else {
          lastProfileJson.current = ''
          setState({ user: null, session: null, profile: null, loading: false })
        }
      }
    )

    // Failsafe: if INITIAL_SESSION never fires within 3s, unblock the UI
    // profile 이 이미 로드됐으면 no-op (오해 유발하는 warn 제거)
    const timeout = setTimeout(() => {
      if (!mounted) return
      // profile 이 이미 로드됐으면 아무것도 안함
      if (lastProfileJson.current !== '') return
      // 실제로 auth 가 멈춘 경우에만 warn
      setState(prev => {
        if (!prev.loading) return prev
        console.warn('[AuthProvider] failsafe: INITIAL_SESSION 3s 내 미도달 → UI 강제 언블록')
        return { ...prev, loading: false }
      })
    }, 3000)

    // ⚠️ 중복 refreshRetry 제거됨
    // Supabase SDK 내장 autoRefreshToken 이 토큰 갱신을 담당.
    // 추가 refresh 호출은 memoryLock 데드락의 원인이었음.

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    // 1) localStorage 의 sb-* 토큰 즉시 제거 — 네트워크 지연 무관하게 클라이언트 로그아웃 보장
    try {
      Object.keys(window.localStorage).forEach(key => {
        if (key.startsWith('sb-')) window.localStorage.removeItem(key)
      })
    } catch { /* ignore */ }
    // 2) AuthContext state 즉시 초기화 — UI 가 즉시 비로그인 상태로 전환
    setState({ user: null, session: null, profile: null, loading: false })
    // 3) Supabase signOut 은 timeout 8s 으로 wrap — 서버 응답 안 와도 차단되지 않음
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(resolve => setTimeout(resolve, 8000)),
      ])
    } catch { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
