import { useEffect, useState, useRef } from 'react'
import {
  X, Upload, Save, Send, CheckCircle2, FileText,
  Loader2, AlertCircle, Download, Trash2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

interface Activity {
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
}

interface PopulationItem {
  id: string
  unique_key: string
  transaction_id: string | null   // F열
  transaction_date: string | null // G열
  description: string | null      // H열
  extra_info: string | null       // I열
  extra_info_2: string | null     // J열
  uploads: UploadedFile[]
}

interface UploadedFile {
  id?: string
  file_name: string
  file_path: string
  file_size?: number
  uploaded_at?: string
  isNew?: boolean
  file?: File
  progress?: number
}

interface Props {
  activity: Activity
  onClose: (refresh?: boolean) => void
  viewOnly?: boolean
}

export default function EvidenceUploadModal({ activity, onClose, viewOnly = false }: Props) {
  const { profile } = useAuth()
  const [items,   setItems]   = useState<PopulationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // 모집단 데이터 로드
  useEffect(() => {
    async function load() {
      if (!activity.unique_key) { setLoading(false); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // 1. 모집단 행 조회 (고유키 매칭)
      const { data: popItems } = await db
        .from('population_items')
        .select('*')
        .eq('unique_key', activity.unique_key)
        .order('transaction_date')

      // 2. 이미 업로드된 파일 조회
      const { data: uploads } = await db
        .from('evidence_uploads')
        .select('*')
        .eq('activity_id', activity.id)

      const uploadMap: Record<string, UploadedFile[]> = {}
      ;(uploads ?? []).forEach((u: { population_item_id: string; file_name: string; file_path: string; file_size: number; uploaded_at: string; id: string }) => {
        if (!uploadMap[u.population_item_id]) uploadMap[u.population_item_id] = []
        uploadMap[u.population_item_id].push({
          id: u.id,
          file_name: u.file_name,
          file_path: u.file_path,
          file_size: u.file_size,
          uploaded_at: u.uploaded_at,
        })
      })

      setItems((popItems ?? []).map((p: PopulationItem) => ({
        ...p,
        uploads: uploadMap[p.id] ?? [],
      })))
      setLoading(false)
    }
    load()
  }, [activity])

  // 파일 선택
  function handleFileSelect(itemId: string, files: FileList | null) {
    if (!files || files.length === 0) return
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const newFiles: UploadedFile[] = Array.from(files).map(f => ({
        file_name: f.name,
        file_path: '',
        file_size: f.size,
        isNew: true,
        file: f,
        progress: 0,
      }))
      return { ...item, uploads: [...item.uploads, ...newFiles] }
    }))
  }

  // 파일 제거 (새 파일만 제거, 기존 파일은 저장 시 반영)
  function removeFile(itemId: string, fileName: string) {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      return { ...item, uploads: item.uploads.filter(u => !(u.isNew && u.file_name === fileName)) }
    }))
  }

  // 저장 (파일 업로드 + DB 저장)
  async function handleSave() {
    setSaving(true); setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      for (const item of items) {
        const newUploads = item.uploads.filter(u => u.isNew && u.file)
        for (const upload of newUploads) {
          if (!upload.file) continue

          // 파일명: {고유키}_{F열}_{날짜}_{원본파일명}
          const date = new Date().toISOString().slice(0, 10)
          const safeName = upload.file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')
          const storagePath = `${profile!.id}/${item.id}_${date}_${safeName}`

          // Supabase Storage 업로드
          const { error: upErr } = await (supabase.storage as any)
            .from('evidence')
            .upload(storagePath, upload.file, { upsert: true })

          if (upErr) { setError(`파일 업로드 실패: ${upload.file_name}`); continue }

          // DB 저장 (고유키+F열+업로드일자 형식의 파일명)
          const dbFileName = `${activity.unique_key ?? ''}_${item.transaction_id ?? item.id}_${date}_${upload.file.name}`
          await db.from('evidence_uploads').insert({
            population_item_id: item.id,
            activity_id: activity.id,
            owner_id: profile!.id,
            file_path: storagePath,
            file_name: dbFileName,
            original_file_name: upload.file.name,
            file_size: upload.file.size,
            unique_key: activity.unique_key,
            status: 'uploaded',
          })
        }
      }

      // isNew 플래그 제거 (저장 완료된 것으로 처리)
      setItems(prev => prev.map(item => ({
        ...item,
        uploads: item.uploads.map(u => u.isNew ? { ...u, isNew: false } : u)
      })))

      setSavedMsg('저장되었습니다!')
      setTimeout(() => setSavedMsg(''), 3000)
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    }
    setSaving(false)
  }

  // 결재상신
  async function handleSubmit() {
    if (!activity.controller_email) {
      setError('승인자 이메일 정보가 없습니다. 관리자에게 문의하세요.')
      return
    }
    const hasUploads = items.some(item => item.uploads.length > 0)
    if (!hasUploads) {
      setError('최소 하나 이상의 파일을 업로드해야 결재상신이 가능합니다.')
      return
    }

    if (!confirm('결재상신을 진행하시겠습니까?\n승인자에게 이메일이 발송됩니다.')) return

    setSubmitting(true); setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 1. 저장 먼저
      await handleSave()

      // 2. activities 상신여부 = '완료' 업데이트
      await db.from('activities')
        .update({ submission_status: '완료', updated_at: new Date().toISOString() })
        .eq('id', activity.id)

      // 3. approval_requests 생성 또는 업데이트
      const existingReq = await db
        .from('approval_requests')
        .select('id')
        .eq('activity_id', activity.id)
        .single()

      if (existingReq.data) {
        await db.from('approval_requests')
          .update({ status: 'submitted', submitted_at: new Date().toISOString(), decided_at: null })
          .eq('id', existingReq.data.id)
      } else {
        await db.from('approval_requests').insert({
          unique_key: activity.unique_key,
          control_code: activity.control_code,
          activity_id: activity.id,
          owner_id: profile!.id,
          controller_id: null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
      }

      // 4. 이메일 발송 (Edge Function 호출)
      try {
        await supabase.functions.invoke('send-approval-email', {
          body: {
            type: 'submitted',
            to: activity.controller_email,
            ownerName: activity.owner_name ?? profile?.full_name ?? '',
            controlCode: activity.control_code,
            activityTitle: activity.title ?? '',
            department: activity.department ?? '',
            portalUrl: window.location.origin,
          }
        })
      } catch { /* 이메일 발송 실패해도 계속 */ }

      alert('결재상신이 완료되었습니다!\n승인자에게 이메일이 발송되었습니다.')
      onClose(true)
    } catch {
      setError('결재상신 중 오류가 발생했습니다.')
    }
    setSubmitting(false)
  }

  const hasNewFiles = items.some(item => item.uploads.some(u => u.isNew))

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box max-w-4xl">
        {/* 모달 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-gray-900">
              {viewOnly ? '증빙 확인' : '증빙 Upload'}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{activity.control_code}</code>
              <span className="text-sm text-gray-600">{activity.department}</span>
              {activity.controller_name && (
                <span className="text-xs text-gray-400">승인자: {activity.controller_name}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">{activity.title}</p>
          </div>
          <button onClick={() => onClose()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all ml-4">
            <X size={18} />
          </button>
        </div>

        {/* 제출 증빙 설명 */}
        {activity.description && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-600 font-semibold mb-0.5">📋 제출 증빙에 대한 설명</p>
            <p className="text-sm text-blue-800">{activity.description}</p>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* 저장 완료 메시지 */}
        {savedMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-4 py-3">
            <CheckCircle2 size={15} />
            <span>{savedMsg}</span>
          </div>
        )}

        {/* 모집단 테이블 */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle size={32} className="mx-auto mb-2 text-gray-200" />
              <p>연결된 모집단 데이터가 없습니다</p>
              <p className="text-xs mt-1">관리자에게 문의하세요 (고유키: {activity.unique_key ?? '없음'})</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700">
                모집단 항목 <span className="text-brand-600">{items.length}건</span>
                {!viewOnly && (
                  <span className="text-xs text-gray-400 font-normal ml-2">각 항목별로 증빙 파일을 업로드하세요</span>
                )}
              </p>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="text-center w-10">#</th>
                      <th>Transaction ID</th>
                      <th>거래일</th>
                      <th className="min-w-[200px]">거래 설명</th>
                      <th>추가 정보</th>
                      <th className="min-w-[200px]">업로드된 파일</th>
                      {!viewOnly && <th className="text-center min-w-[100px]">업로드</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id} className="align-top">
                        <td className="text-center text-xs text-gray-400 pt-3">{idx + 1}</td>
                        <td className="text-xs font-mono text-gray-600 pt-3">
                          {item.transaction_id ? String(item.transaction_id).slice(0, 10) : '-'}
                        </td>
                        <td className="text-xs text-gray-600 pt-3">
                          {item.transaction_date ? String(item.transaction_date).slice(0, 10) : '-'}
                        </td>
                        <td className="text-xs text-gray-700 pt-3" title={item.description ?? ''}>
                          {item.description && item.description.length > 40
                            ? item.description.slice(0, 40) + '…'
                            : item.description ?? '-'}
                        </td>
                        <td className="text-xs text-gray-500 pt-3">
                          {item.extra_info ? (
                            <span title={item.extra_info}>
                              {item.extra_info.length > 20 ? item.extra_info.slice(0, 20) + '…' : item.extra_info}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="pt-2">
                          {item.uploads.length === 0 ? (
                            <span className="text-xs text-gray-400">파일 없음</span>
                          ) : (
                            <div className="space-y-1">
                              {item.uploads.map((f, fi) => (
                                <div key={fi} className={clsx(
                                  'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                                  f.isNew ? 'bg-brand-50 border border-brand-100' : 'bg-gray-50'
                                )}>
                                  <FileText size={11} className={f.isNew ? 'text-brand-500' : 'text-gray-400'} />
                                  <span className="truncate max-w-[140px] text-gray-700" title={f.file_name}>
                                    {f.file_name}
                                  </span>
                                  {f.file_size && (
                                    <span className="text-gray-400 shrink-0">
                                      {(f.file_size / 1024).toFixed(0)}KB
                                    </span>
                                  )}
                                  {f.isNew && !viewOnly && (
                                    <button
                                      onClick={() => removeFile(item.id, f.file_name)}
                                      className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                  {!f.isNew && f.file_path && (
                                    <FileDownloadBtn path={f.file_path} name={f.file_name} />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        {!viewOnly && (
                          <td className="text-center pt-2">
                            <input
                              type="file"
                              multiple
                              ref={el => { fileInputRefs.current[item.id] = el }}
                              onChange={e => handleFileSelect(item.id, e.target.files)}
                              className="hidden"
                              accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.gif,.zip"
                            />
                            <button
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                            >
                              <Upload size={11} />
                              업로드
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          <button onClick={() => onClose()} className="btn-ghost">
            <X size={15} />닫기
          </button>

          {!viewOnly && (
            <div className="flex items-center gap-3">
              {/* 저장 버튼 */}
              <button
                onClick={handleSave}
                disabled={saving || !hasNewFiles}
                className={clsx(
                  'btn-secondary',
                  (!hasNewFiles) && 'opacity-40 cursor-not-allowed'
                )}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                중간 저장
              </button>

              {/* 결재상신 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={submitting || saving || activity.submission_status === '승인'}
                className={clsx(
                  'btn-primary',
                  (activity.submission_status === '승인') && 'opacity-40 cursor-not-allowed'
                )}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                결재상신
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 파일 다운로드 버튼
function FileDownloadBtn({ path, name }: { path: string; name: string }) {
  async function handleDownload() {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 60)
    if (data?.signedUrl) {
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = name
      a.click()
    }
  }
  return (
    <button onClick={handleDownload} className="ml-auto text-gray-400 hover:text-brand-600 transition-colors" title="다운로드">
      <Download size={11} />
    </button>
  )
}
