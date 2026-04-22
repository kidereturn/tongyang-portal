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

  // Password reset — simplified to admin contact info only (no email flow)
  const [showReset, setShowReset] = useState(false)

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
      {/* Top nav removed on login page — branding shown inside the blue cinematic panel */}
      <div className="login-wrap" style={{ minHeight: '100vh' }}>
        {/* Left: cinematic dark */}
        <div className="login-left" style={{ padding: '28px 72px 56px' }}>
          <div className="bg-orbit" />
          <div className="stars-bg" />

          {/* marginLeft: -45px ≈ 왼쪽으로 1.2cm 이동 (1cm ≈ 37.8px, 1.2cm ≈ 45px) */}
          <div className="login-hd" style={{ marginTop: 0, marginLeft: -45 }}>
            <div className="mini-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <img src="/tongyang_logo_main.png" alt="동양" style={{ height: 84, width: 'auto', display: 'block' }} />
              <span>INTERNAL CONTROLS</span>
            </div>
          </div>

          <div className="login-hero">
            <div className="cycle-tag" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: '#FFFFFF' }}>
              <span style={{ color: '#FFFFFF' }}>{dateLabel}</span>
              <span style={{ fontFamily: 'var(--f-mono)', color: '#FFFFFF', fontWeight: 700 }}>{timeLabel}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(41px, 5.12vw, 66px)', whiteSpace: 'nowrap' }}>내부회계 Portal</h1>
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
          <h2>오늘 하루도 노력하는 멋진 당신을 응원합니다!</h2>
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
              onClick={() => setShowReset(true)}
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

      {/* 비밀번호 찾기 안내 모달 — 관리자 연락 안내만 */}
      {showReset && (
        <div
          onClick={() => setShowReset(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowReset(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 100%)', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>PASSWORD</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: 'var(--at-ink)' }}>비밀번호 찾기</div>
              </div>
              <button onClick={() => setShowReset(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--at-ink-mute)' }}><X size={18} /></button>
            </div>

            <div style={{ padding: 18, background: '#EEF4FE', border: '1px solid #DCE8FB', borderRadius: 10, fontSize: 13, color: '#1E40AF', lineHeight: 1.7, marginBottom: 14 }}>
              🔑 비밀번호를 잊으셨나요?
              <br />
              <b>내부회계팀 관리자</b>에게 문의해주세요.<br />
              관리자가 초기화해드립니다.
            </div>

            <div style={{ padding: 14, background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)', lineHeight: 1.7 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-ink)', marginBottom: 6, letterSpacing: '0.04em' }}>📞 담당자</div>
              <b style={{ color: 'var(--at-ink)' }}>박한진 과장</b><br />
              <b style={{ color: 'var(--at-ink)' }}>최종현 대리</b>
            </div>

            <p style={{ marginTop: 14, fontSize: 11, color: 'var(--at-ink-faint)', lineHeight: 1.5, textAlign: 'center' }}>
              💡 최초 로그인 시 초기 비밀번호는 <b>사번</b>입니다.
            </p>

            <button
              onClick={() => setShowReset(false)}
              className="login-submit"
              style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
