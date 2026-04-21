import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Stats {
  total: number
  pendingApproval: number
  approved: number
  rejected: number
}

interface DeptData {
  name: string
  total: number
  approved: number
  pending: number
}

interface Activity {
  id: string
  control_code: string | null
  title: string | null
  department: string | null
  owner_name: string | null
  submission_status: string | null
}

interface RankingUser {
  user_id: string
  full_name: string | null
  team: string | null
  total_points: number
}

interface NoticeRow {
  id: string
  type: string
  title: string
  badge: string | null
  badge_color: string | null
  created_at: string
}

function getSubmissionStatus(raw: string | null): 'pendingApproval' | 'approved' | 'rejected' | 'draft' {
  if (!raw) return 'draft'
  const status = raw.trim()
  if (status === '승인') return 'approved'
  if (status === '반려') return 'rejected'
  if (status === '완료') return 'pendingApproval'
  return 'draft'
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({ total: 0, pendingApproval: 0, approved: 0, rejected: 0 })
  const [deptStats, setDeptStats] = useState<DeptData[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pointsRanking, setPointsRanking] = useState<RankingUser[]>([])
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [bingoRecent, setBingoRecent] = useState(0) // 오늘 풀린 칸 수 (간이)

  useEffect(() => { void fetchAll() }, [profile?.id])

  async function fetchAll() {
    if (!profile) { setLoading(false); return }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 통제활동
      let q = db.from('activities').select('id, control_code, title, department, owner_name, submission_status, owner_id, controller_id, owner_employee_id, controller_employee_id').eq('active', true)
      if (profile.role === 'owner') {
        if (profile.employee_id) q = q.eq('owner_employee_id', profile.employee_id)
        else q = q.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) q = q.eq('controller_employee_id', profile.employee_id)
        else q = q.eq('controller_id', profile.id)
      }

      const [actRes, userCnt, rankRes, noticeRes] = await Promise.all([
        q,
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        db.rpc('get_points_ranking').maybeSingle ? db.rpc('get_points_ranking') : Promise.resolve({ data: [] }),
        db.from('notices').select('id, type, title, badge, badge_color, created_at').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
      ])

      const records = (actRes?.data ?? []) as Activity[]
      const next: Stats = { total: records.length, pendingApproval: 0, approved: 0, rejected: 0 }
      const deptMap: Record<string, DeptData> = {}
      for (const r of records) {
        const s = getSubmissionStatus(r.submission_status)
        if (s === 'pendingApproval') next.pendingApproval += 1
        if (s === 'approved') next.approved += 1
        if (s === 'rejected') next.rejected += 1
        const dept = r.department ?? '미지정'
        if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, approved: 0, pending: 0 }
        deptMap[dept].total += 1
        if (s === 'approved') deptMap[dept].approved += 1
        if (s === 'pendingApproval') deptMap[dept].pending += 1
      }
      setStats(next)
      setActivities(records.slice(0, 6))
      setDeptStats(Object.values(deptMap).filter(d => d.total > 0).sort((a, b) => b.total - a.total).slice(0, 8))
      setUserCount(userCnt?.count ?? 0)
      setPointsRanking(((rankRes?.data ?? []) as RankingUser[]).slice(0, 5))
      setNotices((noticeRes?.data ?? []) as NoticeRow[])

      // 오늘 풀린 빙고 칸 수
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const { count: bingoCnt } = await db.from('quiz_results').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString())
      setBingoRecent(Math.min(25, bingoCnt ?? 0))
    } catch (e) {
      console.warn('[Dashboard]', e)
    } finally {
      setLoading(false)
    }
  }

  const nonAdminPending = useMemo(
    () => Math.max(0, stats.total - stats.approved - stats.rejected - stats.pendingApproval),
    [stats],
  )

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
  const greeting = () => {
    const h = new Date().getHours()
    if (h < 6) return '좋은 새벽이에요'
    if (h < 12) return '좋은 아침이에요'
    if (h < 17) return '좋은 오후예요'
    return '좋은 저녁이에요'
  }
  const isAdmin = profile?.role === 'admin'
  const firstName = profile?.full_name ?? '사용자'

  return (
    <div>
      {/* Hero — Editorial ivory split */}
      <section className="at-hero ivory split" style={{ padding: '96px 32px 112px' }}>
        <div className="at-hero-bg" />
        <div className="at-hero-content">
          <div>
            <div className="at-eyebrow at-hero-eyebrow">2026 · Q2 · Cycle 04 · 진행 중</div>
            <h1 className="at-hero-title">
              {greeting()},<br />
              <span className="soft">{firstName}님.</span>
            </h1>
            <p className="at-hero-lead">
              오늘의 내부회계 현황입니다. {stats.total}개 통제활동과 {userCount}명의 구성원이
              하나의 사이클로 움직이고 있어요. 준비되셨나요.
            </p>
            <div className="at-hero-ctas">
              <Link to="/evidence" className="at-btn" style={{ textDecoration: 'none' }}>
                오늘의 할 일 <span className="arrow">→</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="at-btn secondary" style={{ textDecoration: 'none' }}>관리자 설정</Link>
              )}
            </div>
          </div>

          {/* Right side: 전해드릴 소식 — 공지/이벤트 + 실시간 랭킹 */}
          <div className="at-hero-art ivory" style={{ position: 'relative', padding: '20px 0' }}>
            <div className="at-card" style={{ padding: 22, background: 'var(--at-white)', border: '1px solid var(--at-ink-hair)', borderRadius: 14, boxShadow: 'var(--sh-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>DISPATCHES</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--at-ink)', marginTop: 2 }}>전해드릴 소식</div>
                </div>
                <Link to="/news" style={{ textDecoration: 'none', fontSize: 11, color: 'var(--at-blue)', fontWeight: 600 }}>전체보기 →</Link>
              </div>

              {notices.length === 0 ? (
                <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--at-ink-faint)' }}>등록된 공지가 없습니다</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notices.slice(0, 4).map(n => (
                    <Link
                      key={n.id}
                      to={`/notice/${n.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--at-ivory)', textDecoration: 'none' }}
                    >
                      <span className={`at-tag ${n.badge_color ?? 'blue'}`} style={{ fontSize: 9, padding: '2px 6px' }}>{n.badge ?? '공지'}</span>
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--at-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--at-ink-faint)' }}>
                        {new Date(n.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {pointsRanking.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--at-ink-hair)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-ink-mute)', letterSpacing: '0.04em' }}>🏆 실시간 랭킹 TOP 3</div>
                    <Link to="/kpi" style={{ textDecoration: 'none', fontSize: 10, color: 'var(--at-blue)', fontWeight: 600 }}>전체</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pointsRanking.slice(0, 3).map((r, i) => (
                      <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, background: i === 0 ? '#FDE68A' : i === 1 ? '#E5E7EB' : '#FECACA', color: i === 0 ? '#92400E' : i === 1 ? '#374151' : '#991B1B' }}>
                          {i + 1}
                        </span>
                        <span style={{ flex: 1, fontWeight: 600 }}>{r.full_name ?? '익명'}</span>
                        {r.team && <span style={{ fontSize: 10, color: 'var(--at-ink-mute)' }}>{r.team}</span>}
                        <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--at-blue)' }}>{r.total_points}P</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="at-section" style={{ padding: '72px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">01 · OVERVIEW</div>
              <h2 className="at-h2">이번 주기 현황</h2>
            </div>
            <div className="meta">전사 통제활동 진행 상황을 한눈에.</div>
          </div>

          <div className="at-grid at-g-4">
            <Link to="/evidence" className="at-kpi" style={{ textDecoration: 'none' }}>
              <div className="kpi-label">
                <div className="kpi-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-5" /></svg></div>
                전체
              </div>
              <div className="kpi-value">{stats.total}</div>
              <div className="kpi-sub">전체 통제활동</div>
            </Link>

            <Link to="/evidence?status=awaiting" className="at-kpi" style={{ textDecoration: 'none' }}>
              <div className="kpi-label">
                <div className="kpi-icon" style={{ background: '#FAF1DF', color: 'var(--at-amber)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></div>
                결재대기
              </div>
              <div className="kpi-value">{stats.pendingApproval}<span className="unit">건</span></div>
              <div className="kpi-sub">담당자 작업 중</div>
            </Link>

            <Link to="/evidence?status=approved" className="at-kpi" style={{ textDecoration: 'none' }}>
              <div className="kpi-label">
                <div className="kpi-icon" style={{ background: '#E8F5ED', color: 'var(--at-green)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5 5L20 7" /></svg></div>
                승인완료
              </div>
              <div className="kpi-value">{stats.approved}<span className="unit">건</span></div>
              <div className="kpi-sub">달성률 {approvalRate}%</div>
            </Link>

            <Link to="/evidence?status=rejected" className="at-kpi" style={{ textDecoration: 'none' }}>
              <div className="kpi-label">
                <div className="kpi-icon" style={{ background: '#FBEBEF', color: 'var(--at-red)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M6 18L18 6" /></svg></div>
                반려
              </div>
              <div className="kpi-value">{stats.rejected}<span className="unit">건</span></div>
              <div className="kpi-sub">재작성 필요</div>
            </Link>
          </div>

          {!isAdmin && (
            <div className="at-grid at-g-4" style={{ marginTop: 16 }}>
              <Link to="/evidence?status=pending" className="at-kpi" style={{ textDecoration: 'none' }}>
                <div className="kpi-label">
                  <div className="kpi-icon" style={{ background: '#F2F4F6', color: 'var(--at-ink-mute)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="2" /></svg></div>
                  미완료
                </div>
                <div className="kpi-value">{nonAdminPending}<span className="unit">건</span></div>
                <div className="kpi-sub">증빙 미업로드</div>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 전해드릴 소식 is now in the hero (right side), no separate section needed */}

      {/* Team progress + Bingo */}
      <section className="at-section ivory" style={{ padding: '88px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">02 · PROGRESS</div>
              <h2 className="at-h2">팀별 진척도.</h2>
            </div>
            <div className="meta">상위 8개 팀의 승인율을 확인하세요.</div>
          </div>

          <div className="at-grid at-g-2-1">
            <div className="at-card">
              <div className="at-card-head"><div className="at-card-title">팀별 승인율</div><Link to="/kpi" className="at-card-link" style={{ textDecoration: 'none' }}>자세히</Link></div>
              {deptStats.length === 0 && !loading && (
                <p style={{ padding: '24px 0', textAlign: 'center', color: 'var(--at-ink-faint)', fontSize: 13 }}>팀별 데이터가 없습니다</p>
              )}
              {deptStats.map(d => {
                const pct = d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0
                return (
                  <div key={d.name} className="at-team-row">
                    <div className="name">{d.name}</div>
                    <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
                    <div className="pct" title={`${d.approved}/${d.total}건`}>{pct}%</div>
                  </div>
                )
              })}
            </div>

            <div>
              <Link to="/bingo" className="at-card" style={{ padding: 28, marginBottom: 16, display: 'block', textDecoration: 'none' }}>
                <div className="at-card-head" style={{ marginBottom: 16 }}>
                  <div className="at-card-title">빙고 현황</div>
                  <span className="at-tag blue">오늘</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} style={{ aspectRatio: '1', background: i < bingoRecent ? 'var(--at-blue)' : 'var(--at-ink-hair)', borderRadius: 4 }} />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--at-ink-mute)', marginTop: 14, textAlign: 'center' }}>오늘 {bingoRecent}칸 완료 · 3줄 완성 시 기프티콘</div>
              </Link>

              {isAdmin && (
                <Link to="/admin" className="at-card" style={{ padding: 28, display: 'block', textDecoration: 'none' }}>
                  <div className="at-card-head" style={{ marginBottom: 16 }}><div className="at-card-title">등록 사용자</div></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>활성 사용자</div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 500 }}>{userCount}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>진행중</div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 500, color: 'var(--at-amber)' }}>{stats.pendingApproval}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>완료</div>
                      <div style={{ fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 500, color: 'var(--at-green)' }}>{stats.approved}</div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Activities table */}
      <section className="at-section" style={{ padding: '88px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">03 · ACTIVITIES</div>
              <h2 className="at-h2">통제활동별 현황.</h2>
            </div>
            <div className="meta">상위 6건 바로가기.</div>
          </div>
          <div className="at-card" style={{ padding: 0 }}>
            <table className="at-table">
              <thead>
                <tr>
                  <th style={{ width: 130, paddingLeft: 24 }}>통제번호</th>
                  <th>통제활동명</th>
                  <th>담당부서</th>
                  <th>담당자</th>
                  <th className="right" style={{ paddingRight: 24 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--at-ink-faint)' }}>데이터가 없습니다</td></tr>
                )}
                {activities.map(a => {
                  const status = getSubmissionStatus(a.submission_status)
                  const tag = status === 'approved' ? ['green', '승인']
                    : status === 'rejected' ? ['red', '반려']
                      : status === 'pendingApproval' ? ['amber', '대기']
                        : ['gray', '미완료']
                  return (
                    <tr key={a.id}>
                      <td className="mono" style={{ paddingLeft: 24 }}>{a.control_code ?? '-'}</td>
                      <td>{a.title ?? '-'}</td>
                      <td>{a.department ?? '-'}</td>
                      <td>{a.owner_name ?? '-'}</td>
                      <td className="num" style={{ paddingRight: 24, textAlign: 'right' }}>
                        <span className={`at-tag ${tag[0]}`}>{tag[1]}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Shortcuts */}
      <section className="at-section paper" style={{ padding: '88px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">04 · SHORTCUTS</div>
              <h2 className="at-h2">바로 갈 수 있는 곳.</h2>
            </div>
            <div className="meta">자주 쓰는 메뉴를 한 걸음 거리에.</div>
          </div>
          <div className="at-feature-grid">
            <Link to="/evidence" className="at-feature" style={{ textDecoration: 'none' }}>
              <div className="tile ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              </div>
              <div className="f-label">01 · EVIDENCE</div>
              <div className="f-title">증빙관리</div>
              <div className="f-desc">내 통제활동의 증빙을 확인·업로드합니다.</div>
              <div className="f-meta"><span>{stats.total} 개 활동</span><span className="arrow">→</span></div>
            </Link>
            <Link to="/inbox" className="at-feature" style={{ textDecoration: 'none' }}>
              <div className="tile amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>
              </div>
              <div className="f-label">02 · INBOX</div>
              <div className="f-title">내 승인함</div>
              <div className="f-desc">결재 대기 항목을 빠르게 처리합니다.</div>
              <div className="f-meta"><span>{stats.pendingApproval} 건 대기</span><span className="arrow">→</span></div>
            </Link>
            <Link to="/courses" className="at-feature" style={{ textDecoration: 'none' }}>
              <div className="tile">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
              </div>
              <div className="f-label">03 · COURSES</div>
              <div className="f-title">강좌</div>
              <div className="f-desc">내부회계 교육 강좌를 수강합니다.</div>
              <div className="f-meta"><span>10개 공개</span><span className="arrow">→</span></div>
            </Link>
            <Link to="/news" className="at-feature" style={{ textDecoration: 'none' }}>
              <div className="tile green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /></svg>
              </div>
              <div className="f-label">04 · NEWS</div>
              <div className="f-title">회사소식과 뉴스</div>
              <div className="f-desc">DART 공시·뉴스·재무 데이터 통합.</div>
              <div className="f-meta"><span>실시간 업데이트</span><span className="arrow">→</span></div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="at-footer">
        <div className="f-row">
          <div>© 2026 (주)동양 · 내부회계관리 PORTAL</div>
          <div className="f-links">
            <Link to="/tellme" style={{ color: 'inherit', textDecoration: 'none' }}>Tell me</Link>
            <Link to="/chatbot" style={{ color: 'inherit', textDecoration: 'none' }}>AI 챗봇</Link>
            <Link to="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>내 정보</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
