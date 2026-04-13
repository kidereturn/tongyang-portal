import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  BookOpen,
  Bot,
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
import { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'

const MAIN_TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: '홈' },
  { to: '/evidence', icon: FileCheck2, label: '증빙', roles: ['admin', 'owner'] },
  { to: '/inbox', icon: Inbox, label: '승인함', roles: ['admin', 'controller'] },
  { to: '/learning', icon: BarChart2, label: '학습' },
]

const MORE_ITEMS = [
  { to: '/courses', icon: BookOpen, label: '내 강좌' },
  { to: '/bingo', icon: Gamepad2, label: '빙고퀴즈' },
  { to: '/chatbot', icon: Bot, label: 'AI 챗봇' },
  { to: '/map', icon: Map, label: '지도' },
  { to: '/news', icon: Newspaper, label: '뉴스 분석' },
  { to: '/kpi', icon: TrendingUp, label: 'KPI 결과' },
  { to: '/webtoon', icon: Image, label: '웹툰' },
  { to: '/profile', icon: User, label: '내 정보' },
]

export default function MobileTabBar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const role = profile?.role ?? 'owner'
  const isAdmin = role === 'admin'

  const tabs = MAIN_TABS.filter(t => !t.roles || t.roles.includes(role as never))

  async function handleSignOut() {
    setMoreOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* 더보기 풀스크린 패널 */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-bottom">
          <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
            <p className="text-lg font-black text-slate-900">전체 메뉴</p>
            <button
              onClick={() => setMoreOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            >
              <X size={22} />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(100vh - 56px)' }}>
            {/* 프로필 카드 */}
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-4 text-white shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-black">
                {profile?.full_name?.slice(0, 1) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate">{profile?.full_name ?? '사용자'}</p>
                <p className="text-sm text-brand-100 truncate">{profile?.department ?? ''}</p>
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                {role === 'admin' ? '관리자' : role === 'controller' ? '승인자' : '담당자'}
              </span>
            </div>

            {/* 주요 메뉴 */}
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">주요 기능</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {MAIN_TABS.filter(t => !t.roles || t.roles.includes(role as never)).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-600 active:bg-slate-100'
                  )}
                >
                  <item.icon size={22} />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* 추가 메뉴 */}
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">추가 메뉴</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {MORE_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => clsx(
                    'flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-50 text-slate-600 active:bg-slate-100'
                  )}
                >
                  <item.icon size={22} />
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* 관리자 메뉴 */}
            {isAdmin && (
              <>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">관리자</p>
                <NavLink
                  to="/admin"
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => clsx(
                    'mb-4 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition',
                    isActive ? 'bg-purple-50 text-purple-700' : 'bg-slate-50 text-slate-700 active:bg-slate-100'
                  )}
                >
                  <Shield size={20} />
                  <span>관리자 설정</span>
                </NavLink>
              </>
            )}

            {/* 로그아웃 */}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-semibold text-red-600 transition active:bg-red-100"
            >
              <LogOut size={20} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg lg:hidden safe-bottom">
        <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
          {tabs.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition',
                isActive ? 'text-brand-600' : 'text-slate-400 active:text-slate-600'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-xl transition',
                    isActive && 'bg-brand-100'
                  )}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* 더보기 탭 */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-400 active:text-slate-600"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-xl">
              <Menu size={20} />
            </div>
            <span>더보기</span>
          </button>
        </div>
      </nav>
    </>
  )
}
