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
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-brand-800 to-brand-900 p-12 lg:flex lg:w-[55%] lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-20 top-20 h-64 w-64 rounded-full border border-white/30" />
          <div className="absolute left-32 top-32 h-40 w-40 rounded-full border border-white/20" />
          <div className="absolute bottom-40 right-20 h-80 w-80 rounded-full border border-white/20" />
          <div className="absolute bottom-20 right-32 h-48 w-48 rounded-full border border-white/30" />
        </div>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
              <span className="text-xl font-black text-white">TY</span>
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-white">(주)동양 내부통제</p>
              <p className="text-sm text-blue-200/70">증빙관리 포털</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center gap-2">
            <div className="h-0.5 w-8 bg-blue-300/60" />
            <span className="text-sm font-medium uppercase tracking-widest text-blue-200/80">Internal Controls</span>
          </div>

          <h1 className="mb-4 text-4xl font-black leading-tight text-white">
            내부통제
            <br />
            증빙관리 포털
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-blue-100/70">
            증빙 업로드부터 결재 확인, KPI 관리까지
            <br />
            내부통제 업무를 한곳에서 운영합니다.
          </p>

          <div className="mt-10 flex gap-6">
            {[
              { label: '통제활동', value: '420+' },
              { label: '등록 사용자', value: '300+' },
              { label: '처리 완료율', value: '99%' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-0.5 text-xs text-blue-200/60">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <p className="text-xs text-blue-200/40">© 2026 (주)동양 All rights reserved.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800">
              <span className="text-base font-black text-white">TY</span>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">(주)동양 내부통제 포털</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">로그인</h2>
            <p className="mt-1.5 text-sm text-gray-500">사번과 비밀번호로 로그인해주세요.</p>
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
              <p className="mt-1.5 text-xs text-gray-400">로그인 ID는 이메일이 아니라 사번입니다.</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:bg-brand-800 disabled:cursor-not-allowed disabled:bg-brand-300"
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

          <div className="mt-8 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Shield size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500">로그인 안내</p>
            </div>
            <p className="text-xs leading-relaxed text-gray-400">
              최초 로그인 시 초기 비밀번호는 <strong className="text-gray-600">사번</strong>입니다.
              <br />
              사용자가 비밀번호를 변경한 이후에는 변경한 비밀번호가 계속 유지됩니다.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">© 2026 (주)동양 내부통제관리 시스템</p>
        </div>
      </div>
    </div>
  )
}
