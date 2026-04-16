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

    async function fetchProfile(userId: string) {
      if (fetchingProfile.current) return
      fetchingProfile.current = true
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (!mounted) return
        if (fetchError) {
          console.warn('Profile fetch error:', fetchError.message)
          setState(prev => ({ ...prev, loading: false }))
          return
        }
        setProfileStable(data ?? null)
      } catch {
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
          // Only re-fetch profile on actual sign-in, not token refresh
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || !state.profile) {
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
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[AuthProvider] failsafe: force loading=false after 3s')
        setState(prev => ({ ...prev, loading: false }))
      }
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
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    // Force clear auth state and storage even if signOut fails
    setState({ user: null, session: null, profile: null, loading: false })
    try {
      Object.keys(window.localStorage).forEach(key => {
        if (key.startsWith('sb-')) window.localStorage.removeItem(key)
      })
    } catch { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
