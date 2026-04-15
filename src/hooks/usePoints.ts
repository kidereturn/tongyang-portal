import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePoints() {
  const { profile } = useAuth()
  const [totalPoints, setTotalPoints] = useState(0)

  useEffect(() => {
    if (!profile?.id) return

    async function fetchPoints() {
      try {
        const { data } = await (supabase as any)
          .from('user_points')
          .select('points')
          .eq('user_id', profile!.id)
        const total = (data ?? []).reduce((sum: number, r: { points: number }) => sum + r.points, 0)
        setTotalPoints(total)
      } catch { /* silent */ }
    }

    fetchPoints()
    // Refresh every 60s
    const interval = setInterval(fetchPoints, 60_000)
    return () => clearInterval(interval)
  }, [profile?.id])

  async function addPoints(action: string, points: number, description?: string) {
    if (!profile?.id) return
    try {
      await (supabase as any).from('user_points').insert({
        user_id: profile.id,
        action,
        points,
        description: description ?? action,
      })
      setTotalPoints(prev => prev + points)
    } catch { /* silent */ }
  }

  return { totalPoints, addPoints }
}
