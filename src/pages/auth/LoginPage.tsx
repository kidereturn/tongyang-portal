import { useState } from 'react'
import { Eye, EyeOff, LogIn, AlertCircle, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 사번 입력 시 자동으로 이메일 형식으로 변환
    let loginEmail = email.trim()
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@tongyanginc.co.kr`
    }

    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (error) {
      setError(
        error.message.includes('Invalid login credentials')
          ? '아이디 또는 비밀번호가 올바르지 않습니다.'
          : error.message
      )
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* 왼쪽 브랜딩 영역 */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#1E3A5F] via-brand-800 to-brand-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white/30 rounded-full" />
          <div className="absolute top-32 left-32 w-40 h-40 border border-white/20 rounded-full" />
          <div className="absolute bottom-40 right-20 w-80 h-80 border border-white/20 rounded-full" />
          <div className="absolute bottom-20 right-32 w-48 h-48 border border-white/30 rounded-full" />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

        {/* 로고 */}
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
              <span className="text-white font-black text-xl">동</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">(주)동양</p>
              <p className="text-blue-200/70 text-sm">내부회계관리 시스템</p>
            </div>
          </div>
        </div>

        {/* 중앙 카피 */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-0.5 bg-blue-300/60" />
            <span className="text-blue-200/80 text-sm font-medium tracking-widest uppercase">Internal Controls</span>
          </div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            내부회계<br />증빙관리 포털
          </h1>
          <p className="text-blue-100/70 text-base leading-relaxed max-w-sm">
            증빙 업로드부터 결재 승인, KPI 관리까지<br />
            내부회계관리제도를 스마트하게 운영하세요.
          </p>

          <div className="flex gap-6 mt-10">
            {[
              { label: '총 통제활동', value: '420+' },
              { label: '등록 사용자', value: '300+' },
              { label: '처리 완료', value: '99%' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-white font-black text-2xl">{stat.value}</p>
                <p className="text-blue-200/60 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 */}
        <div className="relative">
          <p className="text-blue-200/40 text-xs">© 2026 (주)동양 · All rights reserved.</p>
        </div>
      </div>

      {/* 오른쪽 로그인 영역 */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-base">동</span>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-base">(주)동양 내부회계 포털</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900">로그인</h2>
            <p className="text-gray-500 text-sm mt-1.5">사번 또는 이메일로 로그인하세요</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">사번 또는 이메일</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="사번 입력 (예: 101267)"
                required
                className="form-input"
                autoComplete="username"
              />
              <p className="text-xs text-gray-400 mt-1.5">사번 입력 시 자동으로 이메일 변환됩니다</p>
            </div>

            <div>
              <label className="form-label">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="초기 비밀번호: 사번"
                  required
                  className="form-input pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:cursor-not-allowed
                         text-white font-bold text-sm rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all mt-2 shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={17} />
                  <span>로그인</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500">로그인 안내</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              최초 로그인 시 초기 비밀번호는 <strong className="text-gray-600">사번</strong>입니다.<br />
              로그인 문제가 있으면 관리자에게 문의하세요.
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 (주)동양 · 내부회계관리 시스템
          </p>
        </div>
      </div>
    </div>
  )
}
