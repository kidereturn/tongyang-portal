import { useEffect, useState, useCallback } from 'react'
import {
  FileCheck2, Upload,
  Search, RefreshCw, Download,
  AlertCircle, Save, XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { safeQuery, queryWithTimeout } from '../../lib/queryWithTimeout'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'
import EvidenceUploadModal from './EvidenceUploadModal'

interface Activity {
  id: string
  control_code: string
  owner_name: string | null
  department: string | null
  title: string | null
  description: string | null
  controller_name: string | null
  kpi_score: number | null
  submission_status: string
  unique_key: string | null
  owner_id: string | null
  controller_id: string | null
  owner_email: string | null
  controller_email: string | null
  review_status?: string | null
}

const REVIEW_STATUSES = ['미검토', '검토중', '완료', '수정제출'] as const

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  '미완료': { label: '미완료', cls: 'badge-yellow' },
  '완료':   { label: '상신완료', cls: 'badge-blue' },
  '승인':   { label: '승인완료', cls: 'badge-green' },
  '반려':   { label: '반려',     cls: 'badge-red' },
}

export default function EvidenceListPage() {
  const { profile } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filtered,   setFiltered]   = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({})
  const [populationTotals, setPopulationTotals] = useState<Record<string, number>>({})
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (loadError) {
      console.warn(loadError)
    }
  }, [loadError])

  const fetchActivities = useCallback(async () => {
    if (!profile) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      let q = db.from('activities').select('id, control_code, owner_name, department, title, description, controller_name, kpi_score, submission_status, review_status, unique_key, owner_id, controller_id, owner_email, controller_email, owner_employee_id, controller_employee_id').eq('active', true)
      if (profile.role === 'owner') {
        if (profile.employee_id) q = q.eq('owner_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('owner_name', profile.full_name)
        else q = q.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) q = q.eq('controller_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('controller_name', profile.full_name)
        else q = q.eq('controller_id', profile.id)
      }
      q = q.order('control_code').order('department')

      const { data } = await safeQuery<Activity[]>(q, 12_000, 'evidence.activities')
      const rows = data ?? []
      setActivities(rows)
      setFiltered(rows)

      // Load evidence counts, population totals, and approval statuses in parallel — 각 쿼리 타임아웃 래핑
      const activityIds = rows.map((r: Activity) => r.id)
      const uniqueKeys = rows.map((r: Activity) => r.unique_key).filter(Boolean) as string[]
      if (activityIds.length > 0) {
        const batch = Promise.all([
          db.from('evidence_uploads').select('activity_id').in('activity_id', activityIds),
          db.from('approval_requests').select('activity_id, status').in('activity_id', activityIds),
          uniqueKeys.length > 0
            ? db.from('population_items').select('unique_key').in('unique_key', uniqueKeys)
            : Promise.resolve({ data: [] as { unique_key: string }[] }),
        ])
        let uploadsRes: { data: Array<{ activity_id: string }> | null } = { data: [] }
        let approvalsRes: { data: Array<{ activity_id: string; status: string }> | null } = { data: [] }
        let populationRes: { data: Array<{ unique_key: string }> | null } = { data: [] }
        try {
          const result = await queryWithTimeout(batch, 12_000, 'evidence.batch')
          ;[uploadsRes, approvalsRes, populationRes] = result as [typeof uploadsRes, typeof approvalsRes, typeof populationRes]
        } catch (batchErr) {
          console.warn('[evidence] batch timeout:', batchErr)
          // 배치 실패해도 activities 는 이미 표시되므로 UI 가 멈추지 않는다
        }
        const counts: Record<string, number> = {}
        for (const u of uploadsRes.data ?? []) {
          counts[u.activity_id] = (counts[u.activity_id] ?? 0) + 1
        }
        setEvidenceCounts(counts)

        // Count population rows per unique_key, then map to activity_id
        const popByKey: Record<string, number> = {}
        for (const p of (populationRes.data ?? []) as { unique_key: string }[]) {
          if (p.unique_key) popByKey[p.unique_key] = (popByKey[p.unique_key] ?? 0) + 1
        }
        const popTotals: Record<string, number> = {}
        for (const r of rows) {
          if (r.unique_key) popTotals[r.id] = popByKey[r.unique_key] ?? 0
        }
        setPopulationTotals(popTotals)

        const statuses: Record<string, string> = {}
        for (const a of approvalsRes.data ?? []) {
          statuses[a.activity_id] = a.status
        }
        setApprovalStatuses(statuses)
      }
    } catch {
      setActivities([])
      setFiltered([])
      setLoadError('증빙 목록 조회가 지연되어 빈 상태로 전환했습니다. 새로 고침으로 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role, profile?.employee_id, profile?.full_name])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  // 탭 복귀 시 스켈레톤 상태 고착되면 자동 재조회
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loading && profile) {
        console.info('[evidence] tab returned, refetching stuck load')
        fetchActivities()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loading, profile, fetchActivities])

  // URL query param support: /evidence?status=pending|complete|approved|rejected
  // awaiting 은 상신완료(complete)로 통합
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('status')
    if (q && q !== statusFilter) {
      const map: Record<string, string> = {
        all: 'all',
        pending: '미완료',
        complete: '완료',
        approved: '승인',
        rejected: '반려',
        awaiting: '완료', // 결재대기 → 상신완료로 리다이렉트
        modifyReq: 'modifyReq',
      }
      if (map[q]) setStatusFilter(map[q])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let r = activities
    if (search) {
      const s = search.toLowerCase()
      r = r.filter(a =>
        a.control_code?.toLowerCase().includes(s) ||
        a.title?.toLowerCase().includes(s) ||
        a.department?.toLowerCase().includes(s) ||
        a.owner_name?.toLowerCase().includes(s)
      )
    }
    if (statusFilter === 'modifyReq') {
      r = r.filter(a => a.review_status === '수정제출')
    } else if (statusFilter !== 'all') {
      r = r.filter(a => a.submission_status === statusFilter)
    }
    // 결재대기(awaiting) 필터는 상신완료와 의미가 동일하여 제거됨
    setFiltered(r)
  }, [search, statusFilter, activities])

  const stats = {
    total:     activities.length,
    pending:   activities.filter(a => a.submission_status === '미완료').length,
    complete:  activities.filter(a => a.submission_status === '완료').length,
    approved:  activities.filter(a => a.submission_status === '승인').length,
    rejected:  activities.filter(a => a.submission_status === '반려').length,
    // 수정제출 — 관리자·담당자만 관심있는 별도 카운트 (review_status 기준)
    modifyReq: activities.filter(a => a.review_status === '수정제출').length,
  }
  // 승인율 = 전체 증빙 중 승인자의 승인이 완료된 비율 (per user spec #11)
  const rate = stats.total > 0 ? Math.round(stats.approved / stats.total * 100) : 0

  function openUploadModal(act: Activity) { setSelectedActivity(act); setModalOpen(true) }
  function handleClose(refresh?: boolean) { setModalOpen(false); setSelectedActivity(null); if (refresh) fetchActivities() }

  // 관리자 검토상태 작성 중인 값 (저장 버튼 누르기 전까지 로컬 스테이징)
  const [pendingReview, setPendingReview] = useState<Record<string, string>>({})
  const [savingReview, setSavingReview] = useState<string | null>(null)

  function onReviewSelectChange(activityId: string, newStatus: string) {
    setPendingReview(prev => ({ ...prev, [activityId]: newStatus }))
  }

  async function saveReviewStatus(activity: Activity) {
    const newStatus = pendingReview[activity.id] ?? activity.review_status ?? '미검토'
    if (newStatus === (activity.review_status ?? '미검토')) {
      // 변경 없음
      setPendingReview(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      return
    }
    setSavingReview(activity.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      // 1) activities 업데이트
      const activityPatch: Record<string, unknown> = {
        review_status: newStatus,
        updated_at: new Date().toISOString(),
      }
      // 수정제출로 변경되면 submission_status 를 '미완료' 로 리셋 (담당자 재작업 필요)
      if (newStatus === '수정제출') {
        activityPatch.submission_status = '미완료'
      }
      await db.from('activities').update(activityPatch).eq('id', activity.id)

      // 2) 수정제출이면 기존 approval_requests 를 cancelled 처리
      if (newStatus === '수정제출') {
        await db.from('approval_requests')
          .update({ status: 'cancelled', decided_at: new Date().toISOString() })
          .eq('activity_id', activity.id)
          .in('status', ['submitted', 'approved', 'rejected'])
      }

      // 3) 로컬 상태 즉시 반영 (3 지점 자동 동기화됨 — activities state 가 유일한 진실의 근원)
      setActivities(prev => prev.map(a => a.id === activity.id
        ? { ...a, review_status: newStatus, ...(newStatus === '수정제출' ? { submission_status: '미완료' } : {}) }
        : a))
      if (newStatus === '수정제출') {
        setApprovalStatuses(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      }
      setPendingReview(prev => { const n = { ...prev }; delete n[activity.id]; return n })
    } catch (err) {
      window.alert(`검토결과 저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setSavingReview(null)
    }
  }

  // 관리자 강제 취소 — 승인/반려/상신 어느 단계든 완전 초기화
  async function forceCancel(activity: Activity) {
    if (!window.confirm(
      `[관리자 강제 취소]\n\n"${activity.title ?? activity.control_code}" 의 모든 결재 이력을 삭제하고\n담당자가 처음부터 다시 작업하도록 초기화합니다.\n\n• 승인/반려 이력 삭제\n• 상신여부 → 미완료\n• 검토결과 → 미검토\n\n진행할까요?`
    )) return
    setSavingReview(activity.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      await db.from('approval_requests').delete().eq('activity_id', activity.id)
      await db.from('activities').update({
        submission_status: '미완료',
        review_status: '미검토',
        updated_at: new Date().toISOString(),
      }).eq('id', activity.id)

      setActivities(prev => prev.map(a => a.id === activity.id
        ? { ...a, submission_status: '미완료', review_status: '미검토' }
        : a))
      setApprovalStatuses(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      setPendingReview(prev => { const n = { ...prev }; delete n[activity.id]; return n })
    } catch (err) {
      window.alert(`강제 취소 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setSavingReview(null)
    }
  }

  function downloadExcel() {
    const rows = filtered.map((a, i) => ({
      '번호': i + 1,
      '통제번호': a.control_code ?? '',
      '담당자': a.owner_name ?? '',
      '관련부서': a.department ?? '',
      '통제활동명': a.title ?? '',
      '제출증빙설명': a.description ?? '',
      '승인자': a.controller_name ?? '',
      'KPI점수': a.kpi_score ?? '',
      '상신여부': a.submission_status ?? '',
      '증빙수': evidenceCounts[a.id] ?? 0,
      '승인상태': approvalStatuses[a.id] === 'approved' ? '승인완료' : approvalStatuses[a.id] === 'rejected' ? '반려' : approvalStatuses[a.id] === 'submitted' ? '승인대기' : '-',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 5 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 40 },
      { wch: 36 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '증빙관리')
    XLSX.writeFile(wb, `증빙관리_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-6 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="p-4 border-b border-warm-50 flex items-center gap-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-4 w-20 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )

  const roleDesc = profile?.role === 'owner'
    ? '담당 통제활동의 증빙을 업로드하고 결재상신합니다'
    : profile?.role === 'controller'
      ? '담당 통제활동의 증빙 제출 현황'
      : '전체 증빙관리 현황'

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">증빙관리<span className="sep" />전체 목록</div>
            <h1>증빙 목록. <span className="soft">{profile?.role === 'owner' ? '내 담당만.' : '모든 통제활동.'}</span></h1>
            <p className="lead">{roleDesc} · 검색·필터·일괄 승인이 가능합니다.</p>
          </div>
          <div className="actions">
            <button className="btn-compact" onClick={fetchActivities}>
              <RefreshCw size={13} />새로고침
            </button>
            <button className="btn-compact primary" onClick={downloadExcel}>
              <Download size={13} />엑셀 다운로드
            </button>
          </div>
        </div>
      </div>

      <div className="pg-body">
        {/* Summary strip */}
        <div className="sum-strip">
          <div className="cell"><div className="l"><span className="ic blue">●</span>전체</div><div className="v">{stats.total}<span className="u">건</span></div><div className="sub">이번 주기 누적</div></div>
          <div className="cell"><div className="l"><span className="ic green">●</span>완료</div><div className="v">{stats.approved}<span className="u">건</span></div><div className="sub">승인 완료 · {rate}%</div></div>
          <div className="cell"><div className="l"><span className="ic amber">●</span>대기</div><div className="v">{stats.complete}<span className="u">건</span></div><div className="sub">담당자/승인자 작업 중</div></div>
          <div className="cell"><div className="l"><span className="ic red">●</span>반려</div><div className="v">{stats.rejected}<span className="u">건</span></div><div className="sub">재작성 필요</div></div>
          {/* 담당자·관리자에게만 수정제출 타일 노출 */}
          {(profile?.role === 'admin' || profile?.role === 'owner') && (
            <div className="cell"><div className="l"><span className="ic amber">●</span>수정제출</div><div className="v">{stats.modifyReq}<span className="u">건</span></div><div className="sub">관리자 수정 요청</div></div>
          )}
        </div>

        {loadError && (
          <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: 13 }}>{loadError}</div>
        )}

        <div className="data-card">
          <div className="toolbar">
            <div className="left">
              <div className="tbl-title">증빙 목록</div>
              <div className="tbl-count">{filtered.length} ITEMS · 2026 Q2</div>
            </div>
            <div className="search">
              <span className="ic"><Search size={14} /></span>
              <input placeholder="통제번호·활동명·담당자 검색" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-chips">
              {[
                { key: 'all', label: '전체', count: stats.total },
                { key: '미완료', label: '미완료', count: stats.pending },
                { key: '완료', label: '상신완료', count: stats.complete },
                { key: '승인', label: '승인완료', count: stats.approved },
                { key: '반려', label: '반려', count: stats.rejected },
                ...(profile?.role === 'admin' || profile?.role === 'owner'
                  ? [{ key: 'modifyReq', label: '수정제출', count: stats.modifyReq }]
                  : []),
              ].map(f => (
                <span
                  key={f.key}
                  className={clsx('filter-chip', statusFilter === f.key && 'active')}
                  onClick={() => setStatusFilter(f.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {f.label} <span className="cnt">{f.count}</span>
                </span>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--at-ink-faint)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 500 }}>데이터가 없습니다</p>
            </div>
          ) : (
          <div className="tbl-scroll">
            <table className="at-table compact" style={{ width: '100%', tableLayout: 'fixed' }}>
              {/* 사용자 요청: 통제활동명 우측 2.5cm 확장, 담당부서 좌측 3cm 축소 */}
              <colgroup>
                <col style={{ width: 110 }} />  {/* 통제번호 (TR.05.W10.C10 풀네임 수용) */}
                <col />                         {/* 통제활동명 (flex 확장) */}
                <col style={{ width: 58 }} />   {/* 담당부서 (좁게) */}
                <col style={{ width: 56 }} />   {/* 담당자 */}
                <col style={{ width: 56 }} />   {/* 승인자 */}
                <col style={{ width: 46 }} />   {/* 건수 */}
                <col style={{ width: 40 }} />   {/* KPI */}
                <col style={{ width: 64 }} />   {/* 상신 */}
                <col style={{ width: 64 }} />   {/* 승인 */}
                {profile?.role === 'admin' && <col style={{ width: 220 }} />}
                <col style={{ width: 70 }} />   {/* 액션 */}
              </colgroup>
              <thead>
                <tr>
                  <th>통제번호</th>
                  <th>통제활동명</th>
                  <th>담당부서</th>
                  <th>담당자</th>
                  <th>승인자</th>
                  <th className="num">건수</th>
                  <th>KPI</th>
                  <th>상신</th>
                  <th>승인</th>
                  {profile?.role === 'admin' && <th>검토결과</th>}
                  <th className="num">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(act => {
                  const si = STATUS_MAP[act.submission_status] ?? STATUS_MAP['미완료']
                  const canUpload = profile?.role === 'owner' && act.submission_status !== '승인'
                  const isView = profile?.role === 'controller' || (profile?.role === 'admin')
                  const uploaded = evidenceCounts[act.id] ?? 0
                  const total = populationTotals[act.id] ?? 0
                  const aprStatus = approvalStatuses[act.id]
                  return (
                    <tr key={act.id}>
                      <td><span className="pr-code">{act.control_code}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--at-ink)' }} title={act.title ?? ''}>
                        {act.title && act.title.length > 36 ? act.title.slice(0, 36) + '…' : (act.title ?? '-')}
                      </td>
                      <td>{act.department ?? '-'}</td>
                      <td>{act.owner_name ?? '-'}</td>
                      <td>{act.controller_name ?? '-'}</td>
                      <td className="num">
                        <span style={{ fontFamily: 'var(--f-mono)', fontWeight: 600, color: total > 0 && uploaded >= total ? 'var(--at-green)' : uploaded > 0 ? 'var(--at-blue)' : 'var(--at-ink-faint)' }}>
                          {uploaded}/{total}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 500 }}>{act.kpi_score != null ? act.kpi_score.toFixed(1) : '-'}</td>
                      <td><span className={`at-tag ${si.cls.includes('yellow') ? 'amber' : si.cls.includes('blue') ? 'blue' : si.cls.includes('green') ? 'green' : si.cls.includes('red') ? 'red' : 'gray'}`}>{si.label}</span></td>
                      <td>
                        {aprStatus === 'approved' ? <span className="at-tag green">승인완료</span>
                          : aprStatus === 'rejected' ? <span className="at-tag red">반려</span>
                          : aprStatus === 'submitted' ? <span className="at-tag amber">승인대기</span>
                          : <span style={{ color: 'var(--at-ink-faint)', fontSize: 11 }}>-</span>}
                      </td>
                      {profile?.role === 'admin' && (() => {
                        const staged = pendingReview[act.id]
                        const current = act.review_status ?? '미검토'
                        const shown = staged ?? current
                        const dirty = staged !== undefined && staged !== current
                        const bg = shown === '완료' ? '#E8F5ED'
                          : shown === '검토중' ? '#E8F2FE'
                          : shown === '수정제출' ? '#FEF3C7'
                          : '#F2F4F6'
                        const color = shown === '완료' ? 'var(--at-green)'
                          : shown === '검토중' ? 'var(--at-blue)'
                          : shown === '수정제출' ? '#92400E'
                          : 'var(--at-ink-mute)'
                        return (
                          <td>
                            <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                              <select
                                value={shown}
                                onChange={e => onReviewSelectChange(act.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  padding: '4px 8px', borderRadius: 8, border: dirty ? '1px solid var(--at-blue)' : '1px solid var(--at-ink-line)',
                                  background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                              >
                                {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button
                                onClick={() => saveReviewStatus(act)}
                                disabled={savingReview === act.id || !dirty}
                                title="검토결과 저장"
                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: dirty ? 'var(--at-blue)' : 'var(--at-ink-hair)', color: dirty ? '#fff' : 'var(--at-ink-faint)', cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              >
                                <Save size={10} />저장
                              </button>
                              <button
                                onClick={() => forceCancel(act)}
                                disabled={savingReview === act.id || act.submission_status === '미완료'}
                                title="관리자 강제 취소 — 완전 초기화"
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FCA5A5', background: act.submission_status === '미완료' ? '#F3F4F6' : '#FEE2E2', color: act.submission_status === '미완료' ? 'var(--at-ink-faint)' : '#B91C1C', cursor: act.submission_status === '미완료' ? 'not-allowed' : 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                              >
                                <XCircle size={10} />취소
                              </button>
                            </div>
                          </td>
                        )
                      })()}
                      <td className="num">
                        {canUpload ? (
                          <button
                            onClick={() => openUploadModal(act)}
                            className="btn-compact primary"
                            style={{ padding: '0 10px', height: 28 }}
                          >
                            <Upload size={11} />업로드
                          </button>
                        ) : isView ? (
                          <button
                            onClick={() => openUploadModal(act)}
                            className="btn-compact"
                            style={{ padding: '0 10px', height: 28 }}
                          >
                            <FileCheck2 size={11} />확인
                          </button>
                        ) : (
                          <span style={{ color: 'var(--at-ink-faint)', fontSize: 11 }}>-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--at-ink-hair)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--at-ink-faint)' }}>
            <div>
              증빙 <b style={{ color: 'var(--at-ink)' }}>
                {filtered.reduce((sum, a) => sum + (evidenceCounts[a.id] ?? 0), 0)}
                /
                {filtered.reduce((sum, a) => sum + (populationTotals[a.id] ?? 0), 0)}
              </b> · 통제활동 <b style={{ color: 'var(--at-ink)' }}>{filtered.length}</b>건
              {filtered.length !== activities.length ? ` (전체 ${activities.length}건 중)` : ''}
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', letterSpacing: '0.12em' }}>SHOWING {filtered.length} ITEMS</div>
          </div>
        </div>
      </div>

      {/* 업로드 모달 */}
      {modalOpen && selectedActivity && (
        <EvidenceUploadModal
          activity={selectedActivity}
          onClose={handleClose}
          viewOnly={profile?.role === 'controller'}
        />
      )}
    </>
  )
}
