import { useEffect, useState, useCallback, useRef } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * NetworkGuard — 네트워크 단절 감지 전용 (수정 시도 안 함)
 *
 * ⚠️ 이전 버전은 supabase.auth.refreshSession() 을 직접 호출했으나,
 *    이것이 memoryLock 데드락의 주범이었음.
 *    지금은 감지만 하고, 복구는 페이지 리로드로만 수행.
 */
export default function NetworkGuard() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [apiDown, setApiDown] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const failCount = useRef(0)
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 가벼운 HEAD 요청으로 연결 상태만 확인 (Supabase auth 호출 안 함)
  const ping = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: 'HEAD',
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          signal: controller.signal,
        },
      )
      clearTimeout(timeoutId)

      if (res.ok || res.status === 400) {
        // 서버가 응답하면 연결 OK (400도 서버 살아있음)
        if (failCount.current > 0) {
          console.info('[NetworkGuard] connection restored')
        }
        failCount.current = 0
        setApiDown(false)
      } else {
        failCount.current += 1
        if (failCount.current >= 3) setApiDown(true)
      }
    } catch {
      failCount.current += 1
      if (failCount.current >= 3) setApiDown(true)
    }
  }, [])

  const handleRecover = useCallback(() => {
    setRecovering(true)
    // 단순히 페이지 리로드 — Supabase auth 를 건드리지 않음
    window.location.reload()
  }, [])

  useEffect(() => {
    const onOnline = () => {
      setOffline(false)
      failCount.current = 0
      setApiDown(false)
      ping()
    }
    const onOffline = () => setOffline(true)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // 60초마다 연결 상태 체크 (이전 30초 → 60초로 완화)
    pingTimer.current = setInterval(ping, 60_000)

    // 탭 활성화 시 체크
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping()
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
          {recovering ? '새로고침 중...' : '새로고침'}
        </button>
      )}
    </div>
  )
}
