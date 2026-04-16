import { Bell, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  onMenuToggle: () => void
}

const ROLE_KO: Record<string, string> = {
  admin: '관리자', controller: '통제책임자', owner: '담당자',
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { profile } = useAuth()

  return (
    <header className="h-14 md:h-16 bg-brand-800 border-b border-slate-800 flex items-center px-4 md:px-6 gap-3 shrink-0">
      {/* 모바일 햄버거 */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-warm-400 hover:text-white hover:bg-brand-900 rounded-lg transition-all"
      >
        <Menu size={20} />
      </button>

      {/* 로고 텍스트 (모바일만) */}
      <span className="lg:hidden text-white font-bold text-sm">동양 포털</span>

      <div className="flex-1" />

      {/* 날짜 (중간 이상) */}
      <div className="text-xs text-warm-500 hidden md:block">
        {new Date().toLocaleDateString('ko-KR', {
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
        })}
      </div>

      {/* 역할 뱃지 */}
      {profile?.role && (
        <span className="text-xs px-2 py-1 rounded-full font-medium bg-brand-900/50 text-brand-300 border border-brand-800 hidden sm:inline">
          {ROLE_KO[profile.role] ?? profile.role}
        </span>
      )}

      {/* 알림 */}
      <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-warm-400 hover:text-white hover:bg-brand-900 transition-all">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>
    </header>
  )
}
