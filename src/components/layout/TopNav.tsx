import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, FileCheck2, BookOpen, BarChart2,
  Map, Newspaper, TrendingUp, Bot, Inbox,
  Settings, LogOut, ChevronDown, Bell, Menu, X, User,
  Shield
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

const ROLE_KO: Record<string, string> = {
  admin: '관리자', controller: '통제책임자', owner: '증빙담당자',
}
const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  controller: 'bg-blue-100 text-blue-700 border-blue-200',
  owner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

interface NavItem { to: string; icon: React.ElementType; label: string; roles?: string[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: LayoutDashboard, label: '통합대시보드' },
  { to: '/evidence',   icon: FileCheck2,       label: '증빙관리',  roles: ['owner', 'admin'] },
  { to: '/inbox',      icon: Inbox,            label: '내승인함',  roles: ['controller', 'admin'] },
  { to: '/courses',    icon: BookOpen,         label: '내강좌' },
  { to: '/learning',   icon: BarChart2,        label: '학습현황' },
  { to: '/map',        icon: Map,              label: '지도' },
  { to: '/news',       icon: Newspaper,        label: '뉴스·분석' },
  { to: '/kpi',        icon: TrendingUp,       label: 'KPI결과' },
  { to: '/chatbot',    icon: Bot,              label: 'AI챗봇' },
]

export default function TopNav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const isAdmin = profile?.role === 'admin'
  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(profile?.role ?? '')
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    setProfileOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* 상단 네비게이션 바 */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center gap-2">

          {/* 로고 */}
          <Link to="/dashboard" className="flex items-center gap-3 shrink-0 mr-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-base">동</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-gray-900 font-bold text-sm leading-tight">(주)동양 내부회계 LMS</p>
              <p className="text-gray-400 text-[10px] font-medium tracking-wide">TONGYANG ACCOUNTING EDUTECH</p>
            </div>
          </Link>

          {/* 데스크톱 네비 */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {visibleItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) => clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-purple-50 text-purple-700 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <Shield size={15} />
                <span>관리자</span>
              </NavLink>
            )}
          </nav>

          <div className="flex-1 lg:flex-none" />

          {/* 알림 */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* 프로필 드롭다운 */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {profile?.full_name?.charAt(0) ?? '?'}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                  {profile?.full_name ?? '로딩 중...'}
                </p>
              </div>
              {profile?.role && (
                <span className={clsx('hidden sm:inline-flex badge border text-xs', ROLE_COLOR[profile.role] ?? 'badge-gray')}>
                  {ROLE_KO[profile.role] ?? profile.role}
                </span>
              )}
              <ChevronDown size={14} className={clsx('text-gray-400 transition-transform duration-150', profileOpen && 'rotate-180')} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-xl border border-gray-100 shadow-xl z-50"
                style={{ animation: 'slideDown 0.15s ease-out' }}>
                <div className="p-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{profile?.department}</p>
                  <p className="text-xs text-gray-400">{profile?.email}</p>
                </div>
                <div className="p-1.5">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    <User size={15} className="text-gray-400" />
                    내 정보
                  </button>
                  {isAdmin && (
                    <NavLink to="/admin" onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <Settings size={15} className="text-gray-400" />
                      관리자 설정
                    </NavLink>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 모바일 햄버거 */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-all"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg"
            style={{ animation: 'slideDown 0.2s ease-out' }}>
            <nav className="p-3 space-y-0.5">
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <Shield size={17} />
                  <span>관리자</span>
                </NavLink>
              )}
              <div className="pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={17} />
                  <span>로그아웃</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
