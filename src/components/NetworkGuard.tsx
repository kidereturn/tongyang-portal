import { useEffect, useState, useCallback, useRef } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * NetworkGuard — 네트워크 단절 감지 + Supabase 연결 불안 자동 복구
 *
 * 증상: "처음에는 잘 되다가 수분 후 먹통"
 * 원인: 토큰 갱신 실패, 네트워크 일시 단절, 탭 비활성화 후 복귀
 *
 * 이 컴포넌트가 하는 일:
 * 1. navigator.onLine 으로 오프라인 감지
 * 2. 30초마다 Supabase API ping (실제 DB 요청)
 * 3. 실패 3회 연속 → 노란색 배너 표시 + 자동 세션 갱신 시도
 * 4. 복구되면 배너 자동 숨김
 */
export default function NetworkGuard() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [apiDown, setApiDown] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const failCount = useRef(0)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const ping = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      // 가벼운 쿼리로 Supabase 연결 상태 확인
      const { error } = await (supabase as any)
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      if (error) {
        failCount.current += 1
        console.warn(`[NetworkGuard] ping failed (${failCount.current}):`, error.message)

        // 401 = 토큰 만료 → 즉시 갱신
        if (error.message?.includes('JWT') || error.code === 'PGRST301') {
          console.info('[NetworkGuard] JWT issue detected, refreshing session...')
          await supabase.auth.refreshSession()
          failCount.current = 0
          return
        }
      } else {
        if (failCount.current > 0) {
          console.info('[NetworkGuard] connection restored')
        }
        failCount.current = 0
        setApiDown(false)
      }

      if (failCount.current >= 3) {
        setApiDown(true)
      }
    } catch {
      failCount.current += 1
      if (failCount.current >= 3) setApiDown(true)
    }
  }, [])

  const handleRecover = useCallback(async () => {
    setRecovering(true)
    try {
      // 1. 세션 강제 갱신
      await supabase.auth.refreshSession()
      // 2. 연결 재확인
      await ping()
      // 3. 여전히 실패하면 페이지 리로드
      if (failCount.current >= 3) {
        window.location.reload()
      }
    } catch {
      window.location.reload()
    } finally {
      setRecovering(false)
    }
  }, [ping])

  useEffect(() => {
    const onOnline = () => {
      setOffline(false)
      failCount.current = 0
      setApiDown(false)
      // 네트워크 복구 시 즉시 ping
      ping()
    }
    const onOffline = () => setOffline(true)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // 30초마다 연결 상태 체크
    pingTimer.current = setInterval(ping, 30_000)
    // 초기 1회
    ping()

    // 탭 활성화 시 즉시 체크
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        ping()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      if (pingTimer.current) clearInterval(pingTimer.current)
    }
  }, [ping])

  if (!offline && !apiDown) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-3 bg-amber-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-in slide-in-from-top">
      <WifiOff size={16} />
      <span>
        {offline
          ? '인터넷 연결이 끊겼습니다. Wi-Fi 또는 네트워크를 확인하세요.'
          : '서버 연결이 불안정합니다.'}
      </span>
      {!offline && (
        <button
          onClick={handleRecover}
          disabled={recovering}
          className="ml-2 flex items-center gap-1 rounded-md bg-white/20 px-3 py-1 text-xs font-bold hover:bg-white/30 transition disabled:opacity-50"
        >
          <RefreshCw size={12} className={recovering ? 'animate-spin' : ''} />
          {recovering ? '복구 중...' : '재연결'}
        </button>
      )}
    </div>
  )
}
