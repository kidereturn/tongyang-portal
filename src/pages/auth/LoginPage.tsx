import { useEffect, useState } from 'react'
import { AlertCircle, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function buildEmployeeLoginEmail(employeeId: string) {
  return `${employeeId.trim()}@tongyanginc.co.kr`
}

export default function LoginPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Real-time clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const dateLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
  const timeLabel = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Password reset modal
  const [showReset, setShowReset] = useState(false)
  const [resetEmployeeId, setResetEmployeeId] = useState('')
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    const id = resetEmployeeId.trim()
    setResetMsg(null)
    if (!id) { setResetMsg({ type: 'err', text: '사번을 입력해주세요.' }); return }
    setResetLoading(true)
    try {
      // Call our server endpoint — it looks up the user's REAL contact_email
      // from profiles and sends the reset link there via Resend.
      const res = await fetch('/api/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setResetMsg({ type: 'err', text: data?.error ? `실패: ${data.error}` : '재설정 요청 중 오류가 발생했습니다. 관리자(내부회계팀)에게 문의해주세요.' })
      } else {
        setResetMsg({
          type: 'ok',
          text: data.message ?? '입력하신 사번으로 등록된 연락처 이메일이 있을 경우 재설정 링크를 발송했습니다.',
        })
      }
    } catch (err: any) {
      setResetMsg({ type: 'err', text: err?.message ?? '오류가 발생했습니다.' })
    } finally {
      setResetLoading(false)
    }
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const normalizedEmployeeId = employeeId.trim()

    if (!normalizedEmployeeId) {
      setError('사번을 입력해주세요.')
      setLoading(false)
      return
    }

    if (normalizedEmployeeId.includes('@')) {
      setError('이메일이 아니라 사번으로 로그인해주세요.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: buildEmployeeLoginEmail(normalizedEmployeeId),
      password,
    })

    if (authError) {
      setError(authError.message.includes('Invalid login credentials') ? '사번 또는 비밀번호가 올바르지 않습니다.' : authError.message)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div className="screen-frame">
      <nav className="at-nav">
        <a href="/" className="at-nav-logo" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <img src="/ci_영문_05_preview_rev_1.png" alt="동양" style={{ height: 30, width: 'auto', display: 'block' }} />
          <span className="en">INTERNAL CONTROLS</span>
        </a>
        <div className="at-nav-right">
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em' }}>KO · EN</div>
        </div>
      </nav>

      <div className="login-wrap">
        {/* Left: cinematic dark */}
        <div className="login-left">
          <div className="bg-orbit" />
          <div className="stars-bg" />

          <div className="login-hd">
            <div className="mini-logo">
              <div className="mk">T</div>
              <span>INTERNAL CONTROLS</span>
            </div>
          </div>

          <div className="login-hero">
            <div className="cycle-tag" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: '#FFFFFF' }}>
              <span style={{ color: '#FFFFFF' }}>{dateLabel}</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: '#FFFFFF', fontWeight: 700 }}>{timeLabel}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(51px, 6.4vw, 83px)', whiteSpace: 'nowrap' }}>내부회계 Portal System</h1>
            <p className="en">Internal Accounting Control System</p>
            <div className="quote">
              "Control is not a constraint — it's the quiet architecture of trust."
            </div>
          </div>

          <div className="login-bus">
            <div className="b active">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="3" y="10" width="18" height="11" rx="1" />
                  <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                </svg>
              </div>
              <div className="bn">Finance</div>
              <div className="bl">금융</div>
            </div>
            <div className="b">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 17l6-2 6 2 6-2v4H3z" />
                  <circle cx="6" cy="9" r="2" />
                </svg>
              </div>
              <div className="bn">Construction Materials Network</div>
              <div className="bl">레미콘</div>
            </div>
            <div className="b">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 21 L3 9 L12 3 L21 9 L21 21 Z" /><path d="M9 21 V13 H15 V21" />
                </svg>
              </div>
              <div className="bn">Construction Services</div>
              <div className="bl">건설</div>
            </div>
            <div className="b">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 2a9 9 0 1 0 9 9h-9z" /><path d="M12 2v9" />
                </svg>
              </div>
              <div className="bn">Infrastructure Engineering</div>
              <div className="bl">인프라</div>
            </div>
          </div>

          <div className="login-bot">
            <div className="status">
              <span className="dot" />
              <span>All systems · Normal</span>
            </div>
            <div>COPYRIGHT(C) 2026 TONGYANG Inc. ALL RIGHT RESERVED.</div>
          </div>
        </div>

        {/* Right: ivory form */}
        <div className="login-right">
          <div className="eyebrow">01 · SIGN IN</div>
          <h2>오늘 하루도 화이팅 하는 멋진 당신을 응원합니다!</h2>
          <p className="sub">사번으로 로그인하세요. 내부회계 포털 전용 계정입니다.</p>

          {error && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', fontSize: 13 }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleLogin}>
            <div className="fld">
              <div className="fld-lab">사번 <span className="req">ID</span></div>
              <input
                className="fld-in"
                type="text"
                placeholder="예: 101974"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                autoComplete="username"
                required
              />
              <div className="hint">로그인 ID는 이메일이 아닌 <b>사번</b>입니다.</div>
            </div>
            <div className="fld">
              <div className="fld-lab">비밀번호 <span className="req">PW</span></div>
              <div className="pw-wrap">
                <input
                  className="fld-in"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="초기 비밀번호는 사번"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <span className="eye" onClick={() => setShowPassword(v => !v)} style={{ cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
              </div>
            </div>
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                  로그인 중...
                </>
              ) : (
                <>
                  포털 입장하기
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-notice">
            <div className="ln-hd">
              <span style={{ width: 14, height: 14, borderRadius: 3, background: '#3182F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>✓</span>
              <label>최초 로그인 시 초기 비밀번호는 사번</label>
            </div>
            <div className="ln-tx">
              사용자가 비밀번호를 변경한 이후에는 변경한 비밀번호가 계속 유지됩니다.
              공용 단말이나 외부 기기에서 로그인한 경우 반드시 로그아웃해주세요.
            </div>
          </div>

          <div className="login-foot" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmployeeId(employeeId); setResetMsg(null) }}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', textDecoration: 'underline', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <KeyRound size={12} /> 비밀번호 찾기
            </button>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>관리자 문의</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>개인정보처리방침</span>
          </div>
        </div>
      </div>

      {/* 비밀번호 찾기 모달 */}
      {showReset && (
        <div
          onClick={() => setShowReset(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowReset(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 100%)', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>RESET</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: 'var(--at-ink)' }}>비밀번호 찾기</div>
              </div>
              <button onClick={() => setShowReset(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--at-ink-mute)' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--at-ink-mute)', lineHeight: 1.6, marginBottom: 14 }}>
              사번으로 등록된 <b>연락처 이메일</b>(내 정보에 저장된 실제 이메일)로 비밀번호 재설정 링크를 보내드립니다.
            </p>

            <form onSubmit={handlePasswordReset}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--at-ink)' }}>사번</span>
                <input
                  type="text"
                  value={resetEmployeeId}
                  onChange={e => setResetEmployeeId(e.target.value)}
                  placeholder="예: 101974"
                  autoFocus
                  style={{ padding: '10px 12px', border: '1px solid var(--at-ink-hair)', borderRadius: 8, fontSize: 13, color: 'var(--at-ink)' }}
                />
              </label>

              {resetMsg && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.55,
                  marginBottom: 12,
                  background: resetMsg.type === 'ok' ? '#ECFDF5' : '#FEF2F2',
                  border: `1px solid ${resetMsg.type === 'ok' ? '#A7F3D0' : '#FCA5A5'}`,
                  color: resetMsg.type === 'ok' ? '#065F46' : '#991B1B',
                }}>
                  {resetMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading || !resetEmployeeId.trim()}
                className="login-submit"
                style={{ width: '100%', justifyContent: 'center', opacity: (resetLoading || !resetEmployeeId.trim()) ? 0.5 : 1 }}
              >
                {resetLoading ? '발송 중...' : '재설정 링크 받기'}
              </button>
            </form>

            <p style={{ marginTop: 12, fontSize: 11, color: 'var(--at-ink-faint)', lineHeight: 1.5 }}>
              메일이 오지 않을 경우 내부회계팀(관리자)에게 문의해주세요.
              초기 비밀번호는 <b>사번</b>입니다.
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
