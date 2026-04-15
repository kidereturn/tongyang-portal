import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  FileCheck2,
  Gamepad2,
  Image,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  MessageCircle,
  Newspaper,
  Settings,
  Shield,
  TrendingUp,
  User,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../hooks/useAuth'
import { usePoints } from '../../hooks/usePoints'
import { supabase } from '../../lib/supabase'

type Notification = {
  id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
  sender?: { full_name: string | null } | null
}

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  roles?: Array<'admin' | 'controller' | 'owner'>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'HOME', icon: LayoutDashboard },
  { to: '/evidence', label: '증빙관리', icon: FileCheck2, roles: ['admin', 'owner'] },
  { to: '/inbox', label: '내승인함', icon: Inbox, roles: ['admin', 'controller'] },
  { to: '/courses', label: '내 강좌', icon: BookOpen },
  { to: '/learning', label: '강좌관리', icon: BarChart2 },
  { to: '/map', label: '지도', icon: Map, roles: ['admin'] },
  { to: '/news', label: '회사소식과 뉴스', icon: Newspaper },
  { to: '/kpi', label: 'KPI결과', icon: TrendingUp },
  { to: '/bingo', label: '빙고퀴즈', icon: Gamepad2 },
  { to: '/webtoon', label: '웹툰', icon: Image },
  { to: '/chatbot', label: 'AI챗봇', icon: Bot },
  { to: '/tellme', label: 'Tell me!!', icon: MessageCircle },
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
  const { totalPoints } = usePoints()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notiOpen, setNotiOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)
  const notiRef = useRef<HTMLDivElement>(null)

  const visibleItems = filterNavItems(profile?.role)
  const isAdmin = profile?.role === 'admin'

  const abortRef = useRef<AbortController | null>(null)
  const fetchingRef = useRef(false)

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id || fetchingRef.current) return
    fetchingRef.current = true

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const { data } = await (supabase as any)
        .from('notifications')
        .select('id, title, body, is_read, created_at, sender_id')
        .eq('recipient_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)
        .abortSignal(controller.signal) as { data: Array<{ id: string; title: string; body: string | null; is_read: boolean; created_at: string; sender_id: string | null }> | null }
      if (controller.signal.aborted) return
      if (data) {
        const senderIds = [...new Set(data.map(n => n.sender_id).filter(Boolean))]
        const senderMap: Record<string, string> = {}
        if (senderIds.length) {
          const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', senderIds).abortSignal(controller.signal) as { data: Array<{ id: string; full_name: string | null }> | null }
          if (controller.signal.aborted) return
          for (const p of profiles ?? []) senderMap[p.id] = p.full_name ?? ''
        }
        setNotifications(data.map(n => ({
          ...n,
          sender: n.sender_id ? { full_name: senderMap[n.sender_id] ?? null } : null,
        })))
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    } finally {
      fetchingRef.current = false
    }
  }, [profile?.id])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => {
      clearInterval(interval)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    await (supabase as any).from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function markAllAsRead() {
    if (!profile?.id) return
    await (supabase as any).from('notifications').update({ is_read: true }).eq('recipient_id', profile.id).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiOpen(false)
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
        <div className="mx-auto flex h-14 sm:h-16 max-w-screen-2xl items-center gap-3 px-3 sm:px-4 md:px-6">
          <Link to="/dashboard" className="mr-1 flex items-center shrink-0">
            <div className="hidden lg:block">
              <p className="text-sm font-black leading-tight text-slate-900">(주)동양 내부회계 PORTAL</p>
              <p className="text-[10px] font-medium tracking-[0.14em] text-slate-400">
                TONGYANG INTERNAL CONTROLS
              </p>
            </div>
            <p className="text-sm font-black text-slate-900 lg:hidden">(주)동양 PORTAL</p>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide lg:flex">
            {visibleItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition',
                    isActive ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Shield size={14} />
                <span>관리자</span>
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div ref={notiRef} className="relative">
              <button
                onClick={() => setNotiOpen(v => !v)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notiOpen && (
                <div className="absolute right-0 top-12 max-w-[90vw] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-bold text-slate-900">알림</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs font-medium text-brand-600 hover:text-brand-800">
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-400">알림이 없습니다</div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => { if (!n.is_read) markAsRead(n.id) }}
                          className={clsx(
                            'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
                            !n.is_read && 'bg-brand-50/40'
                          )}
                        >
                          <div className={clsx(
                            'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                            n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'
                          )}>
                            {n.is_read ? <Check size={12} /> : <Bell size={12} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={clsx('text-sm', n.is_read ? 'text-slate-600' : 'font-semibold text-slate-900')}>
                              {n.title}
                            </p>
                            {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                            <p className="mt-1 text-[11px] text-slate-400">
                              {n.sender?.full_name ? `${n.sender.full_name} · ` : ''}
                              {new Date(n.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 데스크톱 프로필 드롭다운 */}
            <div ref={profileRef} className="relative hidden lg:block">
              <button
                onClick={() => setProfileOpen(value => !value)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">
                  {profile?.full_name?.slice(0, 1) ?? '?'}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-bold text-slate-900">
                    {profile?.full_name ?? '사용자'}
                    <span className="ml-1.5 text-xs font-black text-amber-500">{totalPoints}P</span>
                  </p>
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
                    <NavLink
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <User size={15} className="text-slate-400" />
                      내 정보
                    </NavLink>
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
          </div>
        </div>
      </header>
    </>
  )
}
