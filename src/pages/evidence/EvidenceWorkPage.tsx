import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, X, CheckCircle2, XCircle, Clock,
  Loader2, FileText, Download, AlertCircle, Send,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

interface PopItem {
  id: string
  unique_key: string
  control_code: string
  transaction_id: string | null
  transaction_date: string | null
  description: string | null
  extra_info: string | null
}

interface UploadRow {
  id: string | null        // evidence_uploads.id
  population_item_id: string
  file_path: string | null
  file_name: string | null
  status: 'pending' | 'uploaded'
}

interface Activity {
  id: string; control_code: string; title: string
  department: string | null; unique_key: string | null
  owner_id: string | null; controller_id: string | null
  description: string | null; cycle: string | null
}

interface ApprovalRequest {
  id: string; status: string; submitted_at: string
  owner_comment: string | null; controller_comment: string | null
}

export default function EvidenceWorkPage() {
  const { id: activityId } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [activity,  setActivity]  = useState<Activity | null>(null)
  const [popItems,  setPopItems]  = useState<PopItem[]>([])
  const [uploads,   setUploads]   = useState<Map<string, UploadRow>>(new Map())
  const [request,   setRequest]   = useState<ApprovalRequest | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [msg,       setMsg]       = useState('')
  const [error,     setError]     = useState('')

  // 업로드 모달
  const [modalItem,   setModalItem]   = useState<PopItem | null>(null)
  const [uploadFile,  setUploadFile]  = useState<File | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [isDrag,      setIsDrag]      = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 결재상신 드롭다운
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => { if (profile && activityId) loadAll() }, [profile, activityId])

  async function loadAll() {
    if (!profile || !activityId) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // 1. activity 로드
    const { data: act } = await db.from('activities').select('*').eq('id', activityId).single()
    if (!act) { navigate('/evidence'); return }
    setActivity(act)

    if (!act.unique_key) { setLoading(false); return }

    // 2. 모집단 로드
    const { data: items } = await db
      .from('population_items')
      .select('*')
      .eq('unique_key', act.unique_key)
      .order('transaction_date', { ascending: true })
    setPopItems(items ?? [])

    // 3. 기존 업로드 로드
    if (items?.length) {
      const itemIds = items.map((i: PopItem) => i.id)
      const ownerId = profile.role === 'owner' ? profile.id : (act.owner_id ?? profile.id)
      const { data: ups } = await db
        .from('evidence_uploads')
        .select('*')
        .in('population_item_id', itemIds)
        .eq('owner_id', ownerId)
      const map = new Map<string, UploadRow>()
      for (const u of ups ?? []) map.set(u.population_item_id, u)
      setUploads(map)
    }

    // 4. 결재 요청 상태
    const ownerId = profile.role === 'owner' ? profile.id : (act.owner_id ?? profile.id)
    const { data: reqs } = await db
      .from('approval_requests')
      .select('*')
      .eq('unique_key', act.unique_key)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
    setRequest(reqs?.[0] ?? null)

    setLoading(false)
  }

  // ── 파일 업로드 (Storage) ───────────────────────────────────
  async function handleUpload() {
    if (!uploadFile || !modalItem || !profile) return
    setUploading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const ext = uploadFile.name.split('.').pop()
    // Storage policy: first folder must be auth.uid() (profile.id)
    const path = `${profile.id}/${modalItem.id}_${Date.now()}.${ext}`

    const { error: storErr } = await supabase.storage.from('evidence').upload(path, uploadFile, { upsert: true })
    if (storErr) { setError('파일 업로드 실패: ' + storErr.message); setUploading(false); return }

    // DB에 업로드 기록
    const existing = uploads.get(modalItem.id)
    if (existing?.id) {
      await db.from('evidence_uploads').update({
        file_path: path, file_name: uploadFile.name, status: 'uploaded', uploaded_at: new Date().toISOString()
      }).eq('id', existing.id)
    } else {
      await db.from('evidence_uploads').insert({
        population_item_id: modalItem.id, owner_id: profile.id,
        file_path: path, file_name: uploadFile.name, status: 'uploaded', uploaded_at: new Date().toISOString()
      })
    }

    // 상태 갱신
    setUploads(prev => {
      const next = new Map(prev)
      next.set(modalItem.id, {
        id: existing?.id ?? null, population_item_id: modalItem.id,
        file_path: path, file_name: uploadFile.name, status: 'uploaded'
      })
      return next
    })
    setMsg(`"${uploadFile.name}" 업로드 완료`)
    setUploadFile(null); setModalItem(null); setUploading(false)
  }

  // ── 파일 다운로드 ───────────────────────────────────────────
  async function handleDownload(filePath: string, fileName: string) {
    const { data } = await supabase.storage.from('evidence').createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a'); a.href = data.signedUrl; a.download = fileName; a.click()
    }
  }

  // ── 결재상신 ────────────────────────────────────────────────
  async function handleSubmit(comment: string) {
    if (!activity || !profile) return
    setSubmitting(true); setShowDropdown(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { error } = await db.from('approval_requests').insert({
      unique_key:   activity.unique_key,
      control_code: activity.control_code,
      owner_id:     profile.id,
      controller_id: activity.controller_id ?? null,
      status:       'submitted',
      owner_comment: comment || null,
    })
    if (error) { setError('결재 상신 실패: ' + error.message); setSubmitting(false); return }

    // 이메일 알림 (Edge Function 호출)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      await fetch(`${supabaseUrl}/functions/v1/send-approval-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          activity_title: activity.title,
          control_code:   activity.control_code,
          owner_name:     profile.full_name ?? '',
          controller_id:  activity.controller_id,
        }),
      })
    } catch { /* 이메일 실패해도 결재는 진행 */ }

    setMsg('결재가 상신되었습니다. 통제책임자에게 알림이 발송됩니다.')
    await loadAll()
    setSubmitting(false)
  }

  // ── 승인/반려 (통제책임자) ──────────────────────────────────
  async function handleDecide(approved: boolean) {
    if (!request) return
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('approval_requests').update({
      status: approved ? 'approved' : 'rejected',
      decided_at: new Date().toISOString(),
    }).eq('id', request.id)
    setMsg(approved ? '승인 처리되었습니다.' : '반려 처리되었습니다.')
    await loadAll(); setSaving(false)
  }

  // ── 렌더링 ──────────────────────────────────────────────────
  const isOwner      = profile?.role === 'owner'
  const isController = profile?.role === 'controller' || profile?.role === 'admin'
  const uploadedCount = [...uploads.values()].filter(u => u.status === 'uploaded').length
  const canSubmit    = isOwner && uploadedCount > 0 && (!request || request.status === 'rejected')
  const isPending    = request?.status === 'submitted'
  const isApproved   = request?.status === 'approved'
  const isRejected   = request?.status === 'rejected'

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={28} className="text-brand-500 animate-spin" /></div>
  if (!activity) return null

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/evidence')} className="mt-0.5 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-brand-400 bg-brand-950/50 border border-brand-900 px-2 py-0.5 rounded">
              {activity.control_code}
            </span>
            {isApproved && <span className="flex items-center gap-1 text-xs text-green-400 bg-green-950/50 border border-green-800 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} />승인완료</span>}
            {isPending  && <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-950/50 border border-yellow-800 px-2 py-0.5 rounded-full"><Clock size={11} />결재대기</span>}
            {isRejected && <span className="flex items-center gap-1 text-xs text-red-400 bg-red-950/50 border border-red-800 px-2 py-0.5 rounded-full"><XCircle size={11} />반려</span>}
          </div>
          <h1 className="text-xl font-bold text-white mt-1">{activity.title}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{activity.department ?? ''} {activity.cycle ? `· ${activity.cycle}` : ''}</p>
          {activity.description && <p className="text-slate-500 text-xs mt-1">{activity.description}</p>}
        </div>

        {/* 결재상신 버튼 (담당자) */}
        {canSubmit && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowDropdown(v => !v)}
              disabled={submitting}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              결재상신
              <ChevronDown size={14} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-12 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-10 p-3 space-y-2">
                <p className="text-slate-400 text-xs mb-2">결재 상신하시겠습니까?</p>
                <p className="text-slate-300 text-xs">업로드된 파일 <span className="text-brand-400 font-medium">{uploadedCount}건</span></p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleSubmit('')}
                    className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium py-2 rounded-lg transition-all"
                  >
                    상신
                  </button>
                  <button onClick={() => setShowDropdown(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2 rounded-lg transition-all"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 승인/반려 버튼 (통제책임자) */}
        {isController && isPending && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => handleDecide(true)} disabled={saving}
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}승인
            </button>
            <button onClick={() => handleDecide(false)} disabled={saving}
              className="flex items-center gap-1.5 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all"
            >
              <XCircle size={14} />반려
            </button>
          </div>
        )}
      </div>

      {/* 알림 */}
      {msg && (
        <div className="flex items-center gap-2 bg-green-950/50 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0" /><span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* 모집단 없음 */}
      {popItems.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <FileText size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">모집단 데이터가 없습니다</p>
          <p className="text-slate-600 text-xs mt-1">관리자 → 모집단 업로드 탭에서 모집단.xlsx를 업로드하세요</p>
        </div>
      )}

      {/* 모집단 테이블 */}
      {popItems.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-white text-sm font-medium">증빙 업로드 현황</p>
            <span className="text-slate-400 text-xs">{uploadedCount} / {popItems.length}건 완료</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">거래일</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Transaction ID</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3 hidden md:table-cell">거래설명</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">파일명</th>
                  <th className="text-center text-xs text-slate-500 font-medium px-4 py-3">상태</th>
                  {isOwner && !isApproved && !isPending && (
                    <th className="text-center text-xs text-slate-500 font-medium px-4 py-3">업로드</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {popItems.map(item => {
                  const up = uploads.get(item.id)
                  const done = up?.status === 'uploaded'
                  return (
                    <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                        {item.transaction_date ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">{item.transaction_id ?? '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate hidden md:table-cell">
                        {item.description ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        {done && up?.file_name ? (
                          <button
                            onClick={() => handleDownload(up.file_path!, up.file_name!)}
                            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            <Download size={12} />
                            <span className="truncate max-w-[120px]">{up.file_name}</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} />완료</span>
                        ) : (
                          <span className="text-xs text-slate-600">미업로드</span>
                        )}
                      </td>
                      {isOwner && !isApproved && !isPending && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setModalItem(item); setUploadFile(null) }}
                            className={clsx(
                              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all mx-auto',
                              done
                                ? 'text-slate-400 border-slate-700 hover:border-brand-700 hover:text-brand-400'
                                : 'text-brand-400 border-brand-800 bg-brand-950/30 hover:bg-brand-950/60'
                            )}
                          >
                            <Upload size={12} />
                            {done ? '재업로드' : '업로드'}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 결재 이력 */}
      {request && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-white text-sm font-medium mb-3">결재 이력</p>
          <div className="flex items-center gap-3">
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center',
              request.status === 'approved' ? 'bg-green-900' : request.status === 'rejected' ? 'bg-red-900' : 'bg-yellow-900'
            )}>
              {request.status === 'approved' ? <CheckCircle2 size={16} className="text-green-400" />
               : request.status === 'rejected' ? <XCircle size={16} className="text-red-400" />
               : <Clock size={16} className="text-yellow-400" />}
            </div>
            <div>
              <p className="text-white text-sm">
                {request.status === 'approved' ? '승인 완료' : request.status === 'rejected' ? '반려됨' : '통제책임자 검토 중'}
              </p>
              <p className="text-slate-500 text-xs">
                상신일: {new Date(request.submitted_at).toLocaleDateString('ko-KR')}
                {request.controller_comment && ` · 의견: ${request.controller_comment}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 모달 */}
      {modalItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div>
                <p className="text-white font-medium text-sm">증빙 파일 업로드</p>
                <p className="text-slate-500 text-xs mt-0.5">{modalItem.transaction_id} · {modalItem.transaction_date}</p>
              </div>
              <button onClick={() => setModalItem(null)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 거래 정보 */}
              <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-xs text-slate-400 space-y-1">
                <p><span className="text-slate-500">Transaction ID:</span> {modalItem.transaction_id ?? '-'}</p>
                <p><span className="text-slate-500">거래일:</span> {modalItem.transaction_date ?? '-'}</p>
                <p className="truncate"><span className="text-slate-500">설명:</span> {modalItem.description ?? '-'}</p>
              </div>

              {/* 드롭존 */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
                onDragLeave={() => setIsDrag(false)}
                onDrop={e => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f) }}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                  isDrag ? 'border-brand-500 bg-brand-950/30' : 'border-slate-700 hover:border-slate-600'
                )}
              >
                {uploadFile ? (
                  <div className="flex items-center gap-2 justify-center">
                    <FileText size={18} className="text-brand-400" />
                    <span className="text-white text-sm truncate max-w-[200px]">{uploadFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setUploadFile(null) }} className="text-slate-500 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">파일을 끌어다 놓거나 클릭하여 선택</p>
                  </>
                )}
                <input ref={fileRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f) }} />
              </div>

              {/* 기존 파일 표시 */}
              {uploads.get(modalItem.id)?.status === 'uploaded' && (
                <p className="text-xs text-slate-500 text-center">
                  현재: {uploads.get(modalItem.id)?.file_name} (덮어쓰기됩니다)
                </p>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-lg transition-all"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? '업로드 중...' : '저장'}
              </button>
              <button onClick={() => setModalItem(null)}
                className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
