import { useEffect, useState, useCallback } from 'react'
import {
  Inbox, CheckCircle2, XCircle, Clock, MessageSquare,
  RefreshCw, Eye, Loader2
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
  }, [profile])

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

      // 2. activities submission_status 업데이트
      if (item.activity_id) {
        await db.from('activities')
          .update({
            submission_status: decision === 'approved' ? '승인' : '반려',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.activity_id)
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
    if (!confirm('관리자 권한으로 이 결재를 취소(초기화)하시겠습니까?')) return
    setProcessing(item.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('approval_requests').update({ status: 'submitted' }).eq('id', item.id)
    if (item.activity_id) {
      await db.from('activities').update({ submission_status: '완료' }).eq('id', item.activity_id)
    }
    setProcessing(null)
    fetchInbox()
  }

  function openViewModal(item: ApprovalItem) {
    if (item.activity) {
      setSelectedActivity(item.activity)
      setModalOpen(true)
    }
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
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Inbox size={22} className="text-brand-600" />
            {profile?.role === 'controller' ? '내승인함' : '결재 현황'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
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
          <p className="text-xs text-gray-500">결재 대기</p>
          <p className="text-xl font-black text-gray-900">{pending}<span className="text-xs text-gray-400 font-normal ml-0.5">건</span></p>
        </div>
        <div className="card p-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-xs text-gray-500">승인완료</p>
          <p className="text-xl font-black text-gray-900">{approved}<span className="text-xs text-gray-400 font-normal ml-0.5">건</span></p>
        </div>
        <div className="card p-4">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-2">
            <XCircle size={16} />
          </div>
          <p className="text-xs text-gray-500">반려</p>
          <p className="text-xl font-black text-gray-900">{rejected}<span className="text-xs text-gray-400 font-normal ml-0.5">건</span></p>
        </div>
      </div>

      {/* 결재 목록 */}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox size={40} className="mb-3 text-gray-200" />
          <p className="font-medium text-gray-500">결재 항목이 없습니다</p>
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
                isPending && 'border-amber-100 bg-amber-50/30'
              )}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* 상단: 통제번호 + 상태 */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
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
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      {act?.title ?? '(활동명 없음)'}
                    </p>

                    {/* 메타 */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>담당자: <b className="text-gray-700">{act?.owner_name ?? '-'}</b></span>
                      <span>부서: <b className="text-gray-700">{act?.department ?? '-'}</b></span>
                      {item.submitted_at && (
                        <span>상신일: {new Date(item.submitted_at).toLocaleDateString('ko-KR')}</span>
                      )}
                      {item.decided_at && (
                        <span>결재일: {new Date(item.decided_at).toLocaleDateString('ko-KR')}</span>
                      )}
                    </div>

                    {/* 코멘트 */}
                    {item.controller_comment && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
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
