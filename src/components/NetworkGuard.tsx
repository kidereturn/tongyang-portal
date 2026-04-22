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

  // 가벼운 GET 요청으로 연결 상태만 확인.
  // (이전에는 HEAD를 썼는데 Supabase가 HEAD 응답을 안정적으로 주지 않아
  //  5초 타임아웃이 반복되고 false positive 경고가 뜨던 문제 수정)
  const ping = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      // profiles?limit=1은 RLS가 막아도 200(빈 배열) 또는 401을 빠르게 반환 —
      // 어느 쪽이든 "서버가 살아있다"는 증거이므로 성공으로 간주
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Accept-Profile': 'public',
          },
          signal: controller.signal,
        },
      )
      clearTimeout(timeoutId)

      // 어떤 응답이든 (200, 400, 401, 403, 404, 500...) 서버가 살아있다는 뜻
      // 네트워크 실패만 문제로 간주
      if (res.status > 0) {
        if (failCount.current > 0) {
          console.info('[NetworkGuard] connection restored (status=' + res.status + ')')
        }
        failCount.current = 0
        setApiDown(false)
      }
    } catch {
      // fetch 자체가 실패 = 네트워크 단절
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
