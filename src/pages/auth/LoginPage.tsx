import { useState } from 'react'
import { AlertCircle, Eye, EyeOff, LogIn, Shield } from 'lucide-react'
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

    const { error } = await supabase.auth.signInWithPassword({
      email: buildEmployeeLoginEmail(normalizedEmployeeId),
      password,
    })

    if (error) {
      setError(error.message.includes('Invalid login credentials') ? '사번 또는 비밀번호가 올바르지 않습니다.' : error.message)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brochure image as background, content anchored at bottom */}
      <div className="relative hidden overflow-hidden bg-brand-900 lg:flex lg:w-[55%] lg:flex-col lg:justify-end">
        {/* Background image fills entire panel */}
        <img
          src="/login_bg.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark gradient at bottom for text readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Foreground content — sits at the bottom, leaves the top half of image visible */}
        <div className="relative z-10 p-12 pb-10 pt-40">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-0.5 w-8 bg-blue-300/70" />
            <span className="text-sm font-medium uppercase tracking-widest text-blue-100/90 drop-shadow">
              Internal Controls
            </span>
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-white whitespace-nowrap drop-shadow-lg">
            내부회계 Portal System
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-blue-50/90 drop-shadow">
            교육관리, 증빙관리 및 결재, KPI관리, 참여형 미디어, 이벤트까지 한 곳에서 운영합니다
          </p>

          <p className="mt-6 text-xs italic text-blue-100/80 tracking-wide drop-shadow">
            "Through ICFR, clarity in numbers leads to confidence in decisions."
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-300/50 to-transparent" />
              <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-200/80">SYSTEM ONLINE</span>
              <div className="h-px flex-1 bg-gradient-to-l from-cyan-300/50 to-transparent" />
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full bg-cyan-300/50"
                  style={{
                    opacity: 0.3 + Math.random() * 0.7,
                    animation: `pulse ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="mt-8 text-xs text-blue-100/60 drop-shadow">© 2026 (주)동양 All rights reserved.</p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/tongyang_ci_en.png" alt="TONGYANG" className="h-8" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-brand-900">로그인</h2>
            <p className="mt-1.5 text-sm text-warm-500">사번과 비밀번호로 로그인해주세요.</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">사번</label>
              <input
                type="text"
                value={employeeId}
                onChange={event => setEmployeeId(event.target.value)}
                placeholder="예: 101267"
                required
                className="form-input"
                autoComplete="username"
              />
              <p className="mt-1.5 text-xs text-warm-400">로그인 ID는 이메일이 아니라 사번입니다.</p>
            </div>

            <div>
              <label className="form-label">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="초기 비밀번호는 사번"
                  required
                  className="form-input pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 transition-colors hover:text-warm-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-900 active:bg-brand-950 disabled:cursor-not-allowed disabled:bg-brand-300"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <LogIn size={17} />
                  <span>로그인</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-warm-100 bg-warm-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield size={14} className="text-warm-400" />
              <p className="text-xs font-semibold text-warm-500">로그인 안내</p>
            </div>
            <p className="text-xs leading-relaxed text-warm-400">
              최초 로그인 시 초기 비밀번호는 <strong className="text-warm-600">사번</strong>입니다.
              <br />
              사용자가 비밀번호를 변경한 이후에는 변경한 비밀번호가 계속 유지됩니다.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-warm-400">© 2026 (주)동양 내부통제관리 시스템</p>
        </div>
      </div>
    </div>
  )
}
