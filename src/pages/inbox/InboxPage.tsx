import { useEffect, useState, useCallback } from 'react'
import {
  Inbox, CheckCircle2, XCircle, Clock, MessageSquare,
  RefreshCw, Eye, Loader2, CheckSquare, Square
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'
import EvidenceUploadModal from '../evidence/EvidenceUploadModal'

interface ApprovalItem {
  id: string
  unique_key: string | null
  control_code: string | null
  activity_id: string | null
  status: string
  submitted_at: string | null
  decided_at: string | null
  owner_comment: string | null
  controller_comment: string | null
  activity?: {
    id: string
    control_code: string
    owner_name: string | null
    department: string | null
    title: string | null
    description: string | null
    controller_name: string | null
    controller_email: string | null
    kpi_score: number | null
    submission_status: string
    unique_key: string | null
    owner_id: string | null
    controller_id: string | null
    owner_email: string | null
  }
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  submitted: { label: '결재 대기', cls: 'badge-yellow' },
  approved:  { label: '승인완료',  cls: 'badge-green' },
  rejected:  { label: '반려',      cls: 'badge-red' },
}

export default function InboxPage() {
  const { profile } = useAuth()
  const [items,   setItems]   = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [commentMap, setCommentMap] = useState<Record<string, string>>({})
  const [selectedActivity, setSelectedActivity] = useState<ApprovalItem['activity'] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>())
  const [batchProcessing, setBatchProcessing] = useState(false)

  const fetchInbox = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      let q = db.from('approval_requests').select(`
        *,
        activity:activity_id (
          id, control_code, owner_name, department, title, description,
          controller_name, controller_email, kpi_score, submission_status,
          unique_key, owner_id, controller_id, owner_email
        )
      `)

      if (profile.role === 'controller') {
        q = q.eq('controller_id', profile.id)
      } else if (profile.role === 'owner') {
        q = q.eq('owner_id', profile.id)
      }
      // admin은 전체

      q = q.order('submitted_at', { ascending: false })
      const { data: rawData } = await q
      if (!rawData) { setItems([]); return }

      // activity_id가 없는 경우 unique_key로 activities를 별도 조회
      const missingKeys = rawData
        .filter((r: ApprovalItem) => !r.activity && r.unique_key)
        .map((r: ApprovalItem) => r.unique_key!)

      const actByKey: Record<string, ApprovalItem['activity']> = {}
      if (missingKeys.length > 0) {
        const { data: acts } = await db.from('activities').select('*').in('unique_key', missingKeys)
        ;(acts ?? []).forEach((a: NonNullable<ApprovalItem['activity']>) => {
          if (a.unique_key) actByKey[a.unique_key] = a
        })
      }

      const merged = rawData.map((r: ApprovalItem) => ({
        ...r,
        activity: r.activity ?? (r.unique_key ? actByKey[r.unique_key] : null)
      }))
      setItems(merged)
    } catch (err) {
      console.error('[InboxPage] fetch error:', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  async function handleDecision(item: ApprovalItem, decision: 'approved' | 'rejected') {
    const comment = commentMap[item.id] ?? ''
    if (decision === 'rejected' && !comment.trim()) {
      alert('반려 시 사유를 입력해주세요.')
      return
    }
    if (!confirm(decision === 'approved'
      ? `"${item.activity?.title ?? item.control_code}"을 승인하시겠습니까?`
      : `반려 처리하시겠습니까?\n사유: ${comment}`
    )) return

    setProcessing(item.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 1. approval_requests 업데이트
      await db.from('approval_requests')
        .update({
          status: decision,
          controller_comment: comment,
          decided_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      // 2. activities submission_status 업데이트 (activity_id 또는 unique_key로)
      const newStatus = decision === 'approved' ? '승인' : '반려'
      if (item.activity_id) {
        await db.from('activities')
          .update({ submission_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', item.activity_id)
      } else if (item.unique_key) {
        await db.from('activities')
          .update({ submission_status: newStatus, updated_at: new Date().toISOString() })
          .eq('unique_key', item.unique_key)
      }

      // 3. 이메일 알림 발송 (send-approval-email Edge Function)
      try {
        const ownerEmail = item.activity?.owner_email
        if (ownerEmail) {
          await supabase.functions.invoke('send-approval-email', {
            body: {
              type: decision,                                    // 'approved' | 'rejected'
              to: ownerEmail,                                    // 담당자 이메일
              recipientName: item.activity?.owner_name ?? '',   // 담당자 이름
              submitterName: item.activity?.owner_name ?? '',
              controlCode: item.control_code ?? item.activity?.control_code ?? '',
              activityTitle: item.activity?.title ?? '',
              uniqueKey: item.unique_key ?? '',
              rejectedReason: decision === 'rejected' ? comment : undefined,
            }
          })
        }
      } catch { /* 이메일 실패해도 결재 처리는 유지 */ }


      fetchInbox()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    }
    setProcessing(null)
  }

  async function handleAdminCancel(item: ApprovalItem) {
    if (!confirm('관리자 권한으로 이 결재를 강제 취소하시겠습니까?\n\n• 승인/반려 이력 삭제 (승인자 승인완료 상태 초기화)\n• 상신여부 → 미완료\n• 검토결과 → 미검토\n• 증빙 Upload 재활성화\n• 대시보드 자동 반영')) return
    setProcessing(item.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      // 1. 결재 이력 전체 삭제 (activity_id 기준, 같은 activity의 모든 approval_requests 제거)
      //    → 승인자의 '승인완료' 뱃지도 즉시 사라짐
      if (item.activity_id) {
        await db.from('approval_requests').delete().eq('activity_id', item.activity_id)
      } else {
        await db.from('approval_requests').delete().eq('id', item.id)
      }

      // 2. 통제활동 상태 완전 리셋 → 미완료 + 검토결과 미검토 → 담당자가 처음부터 다시 작업 가능
      const resetPayload = {
        submission_status: '미완료',
        review_status: '미검토',
        updated_at: new Date().toISOString(),
      }
      if (item.activity_id) {
        await db.from('activities').update(resetPayload).eq('id', item.activity_id)
      } else if (item.unique_key) {
        await db.from('activities').update(resetPayload).eq('unique_key', item.unique_key)
      }
      fetchInbox()
    } catch (err) {
      console.error('[InboxPage] handleAdminCancel error:', err)
      alert('취소 처리 중 오류가 발생했습니다.')
    } finally {
      setProcessing(null)
    }
  }

  function openViewModal(item: ApprovalItem) {
    if (item.activity) {
      setSelectedActivity(item.activity)
      setModalOpen(true)
    }
  }

  const canBatchSelect = profile?.role === 'controller' || profile?.role === 'admin'

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const visibleIds = items.map(i => i.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleIds))
    }
  }

  async function handleBatchApprove() {
    const targets = items.filter(i => selectedIds.has(i.id) && i.status === 'submitted')
    if (targets.length === 0) {
      alert('승인 가능한 항목이 없습니다. (결재 대기 상태만 승인 가능)')
      return
    }
    if (!confirm(`선택한 ${targets.length}건을 일괄 승인하시겠습니까?`)) return

    setBatchProcessing(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    let successCount = 0

    for (const item of targets) {
      try {
        const comment = commentMap[item.id] ?? ''
        await db.from('approval_requests')
          .update({
            status: 'approved',
            controller_comment: comment,
            decided_at: new Date().toISOString(),
          })
          .eq('id', item.id)

        if (item.activity_id) {
          await db.from('activities')
            .update({ submission_status: '승인', updated_at: new Date().toISOString() })
            .eq('id', item.activity_id)
        } else if (item.unique_key) {
          await db.from('activities')
            .update({ submission_status: '승인', updated_at: new Date().toISOString() })
            .eq('unique_key', item.unique_key)
        }

        // 이메일 알림
        try {
          const ownerEmail = item.activity?.owner_email
          if (ownerEmail) {
            await supabase.functions.invoke('send-approval-email', {
              body: {
                type: 'approved',
                to: ownerEmail,
                recipientName: item.activity?.owner_name ?? '',
                submitterName: item.activity?.owner_name ?? '',
                controlCode: item.control_code ?? item.activity?.control_code ?? '',
                activityTitle: item.activity?.title ?? '',
                uniqueKey: item.unique_key ?? '',
              }
            })
          }
        } catch { /* 이메일 실패해도 결재 처리 유지 */ }

        successCount++
      } catch (err) {
        console.error(`[InboxPage] batch approve error for ${item.id}:`, err)
      }
    }

    alert(`${successCount}/${targets.length}건 승인 완료`)
    setSelectedIds(new Set())
    setBatchProcessing(false)
    fetchInbox()
  }

  async function handleBatchCancel() {
    const targets = items.filter(i => selectedIds.has(i.id))

    if (profile?.role === 'controller') {
      // controller: 대기 중인 항목만 반려 가능
      const pendingTargets = targets.filter(i => i.status === 'submitted')
      if (pendingTargets.length === 0) {
        alert('반려 가능한 항목이 없습니다. (결재 대기 상태만 반려 가능)')
        return
      }
      if (!confirm(`선택한 ${pendingTargets.length}건을 일괄 반려하시겠습니까?`)) return

      setBatchProcessing(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      let successCount = 0

      for (const item of pendingTargets) {
        try {
          const comment = commentMap[item.id] ?? ''
          await db.from('approval_requests')
            .update({
              status: 'rejected',
              controller_comment: comment || '일괄 반려',
              decided_at: new Date().toISOString(),
            })
            .eq('id', item.id)

          if (item.activity_id) {
            await db.from('activities')
              .update({ submission_status: '반려', updated_at: new Date().toISOString() })
              .eq('id', item.activity_id)
          } else if (item.unique_key) {
            await db.from('activities')
              .update({ submission_status: '반려', updated_at: new Date().toISOString() })
              .eq('unique_key', item.unique_key)
          }

          // 이메일 알림
          try {
            const ownerEmail = item.activity?.owner_email
            if (ownerEmail) {
              await supabase.functions.invoke('send-approval-email', {
                body: {
                  type: 'rejected',
                  to: ownerEmail,
                  recipientName: item.activity?.owner_name ?? '',
                  submitterName: item.activity?.owner_name ?? '',
                  controlCode: item.control_code ?? item.activity?.control_code ?? '',
                  activityTitle: item.activity?.title ?? '',
                  uniqueKey: item.unique_key ?? '',
                  rejectedReason: comment || '일괄 반려',
                }
              })
            }
          } catch { /* 이메일 실패해도 결재 처리 유지 */ }

          successCount++
        } catch (err) {
          console.error(`[InboxPage] batch reject error for ${item.id}:`, err)
        }
      }

      alert(`${successCount}/${pendingTargets.length}건 반려 완료`)
    } else if (profile?.role === 'admin') {
      // admin: 모든 상태 강제 취소 가능 (per spec #8)
      if (targets.length === 0) {
        alert('선택된 항목이 없습니다.')
        return
      }
      if (!confirm(`선택한 ${targets.length}건을 일괄 강제 취소하시겠습니까?\n\n• 승인/반려 이력 삭제 (승인완료 뱃지 제거)\n• 상신여부 → 미완료, 검토결과 → 미검토\n• 증빙 Upload 재활성화\n• 대시보드 자동 반영`)) return

      setBatchProcessing(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      let successCount = 0

      for (const item of targets) {
        try {
          // Delete ALL approval_requests for this activity (not just this row)
          if (item.activity_id) {
            await db.from('approval_requests').delete().eq('activity_id', item.activity_id)
          } else {
            await db.from('approval_requests').delete().eq('id', item.id)
          }

          const resetPayload = {
            submission_status: '미완료',
            review_status: '미검토',
            updated_at: new Date().toISOString(),
          }
          if (item.activity_id) {
            await db.from('activities').update(resetPayload).eq('id', item.activity_id)
          } else if (item.unique_key) {
            await db.from('activities').update(resetPayload).eq('unique_key', item.unique_key)
          }

          successCount++
        } catch (err) {
          console.error(`[InboxPage] batch admin cancel error for ${item.id}:`, err)
        }
      }

      alert(`${successCount}/${targets.length}건 강제 취소 완료`)
    }

    setSelectedIds(new Set())
    setBatchProcessing(false)
    fetchInbox()
  }

  if (loading) return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="skeleton h-6 w-28 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="skeleton h-8 w-20 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-6 w-12 rounded" />
          </div>
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="card p-5 space-y-3">
          <div className="flex gap-2">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-5 w-16 rounded-full" />
          </div>
          <div className="skeleton h-4 w-64 rounded" />
          <div className="flex gap-4">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )

  const pending  = items.filter(i => i.status === 'submitted').length
  const approved = items.filter(i => i.status === 'approved').length
  const rejected = items.filter(i => i.status === 'rejected').length

  return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-900 flex items-center gap-2">
            <Inbox size={22} className="text-brand-700" />
            {profile?.role === 'controller' ? '내승인함' : '결재 현황'}
          </h1>
          <p className="text-warm-500 text-sm mt-0.5">
            {profile?.role === 'controller'
              ? '담당자가 상신한 증빙 결재를 처리합니다'
              : '전체 결재 현황을 관리합니다'}
          </p>
        </div>
        <button onClick={fetchInbox} className="btn-ghost text-xs px-3 py-2">
          <RefreshCw size={14} />새로고침
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
            <Clock size={16} />
          </div>
          <p className="text-xs text-warm-500">결재 대기</p>
          <p className="text-xl font-bold text-brand-900">{pending}<span className="text-xs text-warm-400 font-normal ml-0.5">건</span></p>
        </div>
        <div className="card p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-xs text-warm-500">승인완료</p>
          <p className="text-xl font-bold text-brand-900">{approved}<span className="text-xs text-warm-400 font-normal ml-0.5">건</span></p>
        </div>
        <div className="card p-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-2">
            <XCircle size={16} />
          </div>
          <p className="text-xs text-warm-500">반려</p>
          <p className="text-xl font-bold text-brand-900">{rejected}<span className="text-xs text-warm-400 font-normal ml-0.5">건</span></p>
        </div>
      </div>

      {/* 일괄 처리 바 (controller, admin만) */}
      {canBatchSelect && items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 card p-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-brand-900 font-medium">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center justify-center w-5 h-5 text-brand-700 hover:text-brand-900 transition-colors"
            >
              {items.length > 0 && items.every(i => selectedIds.has(i.id))
                ? <CheckSquare size={18} />
                : <Square size={18} />}
            </button>
            전체선택
          </label>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-warm-500">{selectedIds.size}건 선택</span>
              <button
                onClick={handleBatchApprove}
                disabled={batchProcessing}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
                )}
              >
                {batchProcessing
                  ? <Loader2 size={13} className="animate-spin" />
                  : <CheckCircle2 size={13} />}
                일괄 승인
              </button>
              <button
                onClick={handleBatchCancel}
                disabled={batchProcessing}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
                )}
              >
                {batchProcessing
                  ? <Loader2 size={13} className="animate-spin" />
                  : <XCircle size={13} />}
                {profile?.role === 'admin' ? '일괄 취소' : '일괄 반려'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 결재 목록 */}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-warm-400">
          <Inbox size={40} className="mb-3 text-warm-200" />
          <p className="font-medium text-warm-500">결재 항목이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const si = STATUS_MAP[item.status] ?? STATUS_MAP.submitted
            const isPending = item.status === 'submitted'
            const act = item.activity
            return (
              <div key={item.id} className={clsx(
                'card p-5 transition-all',
                isPending && 'border-amber-100 bg-amber-50/30',
                selectedIds.has(item.id) && 'ring-2 ring-brand-500/40 bg-brand-50/20'
              )}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {canBatchSelect && (
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className="flex items-center justify-center w-5 h-5 shrink-0 mt-0.5 text-brand-700 hover:text-brand-900 transition-colors"
                    >
                      {selectedIds.has(item.id)
                        ? <CheckSquare size={18} className="text-brand-600" />
                        : <Square size={18} className="text-warm-400" />}
                    </button>
                  )}
                  <div className="flex-1">
                    {/* 상단: 통제번호 + 상태 */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <code className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded">
                        {act?.control_code ?? item.control_code ?? '-'}
                      </code>
                      <span className={si.cls}>{si.label}</span>
                      {isPending && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock size={11} />결재 대기 중
                        </span>
                      )}
                    </div>

                    {/* 통제활동명 */}
                    <p className="text-sm font-bold text-brand-900 mb-1">
                      {act?.title ?? '(활동명 없음)'}
                    </p>

                    {/* 메타 */}
                    <div className="flex flex-wrap gap-3 text-xs text-warm-500">
                      <span>담당자: <b className="text-brand-700">{act?.owner_name ?? '-'}</b></span>
                      <span>부서: <b className="text-brand-700">{act?.department ?? '-'}</b></span>
                      {item.submitted_at && (
                        <span>상신일: {new Date(item.submitted_at).toLocaleDateString('ko-KR')}</span>
                      )}
                      {item.decided_at && (
                        <span>결재일: {new Date(item.decided_at).toLocaleDateString('ko-KR')}</span>
                      )}
                    </div>

                    {/* 코멘트 */}
                    {item.controller_comment && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-warm-500 bg-warm-50 rounded-lg p-2">
                        <MessageSquare size={11} className="shrink-0 mt-0.5" />
                        <span>{item.controller_comment}</span>
                      </div>
                    )}
                  </div>

                  {/* 우측 액션 */}
                  <div className="flex flex-col gap-2 shrink-0 min-w-[180px]">
                    {/* 증빙 확인 버튼 */}
                    <button
                      onClick={() => openViewModal(item)}
                      className="btn-secondary text-xs py-2"
                    >
                      <Eye size={13} />증빙 확인
                    </button>

                    {/* 결재 처리 (controller만, 대기 중일 때) */}
                    {profile?.role === 'controller' && isPending && (
                      <>
                        <textarea
                          value={commentMap[item.id] ?? ''}
                          onChange={e => setCommentMap(p => ({ ...p, [item.id]: e.target.value }))}
                          placeholder="결재 의견 입력 (반려 시 필수)"
                          rows={2}
                          className="form-input text-xs resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDecision(item, 'approved')}
                            disabled={!!processing}
                            className="btn-success flex-1 text-xs py-2"
                          >
                            {processing === item.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <CheckCircle2 size={13} />}
                            승인
                          </button>
                          <button
                            onClick={() => handleDecision(item, 'rejected')}
                            disabled={!!processing}
                            className="btn-danger flex-1 text-xs py-2"
                          >
                            {processing === item.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <XCircle size={13} />}
                            반려
                          </button>
                        </div>
                      </>
                    )}

                    {/* 관리자: 취소 버튼 */}
                    {profile?.role === 'admin' && item.status !== 'submitted' && (
                      <button
                        onClick={() => handleAdminCancel(item)}
                        className="btn-ghost text-xs py-2 text-orange-600 hover:bg-orange-50"
                      >
                        결재 취소 (관리자)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 증빙 확인 모달 */}
      {modalOpen && selectedActivity && (
        <EvidenceUploadModal
          activity={selectedActivity}
          onClose={() => { setModalOpen(false); setSelectedActivity(null) }}
          viewOnly={true}
        />
      )}
    </div>
  )
}
