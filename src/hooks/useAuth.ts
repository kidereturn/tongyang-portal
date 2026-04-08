import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    let mounted = true

    // 10초 안에 응답 없으면 강제로 loading 해제 (로그인 페이지로)
    const timeout = setTimeout(() => {
      if (mounted) setState(prev => ({ ...prev, loading: false }))
    }, 10000)

    async function init() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return
        clearTimeout(timeout)

        if (error) {
          // 세션 오류 시 자동 초기화 (쿠키/localStorage 충돌 방지)
          console.warn('[useAuth] 세션 오류, 초기화합니다:', error.message)
          await supabase.auth.signOut()
          setState(prev => ({ ...prev, loading: false }))
          return
        }

        setState(prev => ({ ...prev, session, user: session?.user ?? null }))
        if (session?.user) {
          await fetchProfile(session.user.id, mounted)
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (e) {
        console.error('[useAuth] 초기화 오류:', e)
        if (mounted) {
          clearTimeout(timeout)
          // 심각한 오류 시 세션 초기화
          try { await supabase.auth.signOut() } catch { /* ignore */ }
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) {
        await fetchProfile(session.user.id, mounted)
      } else {
        setState(prev => ({ ...prev, profile: null, loading: false }))
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string, mounted = true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()   // 없어도 에러 안 냄

    if (!mounted) return
    if (error) console.error('[useAuth] 프로필 조회 오류:', error.message)
    setState(prev => ({ ...prev, profile: data ?? null, loading: false }))
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { ...state, signOut }
}
