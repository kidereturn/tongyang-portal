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

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      setState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) {
        await fetchProfile(session.user.id, mounted)
      } else {
        setState(prev => ({ ...prev, loading: false }))
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
