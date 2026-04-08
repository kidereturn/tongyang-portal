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

    // getSession() 별도 호출 없이 onAuthStateChange 하나만 사용
    // → localStorage 잠금 충돌 방지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (session?.user) {
          setState(prev => ({ ...prev, session, user: session.user }))
          await fetchProfile(session.user.id, mounted)
        } else {
          setState({ user: null, session: null, profile: null, loading: false })
        }
      }
    )

    // 5초 내 응답 없으면 강제 해제 (최후 안전망)
    const timeout = setTimeout(() => {
      if (mounted) setState(prev => ({ ...prev, loading: false }))
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId: string, mounted: boolean) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (!mounted) return
      setState(prev => ({ ...prev, profile: data ?? null, loading: false }))
    } catch {
      if (mounted) setState(prev => ({ ...prev, loading: false }))
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { ...state, signOut }
}
