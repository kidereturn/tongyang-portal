import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { queryWithTimeout } from '../../lib/queryWithTimeout'
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
  review_status?: string | null
}

interface ReviewStats {
  notReviewed: number
  reviewing: number
  done: number
  modifyReq: number  // 수정제출 (담당자·관리자에게만 의미)
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

// 매초 자체 rerender — 상위 Dashboard 는 변경 없음
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const dateLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })
  const timeLabel = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <>
      <span>{dateLabel}</span>
      <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--at-blue)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>{timeLabel}</span>
    </>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({ total: 0, pendingApproval: 0, approved: 0, rejected: 0 })
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ notReviewed: 0, reviewing: 0, done: 0, modifyReq: 0 })
  const [allDeptStats, setAllDeptStats] = useState<DeptData[]>([])
  const [allActivities, setAllActivities] = useState<Activity[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pointsRanking, setPointsRanking] = useState<RankingUser[]>([])
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [bingoRanking, setBingoRanking] = useState<Array<{ user_id: string; full_name?: string; team?: string; max_lines: number }>>([])

  useEffect(() => { void fetchAll() }, [profile?.id])

  // 탭 복귀 시 스켈레톤 고착 방지
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loading && profile) {
        console.info('[Dashboard] tab returned — refetch')
        void fetchAll()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, profile?.id])

  async function fetchAll() {
    if (!profile) { setLoading(false); return }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 통제활동 (review_status 포함)
      let q = db.from('activities').select('id, control_code, title, department, owner_name, submission_status, review_status, owner_id, controller_id, owner_employee_id, controller_employee_id').eq('active', true)
      if (profile.role === 'owner') {
        if (profile.employee_id) q = q.eq('owner_employee_id', profile.employee_id)
        else q = q.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) q = q.eq('controller_employee_id', profile.employee_id)
        else q = q.eq('controller_id', profile.id)
      }

      const batchPromise = Promise.all([
        q,
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
        db.rpc('get_points_ranking').maybeSingle ? db.rpc('get_points_ranking') : Promise.resolve({ data: [] }),
        db.from('notices').select('id, type, title, badge, badge_color, created_at').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(5),
      ])
      let actRes: any, userCnt: any, rankRes: any, noticeRes: any
      try {
        [actRes, userCnt, rankRes, noticeRes] = await queryWithTimeout(batchPromise, 12_000, 'dashboard.batch')
      } catch (e) {
        console.warn('[Dashboard] batch timeout', e)
        actRes = { data: [] }; userCnt = { count: 0 }; rankRes = { data: [] }; noticeRes = { data: [] }
      }

      const records = (actRes?.data ?? []) as Activity[]
      const next: Stats = { total: records.length, pendingApproval: 0, approved: 0, rejected: 0 }
      const rv: ReviewStats = { notReviewed: 0, reviewing: 0, done: 0, modifyReq: 0 }
      const deptMap: Record<string, DeptData> = {}
      for (const r of records) {
        const s = getSubmissionStatus(r.submission_status)
        if (s === 'pendingApproval') next.pendingApproval += 1
        if (s === 'approved') next.approved += 1
        if (s === 'rejected') next.rejected += 1
        const rs = (r.review_status ?? '미검토').trim()
        if (rs === '검토중') rv.reviewing += 1
        else if (rs === '완료') rv.done += 1
        else if (rs === '수정제출') rv.modifyReq += 1
        else rv.notReviewed += 1
        const dept = r.department ?? '미지정'
        if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, approved: 0, pending: 0 }
        deptMap[dept].total += 1
        if (s === 'approved') deptMap[dept].approved += 1
        if (s === 'pendingApproval') deptMap[dept].pending += 1
      }
      setStats(next)
      setReviewStats(rv)
      setAllActivities(records)

      // Fetch ALL activities org-wide for 전 부서 진행 현황 (admin or controller sees everything)
      try {
        const { data: allAct } = await queryWithTimeout(
          db.from('activities').select('department, submission_status').eq('active', true),
          10_000,
          'dashboard.allActivities',
        ) as { data: Array<{ department: string | null; submission_status: string | null }> | null }
        const fullMap: Record<string, DeptData> = {}
        for (const r of allAct ?? []) {
          const s = getSubmissionStatus(r.submission_status)
          const dept = r.department ?? '미지정'
          if (!fullMap[dept]) fullMap[dept] = { name: dept, total: 0, approved: 0, pending: 0 }
          fullMap[dept].total += 1
          if (s === 'approved') fullMap[dept].approved += 1
          if (s === 'pendingApproval') fullMap[dept].pending += 1
        }
        setAllDeptStats(Object.values(fullMap).filter(d => d.total > 0).sort((a, b) => b.total - a.total))
      } catch { /* silent */ }
      setUserCount(userCnt?.count ?? 0)
      setPointsRanking(((rankRes?.data ?? []) as RankingUser[]).slice(0, 5))
      setNotices((noticeRes?.data ?? []) as NoticeRow[])

      // 오늘 풀린 빙고 칸 수 — 사용처 없음 (2026-04-24 dead state 제거)

      // 빙고 줄 완성 TOP 3
      try {
        const { data: bingoRows } = await queryWithTimeout(
          db.from('bingo_achievements')
            .select('user_id, max_lines, profiles:profiles(full_name, department)')
            .order('max_lines', { ascending: false })
            .limit(3),
          8_000,
          'dashboard.bingoRanking',
        ) as { data: any[] | null }
        const mapped = (bingoRows ?? []).map((r: any) => ({
          user_id: r.user_id,
          full_name: r.profiles?.full_name ?? '익명',
          team: r.profiles?.department ?? '',
          max_lines: r.max_lines ?? 0,
        }))
        setBingoRanking(mapped)
      } catch { /* silent */ }
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

  // Clock 은 하위 컴포넌트(LiveClock)로 분리 — 매초 전체 dashboard rerender 방지

  return (
    <div>
      {/* Hero — Editorial ivory split */}
      <section className="at-hero ivory split" style={{ padding: '96px 32px 112px' }}>
        <div className="at-hero-bg" />
        <div className="at-hero-content">
          <div>
            <div className="at-eyebrow at-hero-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <LiveClock />
              <span>·</span>
              <span>2026 Cycle 07th in Progress</span>
            </div>
            <h1 className="at-hero-title">
              {greeting()},<br />
              <span className="soft">{firstName}님.</span>
            </h1>
            <p className="at-hero-lead">
              오늘의 내부회계 현황입니다. <b>{firstName}</b>님의 {stats.total}개 통제활동과 {userCount}명 구성원의
              모든 통제활동이 하나의 사이클로 움직이고 있어요. 준비되셨나요.
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

          {/* Right side: 공지사항 & 매뉴얼 */}
          <div className="at-hero-art ivory" style={{ position: 'relative', padding: 0, display: 'flex', alignItems: 'stretch' }}>
            <div className="at-card" style={{ width: '100%', padding: 28, background: 'var(--at-white)', border: '1px solid var(--at-ink-hair)', borderRadius: 16, boxShadow: 'var(--sh-card)', minHeight: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--at-ink-faint)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>NOTICES · MANUALS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--at-ink)', marginTop: 2 }}>공지사항 &amp; 매뉴얼</div>
                </div>
                <Link
                  to="/notices-all"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--at-blue)', fontWeight: 600, textDecoration: 'none' }}
                >전체보기 →</Link>
              </div>

              {notices.length === 0 ? (
                <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--at-ink-faint)' }}>등록된 공지가 없습니다</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {notices.slice(0, 5).map(n => (
                    <Link
                      key={n.id}
                      to={`/notice/${n.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--at-ivory)', textDecoration: 'none' }}
                    >
                      <span className={`at-tag ${n.badge_color ?? 'blue'}`} style={{ fontSize: 9, padding: '2px 7px' }}>{n.badge ?? '공지'}</span>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--at-ink)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--f-mono)', color: 'var(--at-ink-faint)' }}>
                        {new Date(n.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* 실시간 랭킹 TOP 3: 포인트 + 빙고 줄 수 */}
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--at-ink-hair)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-ink-mute)', letterSpacing: '0.04em' }}>🏆 포인트 TOP 3</div>
                  </div>
                  {pointsRanking.length === 0 ? (
                    <div style={{ fontSize: 14, color: 'var(--at-ink-faint)', padding: '4px 0' }}>데이터 없음</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {pointsRanking.slice(0, 3).map((r, i) => (
                        <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: i === 0 ? '#FDE68A' : i === 1 ? '#E5E7EB' : '#FECACA', color: i === 0 ? '#92400E' : i === 1 ? '#374151' : '#991B1B' }}>
                            {i + 1}
                          </span>
                          <span style={{ flex: 1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name ?? '익명'}</span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--at-blue)', fontSize: 16 }}>{r.total_points}P</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--at-ink-mute)', letterSpacing: '0.04em', marginBottom: 8 }}>🎯 빙고 줄 TOP 3</div>
                  {bingoRanking.length === 0 ? (
                    <div style={{ fontSize: 14, color: 'var(--at-ink-faint)', padding: '4px 0' }}>기록 없음</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {bingoRanking.slice(0, 3).map((r, i) => (
                        <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, background: i === 0 ? '#FDE68A' : i === 1 ? '#E5E7EB' : '#FECACA', color: i === 0 ? '#92400E' : i === 1 ? '#374151' : '#991B1B' }}>
                            {i + 1}
                          </span>
                          <span style={{ flex: 1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name ?? '익명'}</span>
                          <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: '#F59E0B', fontSize: 16 }}>{r.max_lines}줄</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
              <h2 className="at-h2">증빙 제출 현황</h2>
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

            <Link to="/evidence?status=complete" className="at-kpi" style={{ textDecoration: 'none' }}>
              <div className="kpi-label">
                <div className="kpi-icon" style={{ background: '#FAF1DF', color: 'var(--at-amber)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></div>
                상신완료
              </div>
              <div className="kpi-value">{stats.pendingApproval}<span className="unit">건</span></div>
              <div className="kpi-sub">승인자 검토 대기</div>
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
              {/* 수정제출 — 0 건이어도 표시 · 건수>0 이면 반짝 + 빨강 */}
              <Link
                to="/evidence?status=modifyReq"
                className={reviewStats.modifyReq > 0 ? 'at-kpi at-kpi-pulse' : 'at-kpi'}
                style={{
                  textDecoration: 'none',
                  borderColor: reviewStats.modifyReq > 0 ? '#F87171' : undefined,
                  boxShadow: reviewStats.modifyReq > 0 ? '0 0 0 2px rgba(248,113,113,0.15)' : undefined,
                }}
              >
                <div className="kpi-label">
                  <div className="kpi-icon" style={{ background: reviewStats.modifyReq > 0 ? '#FEE2E2' : '#F2F4F6', color: reviewStats.modifyReq > 0 ? '#DC2626' : 'var(--at-ink-faint)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  </div>
                  수정 제출
                </div>
                <div className="kpi-value" style={{ color: reviewStats.modifyReq > 0 ? '#DC2626' : undefined, fontWeight: reviewStats.modifyReq > 0 ? 800 : undefined }}>
                  {reviewStats.modifyReq}<span className="unit">건</span>
                </div>
                <div className="kpi-sub" style={{ color: reviewStats.modifyReq > 0 ? '#DC2626' : undefined }}>
                  {reviewStats.modifyReq > 0 ? '관리자 수정 요청' : '수정 요청 없음'}
                </div>
              </Link>
            </div>
          )}

          {/* 검토 상태 — 역할별 노출 차별화 */}
          {isAdmin ? (
            /* 관리자: 미검토 / 검토중 / 완료 / 수정제출 4타일 */
            <div className="at-grid" style={{ marginTop: 16, gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {(() => {
                const rvTotal = reviewStats.notReviewed + reviewStats.reviewing + reviewStats.done + reviewStats.modifyReq
                const pct = (v: number) => (rvTotal > 0 ? Math.round((v / rvTotal) * 100) : 0)
                return (
                  <>
                    <div className="at-kpi">
                      <div className="kpi-label">
                        <div className="kpi-icon" style={{ background: '#F2F4F6', color: 'var(--at-ink-mute)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12h8" /></svg>
                        </div>
                        검토 · 미검토
                      </div>
                      <div className="kpi-value">{reviewStats.notReviewed}<span className="unit">건</span></div>
                      <div className="kpi-sub">비율 {pct(reviewStats.notReviewed)}%</div>
                    </div>
                    <div className="at-kpi">
                      <div className="kpi-label">
                        <div className="kpi-icon" style={{ background: '#E8F2FE', color: 'var(--at-blue)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                        </div>
                        검토 · 검토중
                      </div>
                      <div className="kpi-value" style={{ color: 'var(--at-blue)' }}>{reviewStats.reviewing}<span className="unit">건</span></div>
                      <div className="kpi-sub">비율 {pct(reviewStats.reviewing)}%</div>
                    </div>
                    <div className="at-kpi">
                      <div className="kpi-label">
                        <div className="kpi-icon" style={{ background: '#E8F5ED', color: 'var(--at-green)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12l5 5L20 7" /></svg>
                        </div>
                        검토 · 완료
                      </div>
                      <div className="kpi-value" style={{ color: 'var(--at-green)' }}>{reviewStats.done}<span className="unit">건</span></div>
                      <div className="kpi-sub">비율 {pct(reviewStats.done)}%</div>
                    </div>
                    <Link to="/evidence?status=modifyReq" className="at-kpi at-kpi-pulse" style={{ textDecoration: 'none', borderColor: '#F87171', boxShadow: '0 0 0 2px rgba(248,113,113,0.1)' }}>
                      <div className="kpi-label">
                        <div className="kpi-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        </div>
                        검토 · 수정제출
                      </div>
                      <div className="kpi-value" style={{ color: '#DC2626' }}>{reviewStats.modifyReq}<span className="unit">건</span></div>
                      <div className="kpi-sub">비율 {pct(reviewStats.modifyReq)}% · 담당자에게 수정 요청</div>
                    </Link>
                  </>
                )
              })()}
            </div>
          ) : null /* 담당자·승인자 수정제출 박스는 위의 at-g-4 내부로 이동 */}
        </div>
      </section>

      {/* 전해드릴 소식 is now in the hero (right side), no separate section needed */}

      {/* 02 · ACTIVITIES — moved BEFORE progress (user's担当 전체, scrollable) */}
      <section className="at-section" style={{ padding: '88px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">02 · ACTIVITIES</div>
              <h2 className="at-h2">통제활동별 현황.</h2>
            </div>
            <div className="meta">{isAdmin ? '전사 통제활동' : '내가 담당하는 통제활동'} 전체</div>
          </div>
          <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <table className="at-table">
                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                  <tr>
                    <th style={{ width: 130, paddingLeft: 24 }}>통제번호</th>
                    <th>통제활동명</th>
                    <th>담당부서</th>
                    <th>담당자</th>
                    <th className="right" style={{ paddingRight: 24 }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {allActivities.length === 0 && !loading && (
                    <tr><td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--at-ink-faint)' }}>데이터가 없습니다</td></tr>
                  )}
                  {allActivities.map(a => {
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
        </div>
      </section>

      {/* 03 · 전 부서 진행 현황 (scrollable) + 우측: 빙고 현황 (원형 승인율) */}
      <section className="at-section ivory" style={{ padding: '88px 0' }}>
        <div className="at-wrap-wide">
          <div className="at-section-head">
            <div className="title">
              <div className="at-section-label">03 · PROGRESS</div>
              <h2 className="at-h2">전 부서 진행 현황.</h2>
            </div>
            <div className="meta">모든 부서의 승인율을 한눈에.</div>
          </div>

          <div className="at-grid at-g-2-1">
            <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="at-card-head" style={{ padding: '16px 20px', borderBottom: '1px solid var(--at-ink-hair)' }}><div className="at-card-title">부서별 승인율</div><Link to="/kpi" className="at-card-link" style={{ textDecoration: 'none' }}>자세히</Link></div>
              <div style={{ maxHeight: 420, overflowY: 'auto', padding: '10px 20px' }}>
                {allDeptStats.length === 0 && !loading && (
                  <p style={{ padding: '24px 0', textAlign: 'center', color: 'var(--at-ink-faint)', fontSize: 13 }}>부서별 데이터가 없습니다</p>
                )}
                {allDeptStats.map(d => {
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
            </div>

            <div>
              {/* 전체 통제활동 진행 파이 — 승인/결재대기/미작성/반려/수정 5개 세그먼트 */}
              <Link to="/evidence" className="at-card" style={{ padding: 28, marginBottom: 16, display: 'block', textDecoration: 'none' }}>
                <div className="at-card-head" style={{ marginBottom: 16 }}>
                  <div className="at-card-title">진행 현황 (전체 {stats.total}건)</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
                  {(() => {
                    const size = 180
                    const radius = size / 2
                    const cx = radius, cy = radius
                    const modifyReq = reviewStats.modifyReq ?? 0
                    const total = Math.max(1, stats.total)
                    const pending = stats.pendingApproval // 결재대기 = 상신완료
                    const approved = stats.approved
                    const rejected = stats.rejected
                    const draft = Math.max(0, stats.total - pending - approved - rejected - modifyReq)
                    const segments = [
                      { label: '승인',       value: approved,  color: '#10B981' },
                      { label: '결재대기',   value: pending,   color: '#3182F6' },
                      { label: '미작성',     value: draft,     color: '#9CA3AF' },
                      { label: '반려',       value: rejected,  color: '#EF4444' },
                      { label: '수정제출',   value: modifyReq, color: '#F59E0B' },
                    ].filter(s => s.value > 0)
                    // Build pie path segments
                    let cumulative = 0
                    const arcs = segments.map(s => {
                      const start = (cumulative / total) * 2 * Math.PI
                      cumulative += s.value
                      const end = (cumulative / total) * 2 * Math.PI
                      const largeArc = end - start > Math.PI ? 1 : 0
                      const x1 = cx + radius * Math.sin(start)
                      const y1 = cy - radius * Math.cos(start)
                      const x2 = cx + radius * Math.sin(end)
                      const y2 = cy - radius * Math.cos(end)
                      const d = [
                        `M ${cx} ${cy}`,
                        `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
                        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                        'Z',
                      ].join(' ')
                      return { d, color: s.color, label: s.label, value: s.value }
                    })
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                          <svg width={size} height={size}>
                            {arcs.length === 0 ? (
                              <circle cx={cx} cy={cy} r={radius - 1} fill="var(--at-ink-hair)" />
                            ) : arcs.map((a, i) => (
                              <path key={i} d={a.d} fill={a.color} stroke="#fff" strokeWidth={1.5} />
                            ))}
                            <circle cx={cx} cy={cy} r={radius * 0.55} fill="#fff" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontFamily: 'var(--f-display)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{stats.total}</div>
                              <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', marginTop: 2 }}>총 통제활동</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                          {segments.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--at-ink)', minWidth: 54 }}>{s.label}</span>
                              <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 700, color: 'var(--at-ink)' }}>{s.value}</span>
                              <span style={{ fontFamily: 'var(--f-mono)', color: 'var(--at-ink-mute)', fontSize: 11 }}>({Math.round(s.value / total * 100)}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
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
