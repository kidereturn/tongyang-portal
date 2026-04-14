import { createContext, useEffect, useState, type ReactNode } from 'react'
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

  useEffect(() => {
    let mounted = true

    async function fetchProfile(userId: string) {
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
        setState(prev => ({ ...prev, profile: data ?? null, loading: false }))
      } catch {
        if (mounted) setState(prev => ({ ...prev, loading: false }))
      }
    }

    // Single listener — fires INITIAL_SESSION on load, then auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        if (session?.user) {
          setState(prev => ({ ...prev, session, user: session.user }))
          await fetchProfile(session.user.id)
        } else {
          setState({ user: null, session: null, profile: null, loading: false })
        }
      }
    )

    // Failsafe: if INITIAL_SESSION never fires within 5s, unblock the UI
    const timeout = setTimeout(() => {
      if (mounted) setState(prev => ({ ...prev, loading: false }))
    }, 5000)

    // Supabase autoRefreshToken handles session refresh automatically.
    // No additional interval needed.

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
