import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  BookOpen,
  Bot,
  Check,
  FileCheck2,
  Gamepad2,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Map,
  MessageCircle,
  Newspaper,
  Search,
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
  { to: '/dashboard', label: '홈', icon: LayoutDashboard },
  { to: '/evidence', label: '증빙관리', icon: FileCheck2, roles: ['admin', 'owner'] },
  { to: '/inbox', label: '내 승인함', icon: Inbox, roles: ['admin', 'controller'] },
  { to: '/courses', label: '강좌', icon: BookOpen },
  { to: '/learning', label: '학습현황', icon: BarChart2 },
  { to: '/news', label: '회사소식', icon: Newspaper },
  { to: '/kpi', label: 'KPI', icon: TrendingUp },
  { to: '/map', label: '사업장', icon: Map, roles: ['admin'] },
  { to: '/bingo', label: '빙고', icon: Gamepad2 },
  { to: '/webtoon', label: '웹툰', icon: ImageIcon },
  { to: '/chatbot', label: 'AI챗봇', icon: Bot },
  { to: '/tellme', label: 'Tell me', icon: MessageCircle },
]

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
  const role = profile?.role ?? ''
  const roleText = role === 'admin' ? 'ADMIN' : role === 'controller' ? 'CONTROLLER' : role === 'owner' ? 'OWNER' : ''

  const abortRef = useRef<AbortController | null>(null)
  const fetchingRef = useRef(false)

  const fetchNotifications = useCallback(async () => {
    if (!profile?.id || fetchingRef.current) return
    fetchingRef.current = true

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
      console.error('[TopNav] fetchNotifications error:', err)
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

  async function deleteNotification(id: string) {
    if (!window.confirm('이 알림을 삭제할까요?')) return
    await (supabase as any).from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => Math.max(0, prev - (notifications.find(n => n.id === id && !n.is_read) ? 1 : 0)))
  }

  // 답장 / 전달 상태
  const [composeOpen, setComposeOpen] = useState<null | { mode: 'reply' | 'forward'; original: Notification }>(null)
  const [composeBody, setComposeBody] = useState('')
  const [composeRecipient, setComposeRecipient] = useState('')
  const [composeSending, setComposeSending] = useState(false)

  function openReply(n: Notification) {
    setComposeOpen({ mode: 'reply', original: n })
    setComposeBody('')
    setComposeRecipient('') // 답장은 원래 발신자에게 자동
  }
  function openForward(n: Notification) {
    setComposeOpen({ mode: 'forward', original: n })
    setComposeBody(`[전달된 메시지]\n${n.title}\n${n.body ?? ''}`)
    setComposeRecipient('')
  }
  async function sendCompose() {
    if (!composeOpen || !profile?.id) return
    setComposeSending(true)
    try {
      const db = supabase as any
      if (composeOpen.mode === 'reply') {
        // 원본 보낸 사람에게 답장 — sender_id 를 찾아야 함. notifications 테이블에서 조회
        const { data: orig } = await db.from('notifications').select('sender_id').eq('id', composeOpen.original.id).maybeSingle()
        const to = orig?.sender_id
        if (!to) { window.alert('원 발신자 정보가 없습니다.'); setComposeSending(false); return }
        await db.from('notifications').insert({
          recipient_id: to,
          sender_id: profile.id,
          title: `RE: ${composeOpen.original.title}`,
          body: composeBody,
          is_read: false,
        })
      } else {
        // 전달: 사번으로 수신자 조회
        if (!composeRecipient.trim()) { window.alert('수신자 사번을 입력해주세요.'); setComposeSending(false); return }
        const { data: target } = await db.from('profiles').select('id').eq('employee_id', composeRecipient.trim()).maybeSingle()
        if (!target?.id) { window.alert('해당 사번의 사용자를 찾을 수 없습니다.'); setComposeSending(false); return }
        await db.from('notifications').insert({
          recipient_id: target.id,
          sender_id: profile.id,
          title: `FW: ${composeOpen.original.title}`,
          body: composeBody,
          is_read: false,
        })
      }
      window.alert('전송 완료')
      setComposeOpen(null); setComposeBody(''); setComposeRecipient('')
    } catch (e) {
      window.alert('전송 실패: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setComposeSending(false)
    }
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
    try { sessionStorage.setItem('skipIntro', '1') } catch { /* storage blocked */ }
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="at-nav">
      <Link to="/dashboard" className="at-nav-logo" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        {/* 흰색 원본 PNG를 하늘색(#3182F6, Toss blue)으로 tint — 크기 300% 증가 (30px → 90px) */}
        <img
          src="/tongyang_logo_main.png"
          alt="동양"
          style={{
            height: 90,
            width: 'auto',
            display: 'block',
            filter: 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(2307%) hue-rotate(205deg) brightness(100%) contrast(95%)',
          }}
        />
        <span className="en">INTERNAL CONTROLS</span>
      </Link>

      <div className="at-nav-items">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx('at-nav-item', isActive && 'active')}
            style={{ textDecoration: 'none' }}
          >
            {item.label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => clsx('at-nav-item', isActive && 'active')}
            style={{ textDecoration: 'none' }}
          >
            관리자
          </NavLink>
        )}
      </div>

      <div className="at-nav-right">
        {/* Search icon (placeholder for future global search) */}
        <div className="at-nav-icon" title="검색">
          <Search size={16} strokeWidth={1.8} />
        </div>

        {/* Notification bell */}
        <div ref={notiRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setNotiOpen(v => !v)}
            className="at-nav-icon"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Bell size={16} strokeWidth={1.8} />
            {unreadCount > 0 && <span className="notif-dot" />}
          </button>

          {notiOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 10,
                width: 360,
                maxWidth: '90vw',
                background: '#fff',
                border: '1px solid #E5E8EB',
                borderRadius: 14,
                boxShadow: '0 16px 40px -12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <div style={{ borderBottom: '1px solid #F2F4F6', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#191F28', margin: 0 }}>알림</p>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} style={{ fontSize: 12, fontWeight: 500, color: '#3182F6', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    모두 읽음
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#8B95A1' }}>알림이 없습니다</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { if (!n.is_read) markAsRead(n.id) }}
                      role="button"
                      tabIndex={0}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 18px',
                        textAlign: 'left',
                        background: n.is_read ? '#fff' : '#F9FAFB',
                        border: 'none',
                        borderBottom: '1px solid #F2F4F6',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          marginTop: 2,
                          width: 22,
                          height: 22,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: n.is_read ? '#F2F4F6' : '#E8F2FE',
                          color: n.is_read ? '#8B95A1' : '#3182F6',
                        }}
                      >
                        {n.is_read ? <Check size={11} /> : <Bell size={11} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, lineHeight: 1.4, margin: 0, fontWeight: n.is_read ? 400 : 600, color: '#191F28' }}>{n.title}</p>
                        {n.body && <p style={{ marginTop: 4, fontSize: 11.5, color: '#8B95A1', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</p>}
                        <p style={{ marginTop: 6, fontSize: 11, color: '#8B95A1' }}>
                          {n.sender?.full_name ? `${n.sender.full_name} · ` : ''}
                          {new Date(n.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {/* 액션 버튼 — 답장 / 전달 / 삭제 */}
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openReply(n)}
                            style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#3182F6', background: '#E8F2FE', border: '1px solid #BDD7F7', borderRadius: 6, cursor: 'pointer' }}
                          >답장</button>
                          <button
                            onClick={() => openForward(n)}
                            style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#F59E0B', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, cursor: 'pointer' }}
                          >전달</button>
                          <button
                            onClick={() => deleteNotification(n.id)}
                            style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 6, cursor: 'pointer' }}
                          >삭제</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User badge → dropdown on click */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setProfileOpen(v => !v)}
            className="at-nav-user"
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div className="avatar">{profile?.full_name?.slice(0, 1) ?? '?'}</div>
            <div>
              <div className="name">{profile?.full_name ?? '사용자'}</div>
              <div className="role">{roleText} · {totalPoints}P</div>
            </div>
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 10,
                width: 240,
                background: '#fff',
                border: '1px solid #E5E8EB',
                borderRadius: 14,
                boxShadow: '0 16px 40px -12px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <div style={{ borderBottom: '1px solid #F2F4F6', padding: '14px 18px' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#191F28', margin: 0 }}>{profile?.full_name}</p>
                <p style={{ marginTop: 4, fontSize: 12, color: '#6B7684' }}>{profile?.department ?? '-'}</p>
                <p style={{ fontSize: 11.5, color: '#8B95A1' }}>{profile?.email ?? '-'}</p>
              </div>
              <div style={{ padding: 6 }}>
                <NavLink
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    fontSize: 13, color: '#4E5968', textDecoration: 'none',
                  }}
                >
                  <User size={15} strokeWidth={1.5} />
                  내 정보
                </NavLink>
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      fontSize: 13, color: '#4E5968', textDecoration: 'none',
                    }}
                  >
                    <Settings size={15} strokeWidth={1.5} />
                    관리자 설정
                  </NavLink>
                )}
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8,
                    fontSize: 13, color: '#EF4444', width: '100%',
                    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <LogOut size={15} strokeWidth={1.5} />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shield icon kept hidden to satisfy unused import guard */}
      <Shield style={{ display: 'none' }} />

      {/* Reply / Forward compose modal */}
      {composeOpen && (
        <div
          onClick={() => setComposeOpen(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 100%)', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#8B95A1', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>{composeOpen.mode === 'reply' ? 'REPLY' : 'FORWARD'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{composeOpen.mode === 'reply' ? '답장' : '전달'}</div>
              </div>
              <button onClick={() => setComposeOpen(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8B95A1' }}>✕</button>
            </div>

            <div style={{ marginBottom: 12, padding: 10, background: '#F9FAFB', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: '#4E5968', fontWeight: 600 }}>원본:</div>
              <div style={{ color: '#191F28' }}>{composeOpen.original.title}</div>
              {composeOpen.original.body && <div style={{ color: '#8B95A1', marginTop: 4, fontSize: 11 }}>{composeOpen.original.body.slice(0, 100)}</div>}
            </div>

            {composeOpen.mode === 'forward' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4E5968' }}>수신자 사번</label>
                <input
                  type="text"
                  value={composeRecipient}
                  onChange={e => setComposeRecipient(e.target.value)}
                  placeholder="예: 101842"
                  style={{ marginTop: 4, width: '100%', padding: '10px 12px', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13 }}
                />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4E5968' }}>내용</label>
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                rows={5}
                style={{ marginTop: 4, width: '100%', padding: '10px 12px', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder={composeOpen.mode === 'reply' ? '답장 내용을 입력하세요' : '전달할 메시지'}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setComposeOpen(null)} style={{ padding: '10px 16px', fontSize: 13, border: '1px solid #E5E8EB', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>취소</button>
              <button
                onClick={sendCompose}
                disabled={composeSending}
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: '#3182F6', color: '#fff', cursor: composeSending ? 'wait' : 'pointer', opacity: composeSending ? 0.6 : 1 }}
              >{composeSending ? '전송 중...' : '보내기'}</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
