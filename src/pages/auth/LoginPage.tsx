import { useState } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
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
        <a href="/" className="at-nav-logo" style={{ textDecoration: 'none' }}>
          <div className="mark">T</div>
          <span>동양</span>
          <span className="en">INTERNAL CONTROLS</span>
        </a>
        <div className="at-nav-items">
          <div className="at-nav-item">소개</div>
          <div className="at-nav-item">내부회계</div>
          <div className="at-nav-item">뉴스</div>
          <div className="at-nav-item">문의</div>
        </div>
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
              <span>INTERNAL CONTROLS · CYCLE 04</span>
            </div>
            <div className="eugene">
              <span className="ico">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2 L14.5 8.5 L21 10 L14.5 11.5 L12 18 L9.5 11.5 L3 10 L9.5 8.5 Z" />
                </svg>
              </span>
              Powered by Eugene
            </div>
          </div>

          <div className="login-hero">
            <div className="cycle-tag">2026 · Q2 · Cycle 04 · In Progress</div>
            <h1>고요하게<br />움직입니다.</h1>
            <p className="en">
              424개 통제활동, <b>477명</b>의 구성원, <b>28개 사업장</b>이 하나의 사이클로 연결되어 있습니다.
              오늘도 당신의 기록이 조직의 신뢰를 만듭니다.
            </p>
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
              <div className="bn">Ready-mix</div>
              <div className="bl">레미콘</div>
            </div>
            <div className="b">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M3 21 L3 9 L12 3 L21 9 L21 21 Z" /><path d="M9 21 V13 H15 V21" />
                </svg>
              </div>
              <div className="bn">Construction</div>
              <div className="bl">건설</div>
            </div>
            <div className="b">
              <div className="bi">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M12 2a9 9 0 1 0 9 9h-9z" /><path d="M12 2v9" />
                </svg>
              </div>
              <div className="bn">Environment</div>
              <div className="bl">환경</div>
            </div>
          </div>

          <div className="login-bot">
            <div className="status">
              <span className="dot" />
              <span>All systems · Normal</span>
            </div>
            <div>© 2026 Tongyang Group · v4.2.1</div>
          </div>
        </div>

        {/* Right: ivory form */}
        <div className="login-right">
          <div className="eyebrow">01 · SIGN IN</div>
          <h2>다시 만나 반갑습니다.</h2>
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

          <div className="login-foot">비밀번호 재설정 · 관리자 문의 · 개인정보처리방침</div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
