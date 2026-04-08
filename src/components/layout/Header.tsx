import { Bell, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { profile } = useAuth()

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 shrink-0">
      {/* 검색 */}
      <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 flex-1 max-w-xs">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="통제번호, 이름, 부서 검색..."
          className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-full"
        />
      </div>

      <div className="flex-1" />

      {/* 알림 */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
        <Bell size={18} />
        {/* 뱃지 — 나중에 실제 알림 수로 교체 */}
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* 현재 날짜 */}
      <div className="text-xs text-slate-500 hidden md:block">
        {new Date().toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
        })}
      </div>

      {/* 역할 뱃지 */}
      {profile?.role && (
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-brand-900/50 text-brand-300 border border-brand-800">
          {profile.role === 'admin' ? '관리자' : profile.role === 'controller' ? '통제책임자' : '담당자'}
        </span>
      )}
    </header>
  )
}
