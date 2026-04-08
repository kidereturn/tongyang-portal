import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message
      )
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* 배경 글로우 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-xl shadow-brand-900/50">
            <span className="text-white font-black text-2xl">동</span>
          </div>
          <h1 className="text-2xl font-bold text-white">동양 내부회계 포털</h1>
          <p className="text-slate-400 text-sm mt-1">업무 시스템에 로그인하세요</p>
        </div>

        {/* 카드 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">로그인</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@tongyang.co.kr"
                required
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 pr-11 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-brand-800 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>로그인</span>
                </>
              )}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-slate-500 mt-6">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              가입 신청
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2026 (주)동양 · 내부회계관리 시스템
        </p>
      </div>
    </div>
  )
}
