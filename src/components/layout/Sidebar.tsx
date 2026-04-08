import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileCheck2,
  Inbox,
  GraduationCap,
  Newspaper,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { to: '/evidence',  icon: FileCheck2,      label: '증빙결재' },
  { to: '/inbox',     icon: Inbox,           label: '결재함', badge: true },
  { to: '/lms',       icon: GraduationCap,   label: '교육' },
  { to: '/info',      icon: Newspaper,       label: '정보허브' },
]

const adminItems = [
  { to: '/admin', icon: Settings, label: '관리자' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* 로고 */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">동</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">동양 포털</p>
            <p className="text-slate-500 text-xs">내부회계 통합</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-40" />
          </NavLink>
        ))}

        {/* 관리자 메뉴 */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                관리자
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                <Icon size={18} />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* 프로필 + 로그아웃 */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 mb-2">
          <div className="w-8 h-8 bg-brand-700 rounded-full flex items-center justify-center shrink-0">
            <span className="text-brand-200 text-xs font-bold">
              {profile?.full_name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {profile?.full_name ?? '로딩 중...'}
            </p>
            <p className="text-slate-400 text-xs truncate">
              {profile?.department ?? profile?.role ?? ''}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )
}
