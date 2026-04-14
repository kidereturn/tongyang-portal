import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, FileText, Clock, CheckCircle2, XCircle,
  Download, Loader2, AlertCircle, Send, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

interface EvidenceDetail {
  id: string
  status: string
  notes: string | null
  file_path: string | null
  file_name: string | null
  submitted_at: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
  owner_id: string
  current_approver_id: string | null
  activities: { control_code: string; title: string; department: string | null } | null
  owner: { full_name: string | null; department: string | null } | null
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: '임시저장', color: 'text-slate-400 bg-slate-800 border-slate-700',       icon: FileText },
  submitted: { label: '검토중',   color: 'text-yellow-400 bg-yellow-950/50 border-yellow-800', icon: Clock },
  approved:  { label: '승인완료', color: 'text-green-400 bg-green-950/50 border-green-800',    icon: CheckCircle2 },
  rejected:  { label: '반려',     color: 'text-red-400 bg-red-950/50 border-red-800',          icon: XCircle },
}

export default function EvidenceDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate    = useNavigate()

  const [rec,     setRec]     = useState<EvidenceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting,  setActing]  = useState(false)
  const [error,   setError]   = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => { if (id) fetchDetail(id) }, [id])

  async function fetchDetail(recId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('evidence_records')
      .select(`
        *,
        activities(control_code, title, department),
        owner:profiles!evidence_records_owner_id_fkey(full_name, department)
      `)
      .eq('id', recId)
      .maybeSingle()

    if (error) setError(error.message)
    setRec((data ?? null) as EvidenceDetail | null)
    setLoading(false)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  async function handleSubmit() {
    if (!rec || !profile) return
    setActing(true)
    await db.from('evidence_records')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', rec.id)
    await fetchDetail(rec.id)
    setActing(false)
  }

  async function handleApprove() {
    if (!rec || !profile) return
    setActing(true)
    const isAdmin = profile.role === 'admin'
    const newStatus = isAdmin ? 'approved' : 'submitted'
    await db.from('evidence_records')
      .update({
        status: newStatus,
        current_approver_id: isAdmin ? null : undefined,
        decided_at: isAdmin ? new Date().toISOString() : undefined,
      })
      .eq('id', rec.id)

    await db.from('approval_history').insert({
      record_id:   rec.id,
      approver_id: profile.id,
      action:      'approved',
      comment:     comment || null,
    })

    if (newStatus === 'approved') navigate('/evidence')
    else await fetchDetail(rec.id)
    setActing(false)
  }

  async function handleReject() {
    if (!rec || !profile) return
    if (!comment) { setError('반려 사유를 입력해주세요.'); return }
    setActing(true)
    await db.from('evidence_records')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', rec.id)

    await db.from('approval_history').insert({
      record_id:   rec.id,
      approver_id: profile.id,
      action:      'rejected',
      comment:     comment,
    })
    await fetchDetail(rec.id)
    setActing(false)
  }

  async function handleDownload() {
    if (!rec?.file_path) return
    const { data } = await supabase.storage
      .from('evidence')
      .createSignedUrl(rec.file_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="text-brand-500 animate-spin" />
    </div>
  )

  if (!rec) return (
    <div className="text-center py-20">
      <p className="text-slate-400">증빙을 찾을 수 없습니다.</p>
    </div>
  )

  const st = STATUS_INFO[rec.status] ?? STATUS_INFO.draft
  const Icon = st.icon
  const canApprove = profile && rec.status === 'submitted' &&
    (profile.role === 'admin' || profile.role === 'controller')
  const canSubmit = profile && rec.status === 'draft' && rec.owner_id === profile.id

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/evidence')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">증빙 상세</h1>
          <p className="text-slate-400 text-sm mt-0.5">{rec.activities?.title ?? '활동 미지정'}</p>
        </div>
        <span className={clsx('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border', st.color)}>
          <Icon size={13} />
          {st.label}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 정보 카드 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">통제 코드</p>
            <p className="text-white text-sm font-medium">{rec.activities?.control_code ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">부서</p>
            <p className="text-white text-sm">{rec.activities?.department ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">제출자</p>
            <p className="text-white text-sm">{rec.owner?.full_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">제출일시</p>
            <p className="text-white text-sm">
              {rec.submitted_at ? new Date(rec.submitted_at).toLocaleString('ko-KR') : '-'}
            </p>
          </div>
        </div>

        {rec.notes && (
          <div className="px-5 py-4">
            <p className="text-xs text-slate-500 mb-1">비고</p>
            <p className="text-slate-300 text-sm">{rec.notes}</p>
          </div>
        )}

        {/* 파일 */}
        {rec.file_name && (
          <div className="px-5 py-4">
            <p className="text-xs text-slate-500 mb-2">첨부 파일</p>
            <button
              onClick={handleDownload}
              className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2.5 transition-all group w-full"
            >
              <FileText size={18} className="text-brand-400 shrink-0" />
              <span className="text-white text-sm flex-1 text-left truncate">{rec.file_name}</span>
              <Download size={15} className="text-slate-500 group-hover:text-brand-400 transition-colors" />
            </button>
          </div>
        )}
      </div>

      {/* 액션 영역 */}
      {canSubmit && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm text-slate-400 mb-4">임시저장 상태입니다. 결재를 상신하시겠습니까?</p>
          <button
            onClick={handleSubmit}
            disabled={acting}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
          >
            {acting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            결재 상신
          </button>
        </div>
      )}

      {canApprove && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <p className="text-sm font-medium text-white">결재 처리</p>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="의견 또는 반려 사유 입력 (반려 시 필수)"
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-4 py-3 placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={acting}
              className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
            >
              {acting ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
              승인
            </button>
            <button
              onClick={handleReject}
              disabled={acting}
              className="flex items-center gap-2 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
            >
              {acting ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
              반려
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
