import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  FileCheck2, Upload,
  Search, RefreshCw, Download,
  AlertCircle, Save,
} from 'lucide-react'
// xlsx 는 '엑셀 다운로드' 클릭시만 필요 → 동적 import (vendor-xlsx 421kB 지연 로드)
import { supabase } from '../../lib/supabase'
import { safeQueryRetry, chunkedIn } from '../../lib/queryWithTimeout'
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
  owner_employee_id?: string | null
  controller_employee_id?: string | null
  review_status?: string | null
  review_memo?: string | null
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
    // Builder factory — 매 재시도마다 새 쿼리 생성 (PostgrestBuilder 는 await 1회로 lock)
    const buildActivitiesQuery = () => {
      let q = db.from('activities').select('id, control_code, owner_name, department, title, description, controller_name, kpi_score, submission_status, review_status, review_memo, unique_key, owner_id, controller_id, owner_email, controller_email, owner_employee_id, controller_employee_id').eq('active', true)
      if (profile.role === 'owner') {
        if (profile.employee_id) q = q.eq('owner_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('owner_name', profile.full_name)
        else q = q.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) q = q.eq('controller_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('controller_name', profile.full_name)
        else q = q.eq('controller_id', profile.id)
      }
      return q.order('control_code').order('department')
    }

    try {
      // 5초 타임아웃 + 1회 재시도 (3초) — 브라우저 hang 시 빠른 복구
      const { data } = await safeQueryRetry<Activity[]>(buildActivitiesQuery, 'evidence.activities', 5000, 3000)
      const rows = data ?? []
      setActivities(rows)
      setFiltered(rows)

      // Load evidence counts, population totals, and approval statuses in parallel — 각 쿼리 타임아웃 래핑
      const activityIds = rows.map((r: Activity) => r.id)
      const uniqueKeys = rows.map((r: Activity) => r.unique_key).filter(Boolean) as string[]
      if (activityIds.length > 0) {
        // URL 길이 초과 (PostgREST 8KB 제한) 방지 — 특히 한글 unique_key 400+ 건에서 400 에러
        // 모든 IN 쿼리를 chunk(100) 로 쪼개어 순차 실행
        const [uploadsRes, approvalsRes, populationRes] = await Promise.all([
          chunkedIn<{ activity_id: string }>(
            (chunk) => db.from('evidence_uploads').select('activity_id').in('activity_id', chunk),
            activityIds, 100, 12_000, 'evidence.uploads',
          ),
          chunkedIn<{ activity_id: string; status: string }>(
            (chunk) => db.from('approval_requests').select('activity_id, status').in('activity_id', chunk),
            activityIds, 100, 12_000, 'evidence.approvals',
          ),
          uniqueKeys.length > 0
            ? chunkedIn<{ unique_key: string }>(
                (chunk) => db.from('population_items').select('unique_key').in('unique_key', chunk),
                uniqueKeys, 50, 12_000, 'evidence.population',
              )
            : Promise.resolve({ data: [] as { unique_key: string }[], error: null }),
        ])
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
    } else if (statusFilter === 'notReviewed') {
      r = r.filter(a => (a.review_status ?? '미검토') === '미검토')
    } else if (statusFilter === 'reviewing') {
      r = r.filter(a => a.review_status === '검토중')
    } else if (statusFilter === 'reviewDone') {
      r = r.filter(a => a.review_status === '완료')
    } else if (statusFilter !== 'all') {
      r = r.filter(a => a.submission_status === statusFilter)
    }
    // 결재대기(awaiting) 필터는 상신완료와 의미가 동일하여 제거됨
    setFiltered(r)
  }, [search, statusFilter, activities])

  // 박스 카운트 — 합산이 정확히 total 이 되도록 수정제출과 다른 박스가 mutually exclusive
  // 우선순위: 수정제출 > 승인 > 반려 > 상신완료(완료) > 미완료
  const stats = useMemo(() => {
    const out = { total: activities.length, pending: 0, complete: 0, approved: 0, rejected: 0, modifyReq: 0, notReviewed: 0, reviewing: 0, reviewDone: 0 }
    for (const a of activities) {
      const rs = a.review_status ?? '미검토'
      // 수정제출 1순위 — 다른 박스에서 빼기 위함 (사용자 핵심 요구: 박스 합 = 전체)
      if (rs === '수정제출') {
        out.modifyReq++
      } else {
        switch (a.submission_status) {
          case '미완료': out.pending++; break
          case '완료':   out.complete++; break
          case '승인':   out.approved++; break
          case '반려':   out.rejected++; break
        }
      }
      // 검토 차원 (관리자 KPI 카드용 — 별도)
      if (rs === '검토중') out.reviewing++
      else if (rs === '완료') out.reviewDone++
      else if (rs !== '수정제출') out.notReviewed++
    }
    return out
  }, [activities])
  const rate = stats.total > 0 ? Math.round(stats.approved / stats.total * 100) : 0

  function openUploadModal(act: Activity) { setSelectedActivity(act); setModalOpen(true) }
  function handleClose(refresh?: boolean) { setModalOpen(false); setSelectedActivity(null); if (refresh) fetchActivities() }

  // 관리자 검토상태·메모 작성 중인 값 (저장 버튼 누르기 전까지 로컬 스테이징)
  const [pendingReview, setPendingReview] = useState<Record<string, string>>({})
  const [pendingMemo,   setPendingMemo]   = useState<Record<string, string>>({})
  const [savingReview,  setSavingReview]  = useState<string | null>(null)

  function onReviewSelectChange(activityId: string, newStatus: string) {
    setPendingReview(prev => ({ ...prev, [activityId]: newStatus }))
  }

  function onMemoChange(activityId: string, memo: string) {
    setPendingMemo(prev => ({ ...prev, [activityId]: memo }))
  }

  // 검토결과 + 메모 저장 (관리자 전용)
  // 수정제출 선택 시: 모든 승인 이력을 cancelled 로, 담당자가 상신 전 상태로 복원
  // 메모는 상태와 무관하게 자유롭게 저장/재저장
  async function saveReviewStatus(activity: Activity) {
    const newStatus = pendingReview[activity.id] ?? activity.review_status ?? '미검토'
    const newMemo = pendingMemo[activity.id] ?? activity.review_memo ?? ''
    const statusChanged = newStatus !== (activity.review_status ?? '미검토')
    const memoChanged = newMemo !== (activity.review_memo ?? '')
    if (!statusChanged && !memoChanged) {
      setPendingReview(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      setPendingMemo(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      return
    }
    setSavingReview(activity.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      const now = new Date().toISOString()
      // 수정제출로 변경 시 — RPC 트랜잭션으로 원자성 보장
      if (statusChanged && newStatus === '수정제출') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpc = (supabase.rpc as unknown as (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)
        const { error: rpcError } = await rpc('set_review_modify_req', { p_activity_id: activity.id, p_review_memo: memoChanged ? (newMemo || null) : null })
        if (rpcError) throw rpcError
      } else {
        // 미검토/검토중/검토완료 또는 메모만 변경 — 기존 path
        const activityPatch: Record<string, unknown> = { updated_at: now }
        if (statusChanged) activityPatch.review_status = newStatus
        if (memoChanged) activityPatch.review_memo = newMemo || null
        const { error: updateError } = await db.from('activities').update(activityPatch).eq('id', activity.id)
        if (updateError) throw updateError
      }

      // 로컬 상태 반영
      setActivities(prev => prev.map(a => a.id === activity.id
        ? {
            ...a,
            ...(statusChanged ? { review_status: newStatus } : {}),
            ...(memoChanged ? { review_memo: newMemo || null } : {}),
            ...(statusChanged && newStatus === '수정제출' ? { submission_status: '미완료' } : {}),
          }
        : a))
      if (statusChanged && newStatus === '수정제출') {
        setApprovalStatuses(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      }
      setPendingReview(prev => { const n = { ...prev }; delete n[activity.id]; return n })
      setPendingMemo(prev => { const n = { ...prev }; delete n[activity.id]; return n })
    } catch (err) {
      window.alert(`검토결과 저장 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    } finally {
      setSavingReview(null)
    }
  }

  async function downloadExcel() {
    const XLSX = await import('xlsx')
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
        {/* Summary strip — 관리자/담당자: 전체/상신완료/승인완료/수정제출/미완료 (반려박스 삭제)
            승인자: 전체/상신완료/승인완료 (수정제출·반려 박스 숨김)
        */}
        <div className="sum-strip">
          {profile?.role === 'controller' ? (
            <>
              <div className="cell" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic blue">●</span>전체</div><div className="v">{stats.total}<span className="u">건</span></div><div className="sub">이번 주기 누적</div></div>
              <div className="cell" onClick={() => setStatusFilter('완료')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic amber">●</span>상신완료</div><div className="v">{stats.complete}<span className="u">건</span></div><div className="sub">승인 대기</div></div>
              <div className="cell" onClick={() => setStatusFilter('승인')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic green">●</span>승인완료</div><div className="v">{stats.approved}<span className="u">건</span></div><div className="sub">달성률 {rate}%</div></div>
            </>
          ) : (
            // 관리자 + 담당자 공통: 전체/상신완료/승인완료/수정제출/미완료
            <>
              <div className="cell" onClick={() => setStatusFilter('all')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic blue">●</span>전체</div><div className="v">{stats.total}<span className="u">건</span></div><div className="sub">이번 주기 누적</div></div>
              <div className="cell" onClick={() => setStatusFilter('완료')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic amber">●</span>상신완료</div><div className="v">{stats.complete}<span className="u">건</span></div><div className="sub">승인 대기</div></div>
              <div className="cell" onClick={() => setStatusFilter('승인')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic green">●</span>승인완료</div><div className="v">{stats.approved}<span className="u">건</span></div><div className="sub">달성률 {rate}%</div></div>
              <div className="cell" onClick={() => setStatusFilter('modifyReq')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic red">●</span>수정제출</div><div className="v">{stats.modifyReq}<span className="u">건</span></div><div className="sub">재작성 요청</div></div>
              <div className="cell" onClick={() => setStatusFilter('미완료')} style={{ cursor: 'pointer' }}><div className="l"><span className="ic gray">●</span>미완료</div><div className="v">{stats.pending}<span className="u">건</span></div><div className="sub">상신 전</div></div>
            </>
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
              {(profile?.role === 'admin'
                ? [
                    // 관리자: 상신완료/상신미완료/승인완료 포함 (요청사항)
                    { key: 'all',        label: '전체',     count: stats.total },
                    { key: '완료',       label: '상신완료', count: stats.complete },
                    { key: '미완료',     label: '상신미완료', count: stats.pending },
                    { key: '승인',       label: '승인완료', count: stats.approved },
                    { key: 'notReviewed', label: '미검토',   count: stats.notReviewed },
                    { key: 'reviewing',  label: '검토중',   count: stats.reviewing },
                    { key: 'reviewDone', label: '검토완료', count: stats.reviewDone },
                    { key: 'modifyReq',  label: '수정제출', count: stats.modifyReq },
                  ]
                : profile?.role === 'controller'
                ? [
                    // 승인자: 반려·수정제출 제거 (요청사항)
                    { key: 'all',  label: '전체',     count: stats.total },
                    { key: '완료', label: '상신완료', count: stats.complete },
                    { key: '승인', label: '승인완료', count: stats.approved },
                  ]
                : [
                    // 담당자: 전체/상신완료/승인완료/수정제출/미완료 (반려 제거)
                    { key: 'all',       label: '전체',     count: stats.total },
                    { key: '완료',      label: '상신완료', count: stats.complete },
                    { key: '승인',      label: '승인완료', count: stats.approved },
                    { key: 'modifyReq', label: '수정제출', count: stats.modifyReq },
                    { key: '미완료',    label: '미완료',   count: stats.pending },
                  ]
              ).map(f => (
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
              <colgroup>
                <col style={{ width: 110 }} />  {/* 통제번호 */}
                <col />                         {/* 통제활동명 */}
                <col style={{ width: 171 }} />  {/* 담당부서 */}
                <col style={{ width: 56 }} />   {/* 담당자 */}
                <col style={{ width: 56 }} />   {/* 승인자 */}
                <col style={{ width: 46 }} />   {/* 건수 */}
                <col style={{ width: 40 }} />   {/* KPI */}
                <col style={{ width: 64 }} />   {/* 상신 */}
                {profile?.role !== 'admin' && <col style={{ width: 220 }} />}{/* 관리자 메모 (담당자·승인자) */}
                {profile?.role === 'admin' && <col style={{ width: 340 }} />}{/* 검토결과(드롭다운+메모) */}
                {/* 승인자/관리자: 승인/반려(=수정제출) 액션 컬럼 (메모와 증빙확인 사이) */}
                {(profile?.role === 'controller' || profile?.role === 'admin') && <col style={{ width: 130 }} />}
                <col style={{ width: 90 }} />   {/* 증빙확인 */}
                <col style={{ width: 76 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>통제번호</th>
                  <th style={{ paddingLeft: 151 }}>통제활동명</th>
                  <th>담당부서</th>
                  <th>담당자</th>
                  <th>승인자</th>
                  <th className="num">건수</th>
                  <th>KPI</th>
                  <th>상신</th>
                  {profile?.role !== 'admin' && <th>관리자 메모</th>}
                  {profile?.role === 'admin' && <th>검토결과</th>}
                  {(profile?.role === 'controller' || profile?.role === 'admin') && <th className="num">결재</th>}
                  <th className="num">증빙확인</th>
                  <th aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(act => {
                  const si = STATUS_MAP[act.submission_status] ?? STATUS_MAP['미완료']
                  const canUpload = profile?.role === 'owner' && act.submission_status !== '승인'
                  const isView = profile?.role === 'controller' || (profile?.role === 'admin')
                  const uploaded = evidenceCounts[act.id] ?? 0
                  const total = populationTotals[act.id] ?? 0
                  return (
                    <tr key={act.id}>
                      <td><span className="pr-code">{act.control_code}</span></td>
                      <td style={{ fontWeight: 500, color: 'var(--at-ink)', paddingLeft: 151 }} title={act.title ?? ''}>
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
                      <td style={{ fontFamily: 'var(--f-mono)', fontWeight: 500 }}>
                        {act.kpi_score != null ? (() => {
                          // KPI 등급: A(≥9) / B(≥7) / C(≥5) / D(≥3) / E(≥1) / F(<1)
                          const s = act.kpi_score
                          const grade = s >= 9 ? 'A' : s >= 7 ? 'B' : s >= 5 ? 'C' : s >= 3 ? 'D' : s >= 1 ? 'E' : 'F'
                          const color = grade === 'A' ? '#10B981' : grade === 'B' ? '#3182F6' : grade === 'C' ? '#F59E0B' : grade === 'D' ? '#FB923C' : grade === 'E' ? '#EF4444' : '#6B7280'
                          return (<span>{s.toFixed(1)} <span style={{ fontWeight: 700, color, fontSize: 10, marginLeft: 2 }}>{grade}</span></span>)
                        })() : '-'}
                      </td>
                      <td><span className={`at-tag ${si.cls.includes('yellow') ? 'amber' : si.cls.includes('blue') ? 'blue' : si.cls.includes('green') ? 'green' : si.cls.includes('red') ? 'red' : 'gray'}`}>{si.label}</span></td>
                      {/* 메모 컬럼 — 담당자·승인자: 관리자가 입력한 메모 (읽기전용) */}
                      {profile?.role !== 'admin' && (
                        <td>
                          {act.review_memo && act.review_memo.trim() ? (
                            <div
                              title={act.review_memo}
                              style={{
                                background: '#FEF3C7',
                                border: '1px solid #FCD34D',
                                color: '#78350F',
                                padding: '4px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                lineHeight: 1.4,
                                maxHeight: 48,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                wordBreak: 'keep-all',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {act.review_memo}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--at-ink-faint)', fontSize: 11 }}>-</span>
                          )}
                        </td>
                      )}
                      {profile?.role === 'admin' && (() => {
                        const staged = pendingReview[act.id]
                        const current = act.review_status ?? '미검토'
                        const shown = staged ?? current
                        const memoStaged = pendingMemo[act.id]
                        const memoCurrent = act.review_memo ?? ''
                        const memoShown = memoStaged ?? memoCurrent
                        // displayed value 가 저장된 값과 다르면 dirty (Puppeteer 등 programmatic 변경 호환)
                        const statusDirty = shown !== current
                        const memoDirty = memoShown !== memoCurrent
                        const dirty = statusDirty || memoDirty
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
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                              <select
                                value={shown}
                                onChange={e => onReviewSelectChange(act.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                  padding: '4px 8px', borderRadius: 8,
                                  border: statusDirty ? '1px solid var(--at-blue)' : '1px solid var(--at-ink-line)',
                                  background: bg, color, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                  flex: '0 0 auto',
                                }}
                              >
                                {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <textarea
                                value={memoShown}
                                onChange={e => onMemoChange(act.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                placeholder="메모"
                                rows={1}
                                maxLength={2000}
                                style={{
                                  flex: '1 1 auto',
                                  padding: '4px 6px', borderRadius: 6,
                                  border: memoDirty ? '1px solid var(--at-blue)' : '1px solid var(--at-ink-line)',
                                  fontSize: 11, lineHeight: 1.3, resize: 'vertical', minHeight: 24, maxHeight: 80,
                                  fontFamily: 'inherit',
                                }}
                              />
                              <button
                                onClick={() => saveReviewStatus(act)}
                                disabled={savingReview === act.id || !dirty}
                                title="검토결과·메모 저장"
                                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: dirty ? 'var(--at-blue)' : 'var(--at-ink-hair)', color: dirty ? '#fff' : 'var(--at-ink-faint)', cursor: dirty ? 'pointer' : 'not-allowed', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3, flex: '0 0 auto' }}
                              >
                                <Save size={10} />저장
                              </button>
                            </div>
                          </td>
                        )
                      })()}
                      {/* 결재 컬럼 — 승인자/관리자 전용. 승인 / 수정제출(반려) 버튼 */}
                      {(profile?.role === 'controller' || profile?.role === 'admin') && (
                        <td className="num">
                          {(() => {
                            const isMyApproval = profile?.role === 'admin' || (act.controller_id === profile?.id || act.controller_employee_id === profile?.employee_id)
                            const canDecide = isMyApproval && act.submission_status === '완료'
                            if (!canDecide) return <span style={{ color: 'var(--at-ink-faint)', fontSize: 11 }}>-</span>
                            return (
                              <div style={{ display: 'inline-flex', gap: 4 }}>
                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`"${act.title}" 을 승인하시겠습니까?`)) return
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const db = supabase as any
                                    const now = new Date().toISOString()
                                    await db.from('approval_requests').update({ status: 'approved', decided_at: now, decided_by: profile?.id }).eq('activity_id', act.id).in('status', ['submitted'])
                                    await db.from('activities').update({ submission_status: '승인', updated_at: now }).eq('id', act.id)
                                    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, submission_status: '승인' } : a))
                                  }}
                                  className="btn-compact primary"
                                  style={{ padding: '0 6px', height: 26, fontSize: 11 }}
                                >승인</button>
                                <button
                                  onClick={async () => {
                                    const reason = window.prompt('수정제출 사유를 입력해주세요:')
                                    if (!reason) return
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const db = supabase as any
                                    const now = new Date().toISOString()
                                    await db.from('approval_requests').update({ status: 'rejected', decided_at: now, decided_by: profile?.id, controller_comment: reason }).eq('activity_id', act.id).in('status', ['submitted'])
                                    await db.from('activities').update({ submission_status: '반려', review_memo: reason, review_status: '수정제출', updated_at: now }).eq('id', act.id)
                                    setActivities(prev => prev.map(a => a.id === act.id ? { ...a, submission_status: '반려', review_memo: reason, review_status: '수정제출' } : a))
                                  }}
                                  className="btn-compact"
                                  style={{ padding: '0 6px', height: 26, fontSize: 11, background: '#FEE2E2', color: '#B91C1C', borderColor: '#FCA5A5' }}
                                >수정제출</button>
                              </div>
                            )
                          })()}
                        </td>
                      )}
                      {/* 증빙확인 컬럼 — 모든 역할에서 모달 열기 */}
                      <td className="num" style={{ paddingRight: 12 }}>
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
                            <FileCheck2 size={11} />증빙확인
                          </button>
                        ) : (
                          <span style={{ color: 'var(--at-ink-faint)', fontSize: 11 }}>-</span>
                        )}
                      </td>
                      <td aria-hidden="true"></td>
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
