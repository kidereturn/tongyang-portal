import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  BookOpen,
  Bot,
  ChevronDown,
  FileCheck2,
  Gamepad2,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Newspaper,
  Settings,
  Shield,
  TrendingUp,
  User,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  roles?: Array<'admin' | 'controller' | 'owner'>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '통합대시보드', icon: LayoutDashboard },
  { to: '/evidence', label: '증빙관리', icon: FileCheck2, roles: ['admin', 'owner'] },
  { to: '/inbox', label: '내승인함', icon: Inbox, roles: ['admin', 'controller'] },
  { to: '/courses', label: '내 강좌', icon: BookOpen },
  { to: '/learning', label: '학습현황', icon: BarChart2 },
  { to: '/map', label: '지도', icon: Map },
  { to: '/news', label: '뉴스 분석', icon: Newspaper },
  { to: '/kpi', label: 'KPI결과', icon: TrendingUp },
  { to: '/bingo', label: '빙고퀴즈', icon: Gamepad2 },
  { to: '/webtoon', label: '웹툰', icon: Image },
  { to: '/chatbot', label: 'AI챗봇', icon: Bot },
]

const ROLE_LABEL: Record<string, string> = {
  admin: '관리자',
  controller: '승인자',
  owner: '담당자',
}

const ROLE_CLASS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  controller: 'bg-blue-100 text-blue-700 border-blue-200',
  owner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

function filterNavItems(role?: string | null) {
  return NAV_ITEMS.filter(item => !item.roles || item.roles.includes((role ?? 'owner') as never))
}

export default function TopNav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const visibleItems = filterNavItems(profile?.role)
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function handleSignOut() {
    setProfileOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
          <Link to="/dashboard" className="mr-2 flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 shadow">
              <span className="text-lg font-black text-white">동</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-black leading-tight text-slate-900">(주)동양 내부회계 LMS</p>
              <p className="text-[10px] font-medium tracking-[0.14em] text-slate-400">
                TONGYANG ACCOUNTING EDUTECH
              </p>
            </div>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <item.icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Shield size={15} />
                <span>관리자</span>
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            </button>

            <div ref={profileRef} className="relative hidden sm:block">
              <button
                onClick={() => setProfileOpen(value => !value)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">
                  {profile?.full_name?.slice(0, 1) ?? '?'}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold text-slate-900">{profile?.full_name ?? '사용자'}</p>
                </div>
                {profile?.role && (
                  <span className={clsx('badge border text-xs', ROLE_CLASS[profile.role] ?? 'badge-gray')}>
                    {ROLE_LABEL[profile.role] ?? profile.role}
                  </span>
                )}
                <ChevronDown size={14} className={clsx('text-slate-400 transition', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-14 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">{profile?.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{profile?.department ?? '-'}</p>
                    <p className="text-xs text-slate-400">{profile?.email ?? '-'}</p>
                  </div>
                  <div className="p-2">
                    <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                      <User size={15} className="text-slate-400" />
                      내 정보
                    </button>
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <Settings size={15} className="text-slate-400" />
                        관리자 설정
                      </NavLink>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut size={15} />
                      로그아웃
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen(value => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white lg:hidden">
            <nav className="space-y-1 p-3">
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    )
                  }
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                      isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-700 hover:bg-slate-50'
                    )
                  }
                >
                  <Shield size={18} />
                  <span>관리자</span>
                </NavLink>
              )}

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={18} />
                <span>로그아웃</span>
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
