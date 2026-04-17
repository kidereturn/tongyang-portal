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
      {/* Left panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-brand-800 to-brand-900 p-12 lg:flex lg:w-[55%] lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-20 top-20 h-64 w-64 rounded-full border border-cyan-400/20" />
          <div className="absolute left-32 top-32 h-40 w-40 rounded-full border border-cyan-300/15" />
          <div className="absolute bottom-40 right-20 h-80 w-80 rounded-full border border-cyan-300/15" />
          <div className="absolute bottom-20 right-32 h-48 w-48 rounded-full border border-cyan-400/20" />
        </div>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-4">
            <img src="/tongyang_ci_en.png" alt="TONGYANG" className="h-12 grayscale brightness-0 invert" />
          </div>
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-0.5 w-8 bg-blue-300/60" />
            <span className="text-sm font-medium uppercase tracking-widest text-blue-200/80">Internal Controls</span>
          </div>

          <h1 className="mb-4 text-3xl font-bold leading-tight text-white whitespace-nowrap">
            내부회계 Portal System
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-blue-100/70">
            교육관리, 증빙관리 및 결재, KPI관리, 참여형 미디어, 이벤트까지 한 곳에서 운영합니다
          </p>

          <p className="mt-6 text-xs italic text-blue-200/50 tracking-wide">
            "Through ICFR, clarity in numbers leads to confidence in decisions."
          </p>

          <div className="mt-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
              <span className="text-[10px] font-mono tracking-[0.3em] text-cyan-300/60">SYSTEM ONLINE</span>
              <div className="h-px flex-1 bg-gradient-to-l from-cyan-400/40 to-transparent" />
            </div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full bg-cyan-400/30"
                  style={{
                    opacity: 0.2 + Math.random() * 0.8,
                    animation: `pulse ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-blue-200/40">© 2026 (주)동양 All rights reserved.</p>
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
