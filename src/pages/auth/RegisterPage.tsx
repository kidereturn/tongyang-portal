import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', password: '', passwordConfirm: '',
    fullName: '', department: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.passwordConfirm) {
      return setError('비밀번호가 일치하지 않습니다.')
    }
    if (form.password.length < 8) {
      return setError('비밀번호는 8자 이상이어야 합니다.')
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          department: form.department,
        },
      },
    })

    if (error) setError(error.message)
    else setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/40 rounded-full border border-green-700 mb-6">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">가입 신청 완료</h2>
          <p className="text-warm-400 text-sm mb-6">
            관리자 승인 후 로그인이 가능합니다.<br />
            승인 완료 시 이메일로 안내드립니다.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-brand-800 hover:bg-warm-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-all"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-800/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-800 rounded-lg mb-4">
            <span className="text-white font-bold text-2xl">동</span>
          </div>
          <h1 className="text-2xl font-bold text-white">가입 신청</h1>
          <p className="text-warm-400 text-sm mt-1">관리자 승인 후 계정이 활성화됩니다</p>
        </div>

        <div className="bg-brand-800 border border-slate-800 rounded-lg p-8 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-warm-300 mb-1.5">이름 *</label>
                <input
                  type="text" value={form.fullName} onChange={update('fullName')}
                  placeholder="홍길동" required
                  className="w-full bg-brand-700 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder-slate-500 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-warm-300 mb-1.5">부서</label>
                <input
                  type="text" value={form.department} onChange={update('department')}
                  placeholder="내부회계팀"
                  className="w-full bg-brand-700 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 placeholder-slate-500 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-300 mb-1.5">이메일 *</label>
              <input
                type="email" value={form.email} onChange={update('email')}
                placeholder="example@tongyang.co.kr" required
                className="w-full bg-brand-700 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-300 mb-1.5">비밀번호 * (8자 이상)</label>
              <input
                type="password" value={form.password} onChange={update('password')}
                placeholder="••••••••" required
                className="w-full bg-brand-700 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-300 mb-1.5">비밀번호 확인 *</label>
              <input
                type="password" value={form.passwordConfirm} onChange={update('passwordConfirm')}
                placeholder="••••••••" required
                className="w-full bg-brand-700 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 transition-all"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-brand-800 hover:bg-warm-500 disabled:bg-brand-800 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><UserPlus size={18} /><span>가입 신청하기</span></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-warm-500 mt-6">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
