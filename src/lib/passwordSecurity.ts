/**
 * Leaked Password Protection (Free-plan 대안)
 *
 * HaveIBeenPwned.org 의 Pwned Passwords API 를 사용하여 유출된 비밀번호를 차단한다.
 * k-anonymity 기법: 비밀번호의 SHA-1 해시 중 앞 5자만 API 로 전송하므로 원본 비밀번호는 외부로 나가지 않는다.
 *
 * 사용:
 * ```ts
 * const { breached, count } = await checkPasswordBreach('hello123')
 * if (breached) throw new Error(`이 비밀번호는 ${count}회 유출된 적이 있습니다`)
 * ```
 */

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-1', enc.encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export interface BreachResult {
  breached: boolean
  count: number
  error?: string
}

/**
 * HIBP Pwned Passwords API 를 통해 비밀번호 유출 여부 확인.
 * 네트워크 실패 시 { breached: false, error } 로 fail-open (보안 저하 < UX 차단).
 */
export async function checkPasswordBreach(password: string, signal?: AbortSignal): Promise<BreachResult> {
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    // Abort 미지원 시 5s 타임아웃
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    signal?.addEventListener('abort', () => ctrl.abort())

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: { 'Add-Padding': 'true' }, // padding 으로 response 크기 고정 → 추가 보호
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return { breached: false, count: 0, error: `HIBP ${res.status}` }
    const text = await res.text()
    const lines = text.split('\n')
    for (const line of lines) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        const n = parseInt(countStr, 10)
        // padding entries 는 count=0 → 실 breach 만
        if (n > 0) return { breached: true, count: n }
      }
    }
    return { breached: false, count: 0 }
  } catch (e) {
    return { breached: false, count: 0, error: e instanceof Error ? e.message : 'unknown' }
  }
}
