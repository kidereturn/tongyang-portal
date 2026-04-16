import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X,
  Upload,
  Save,
  Send,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  Download,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Activity {
  id: string
  control_code: string
  owner_name: string | null
  department: string | null
  title: string | null
  description: string | null
  controller_name: string | null
  controller_email: string | null
  controller_id?: string | null
  kpi_score: number | null
  submission_status: string
  unique_key: string | null
  owner_id: string | null
}

interface PopulationItem {
  id: string
  unique_key: string
  transaction_id: string | null
  transaction_date: string | null
  description: string | null
  extra_info: string | null
  extra_info_2?: string | null
  extra_info_3?: string | null
  extra_info_4?: string | null
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
}

interface Props {
  activity: Activity
  onClose: (refresh?: boolean) => void
  viewOnly?: boolean
}

interface StoredUploadRow {
  id: string
  file_name: string
  original_file_name?: string | null
  file_path: string
  file_size: number | null
  uploaded_at: string | null
  population_item_id: string
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function formatFileSize(fileSize?: number) {
  if (!fileSize) return ''
  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`
  }
  return `${Math.round(fileSize / 1024).toLocaleString('ko-KR')}KB`
}

function formatAdditionalValue(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.replace(/,/g, '').trim()
  if (/^-?\d+(\.\d+)?$/.test(normalized)) {
    return Number(normalized).toLocaleString('ko-KR', { maximumFractionDigits: 20 })
  }
  return value
}

function getAdditionalInfoRows(item: PopulationItem) {
  return [
    { label: '추가정보 1', value: formatAdditionalValue(item.extra_info) },
    { label: '추가정보 2', value: formatAdditionalValue(item.extra_info_2) },
    { label: '추가정보 3', value: formatAdditionalValue(item.extra_info_3) },
    { label: '추가정보 4', value: formatAdditionalValue(item.extra_info_4) },
  ].filter(entry => entry.value)
}

export default function EvidenceUploadModal({ activity, onClose, viewOnly = false }: Props) {
  const { profile } = useAuth()
  const [items, setItems] = useState<PopulationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [error, setError] = useState('')
  const [uploadBlocked, setUploadBlocked] = useState(false)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Check upload block setting
  useEffect(() => {
    if (viewOnly) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('site_settings')
          .select('value')
          .eq('key', 'evidence_upload_blocked')
          .maybeSingle()
        if (data?.value?.blocked) setUploadBlocked(true)
      } catch { /* */ }
    })()
  }, [viewOnly])

  useEffect(() => {
    async function load() {
      if (!activity.unique_key) {
        setItems([])
        setLoading(false)
        return
      }

      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { data: popItems } = await db
        .from('population_items')
        .select('*')
        .eq('unique_key', activity.unique_key)
        .order('transaction_date')

      const { data: uploads } = await db
        .from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, file_size, uploaded_at, population_item_id')
        .eq('activity_id', activity.id)

      const uploadMap: Record<string, UploadedFile[]> = {}
      ;((uploads ?? []) as StoredUploadRow[]).forEach(upload => {
        if (!uploadMap[upload.population_item_id]) {
          uploadMap[upload.population_item_id] = []
        }

        uploadMap[upload.population_item_id].push({
          id: upload.id,
          file_name: upload.original_file_name || upload.file_name,
          file_path: upload.file_path,
          file_size: upload.file_size ?? undefined,
          uploaded_at: upload.uploaded_at ?? undefined,
        })
      })

      setItems(
        ((popItems ?? []) as PopulationItem[]).map(item => ({
          ...item,
          uploads: uploadMap[item.id] ?? [],
        }))
      )
      setLoading(false)
    }

    void load()
  }, [activity.id, activity.unique_key])

  const hasAnyUploads = useMemo(
    () => items.some(item => item.uploads.length > 0),
    [items]
  )

  const hasNewFiles = useMemo(
    () => items.some(item => item.uploads.some(upload => upload.isNew)),
    [items]
  )

  function handleFileSelect(itemId: string, files: FileList | null) {
    if (!files || files.length === 0) return
    if (uploadBlocked) {
      setError('현재 관리자에 의해 증빙 업로드가 차단되어 있습니다.')
      return
    }

    setItems(previous =>
      previous.map(item => {
        if (item.id !== itemId) return item

        const newUploads: UploadedFile[] = Array.from(files).map(file => ({
          file_name: file.name,
          file_path: '',
          file_size: file.size,
          isNew: true,
          file,
        }))

        return { ...item, uploads: [...item.uploads, ...newUploads] }
      })
    )
  }

  function removeFile(itemId: string, fileName: string) {
    setItems(previous =>
      previous.map(item => {
        if (item.id !== itemId) return item
        return {
          ...item,
          uploads: item.uploads.filter(upload => !(upload.isNew && upload.file_name === fileName)),
        }
      })
    )
  }

  async function resolveControllerId() {
    if (activity.controller_id) return activity.controller_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    if (activity.controller_email) {
      const { data } = await db
        .from('profiles')
        .select('id')
        .eq('email', activity.controller_email)
        .maybeSingle()

      if (data?.id) return data.id as string
    }

    if (activity.controller_name) {
      const { data } = await db
        .from('profiles')
        .select('id')
        .eq('full_name', activity.controller_name)
        .maybeSingle()

      if (data?.id) return data.id as string
    }

    return null
  }

  async function handleSave() {
    if (!profile?.id) {
      setError('로그인 정보가 확인되지 않아 업로드를 진행할 수 없습니다.')
      return false
    }

    if (!hasNewFiles) {
      setSavedMsg('저장할 새 파일이 없습니다.')
      setTimeout(() => setSavedMsg(''), 2500)
      return true
    }

    setSaving(true)
    setError('')
    setSavedMsg('')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const uploadErrors: string[] = []
    let uploadedCount = 0

    try {
      const nextItems: PopulationItem[] = []

      for (const item of items) {
        const persistedUploads = item.uploads.filter(upload => !upload.isNew)
        const pendingUploads = item.uploads.filter(upload => upload.isNew)
        const completedUploads: UploadedFile[] = []
        const failedUploads: UploadedFile[] = []

        for (const upload of pendingUploads) {
          if (!upload.file) {
            failedUploads.push(upload)
            continue
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const safeName = sanitizeFileName(upload.file.name)
          const storagePath = `${profile.id}/${item.id}/${timestamp}_${safeName}`

          const { error: storageError } = await (supabase.storage as any)
            .from('evidence')
            .upload(storagePath, upload.file, { upsert: false })

          if (storageError) {
            uploadErrors.push(`${upload.file.name}: ${storageError.message}`)
            failedUploads.push(upload)
            continue
          }

          const dbFileName = `${activity.unique_key ?? ''}_${item.transaction_id ?? item.id}_${upload.file.name}`
          const { data: savedUpload, error: insertError } = await db
            .from('evidence_uploads')
            .insert({
              population_item_id: item.id,
              activity_id: activity.id,
              owner_id: profile.id,
              file_path: storagePath,
              file_name: dbFileName,
              original_file_name: upload.file.name,
              file_size: upload.file.size,
              unique_key: activity.unique_key,
              status: 'uploaded',
            })
            .select('id, file_name, original_file_name, file_path, file_size, uploaded_at')
            .single()

          if (insertError) {
            await (supabase.storage as any).from('evidence').remove([storagePath])
            uploadErrors.push(`${upload.file.name}: ${insertError.message}`)
            failedUploads.push(upload)
            continue
          }

          completedUploads.push({
            id: savedUpload.id,
            file_name: savedUpload.original_file_name || savedUpload.file_name,
            file_path: savedUpload.file_path,
            file_size: savedUpload.file_size ?? undefined,
            uploaded_at: savedUpload.uploaded_at ?? undefined,
          })
          uploadedCount += 1
        }

        nextItems.push({
          ...item,
          uploads: [...persistedUploads, ...completedUploads, ...failedUploads],
        })
      }

      setItems(nextItems)

      if (uploadErrors.length > 0) {
        setError(
          uploadErrors.length === 1
            ? `파일 업로드 실패: ${uploadErrors[0]}`
            : `파일 업로드 실패 ${uploadErrors.length}건: ${uploadErrors[0]}`
        )
      }

      if (uploadedCount > 0) {
        setSavedMsg(`${uploadedCount.toLocaleString('ko-KR')}개 파일 업로드 성공`)
        setTimeout(() => setSavedMsg(''), 3000)
      }

      return uploadErrors.length === 0
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '저장 중 오류가 발생했습니다.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!activity.controller_email) {
      setError('승인자 이메일 정보가 없어 결재상신을 진행할 수 없습니다.')
      return
    }

    if (!hasAnyUploads && !hasNewFiles) {
      setError('최소 하나 이상의 파일을 업로드해야 결재상신이 가능합니다.')
      return
    }

    if (!window.confirm('결재상신을 진행하시겠습니까?\n승인자에게 메일이 발송됩니다.')) return

    setSubmitting(true)
    setError('')

    try {
      const saveOk = await handleSave()
      if (!saveOk) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const controllerId = await resolveControllerId()

      const { error: activityError } = await db
        .from('activities')
        .update({
          submission_status: '완료',
          updated_at: new Date().toISOString(),
        })
        .eq('id', activity.id)

      if (activityError) throw activityError

      const { data: existingRequest, error: requestLookupError } = await db
        .from('approval_requests')
        .select('id')
        .eq('activity_id', activity.id)
        .maybeSingle()

      if (requestLookupError) throw requestLookupError

      if (existingRequest?.id) {
        const { error: requestUpdateError } = await db
          .from('approval_requests')
          .update({
            status: 'submitted',
            controller_id: controllerId,
            submitted_at: new Date().toISOString(),
            decided_at: null,
          })
          .eq('id', existingRequest.id)

        if (requestUpdateError) throw requestUpdateError
      } else {
        const { error: requestInsertError } = await db
          .from('approval_requests')
          .insert({
            unique_key: activity.unique_key,
            control_code: activity.control_code,
            activity_id: activity.id,
            owner_id: profile?.id ?? null,
            controller_id: controllerId,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
          })

        if (requestInsertError) throw requestInsertError
      }

      try {
        if (activity.controller_email) {
          await supabase.functions.invoke('send-approval-email', {
            body: {
              type: 'submitted',
              to: activity.controller_email,
              recipientName: activity.controller_name ?? '통제책임자',
              submitterName: activity.owner_name ?? profile?.full_name ?? '',
              controlCode: activity.control_code ?? '',
              activityTitle: activity.title ?? '',
              uniqueKey: activity.unique_key ?? '',
            },
          })
        }
      } catch {
        // Keep the submission successful even if email delivery fails.
      }

      alert('결재상신이 완료되었습니다.')
      onClose(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '결재상신 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-box w-[98vw] sm:w-[96vw] max-w-[1560px] max-h-[94vh]">
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-brand-900">
              {viewOnly ? '증빙 확인' : '증빙 Upload'}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <code className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded">{activity.control_code}</code>
              <span className="text-sm text-warm-600">{activity.department}</span>
              {activity.controller_name && (
                <span className="text-xs text-warm-400">승인자: {activity.controller_name}</span>
              )}
            </div>
            <p className="text-sm text-warm-500 mt-1">{activity.title}</p>
          </div>

          <button
            onClick={() => onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-all ml-4"
          >
            <X size={18} />
          </button>
        </div>

        {activity.description && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-600 font-semibold mb-0.5">제출 증빙에 대한 설명</p>
            <p className="text-sm text-blue-800">{activity.description}</p>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {savedMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-4 py-3">
            <CheckCircle2 size={15} />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-warm-400">
              <AlertCircle size={32} className="mx-auto mb-2 text-warm-200" />
              <p>연결된 모집단 데이터가 없습니다.</p>
              <p className="text-xs mt-1">관리자에게 문의해주세요. (고유키: {activity.unique_key ?? '없음'})</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-brand-700">
                모집단 항목 <span className="text-brand-700">{items.length.toLocaleString('ko-KR')}건</span>
                {!viewOnly && (
                  <span className="text-xs text-warm-400 font-normal ml-2">각 항목별로 증빙 파일을 업로드해주세요</span>
                )}
              </p>

              <div className="overflow-auto border border-warm-200 rounded-lg max-h-[60vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <table className="data-table min-w-[1380px]">
                  <thead>
                    <tr>
                      <th className="text-center w-12">#</th>
                      <th className="min-w-[220px]">Transaction ID</th>
                      <th className="min-w-[130px]">거래일</th>
                      <th className="min-w-[420px]">거래 설명</th>
                      <th className="min-w-[260px]">추가 정보</th>
                      <th className="min-w-[360px]">업로드된 파일</th>
                      {!viewOnly && <th className="text-center min-w-[110px]">업로드</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const additionalRows = getAdditionalInfoRows(item)

                      return (
                        <tr
                          key={item.id}
                          className={clsx(
                            'align-top border-b border-warm-100',
                            index % 2 === 0 ? 'bg-white' : 'bg-warm-50/70'
                          )}
                        >
                          <td className="text-center text-xs text-warm-400 pt-4">{index + 1}</td>
                          <td className="pt-3">
                            <div className="rounded-xl border border-warm-200 bg-white px-3 py-3 text-xs font-mono text-brand-700 break-all whitespace-normal">
                              {item.transaction_id ?? '-'}
                            </div>
                          </td>
                          <td className="pt-3">
                            <div className="rounded-xl border border-warm-200 bg-white px-3 py-3 text-xs text-brand-700 whitespace-nowrap">
                              {item.transaction_date ?? '-'}
                            </div>
                          </td>
                          <td className="pt-3">
                            <div className="rounded-xl border border-warm-200 bg-white px-3 py-3 text-xs text-brand-700 whitespace-normal break-words leading-5">
                              {item.description ?? '-'}
                            </div>
                          </td>
                          <td className="pt-3">
                            <div className="rounded-xl border border-warm-200 bg-white px-3 py-3 min-h-[74px]">
                              {additionalRows.length === 0 ? (
                                <span className="text-xs text-warm-400">-</span>
                              ) : (
                                <div className="space-y-2">
                                  {additionalRows.map(row => (
                                    <div key={row.label} className="rounded-lg bg-warm-50 border border-warm-100 px-2.5 py-2">
                                      <p className="text-[11px] font-semibold text-warm-500">{row.label}</p>
                                      <p className="text-xs font-medium text-brand-800 break-words">{row.value}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="pt-3">
                            <div className="rounded-xl border border-warm-200 bg-white px-3 py-3 min-h-[74px]">
                              {item.uploads.length === 0 ? (
                                <span className="text-xs text-warm-400">파일 없음</span>
                              ) : (
                                <div className="space-y-2">
                                  {item.uploads.map((upload, uploadIndex) => (
                                    <div
                                      key={`${upload.file_name}-${uploadIndex}`}
                                      className={clsx(
                                        'flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border',
                                        upload.isNew
                                          ? 'bg-warm-50 border-brand-100'
                                          : 'bg-warm-50 border-warm-100'
                                      )}
                                    >
                                      <FileText size={12} className={upload.isNew ? 'text-brand-500' : 'text-warm-400'} />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-brand-700 break-all whitespace-normal">{upload.file_name}</p>
                                        {upload.file_size ? (
                                          <p className="text-[11px] text-warm-400 mt-0.5">{formatFileSize(upload.file_size)}</p>
                                        ) : null}
                                      </div>

                                      {upload.isNew && !viewOnly ? (
                                        <button
                                          onClick={() => removeFile(item.id, upload.file_name)}
                                          className="text-warm-400 hover:text-red-500 transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      ) : null}

                                      {!upload.isNew && upload.file_path ? (
                                        <FileDownloadBtn path={upload.file_path} name={upload.file_name} />
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          {!viewOnly && (
                            <td className="text-center pt-3">
                              <input
                                type="file"
                                multiple
                                ref={element => { fileInputRefs.current[item.id] = element }}
                                onChange={event => handleFileSelect(item.id, event.target.files)}
                                className="hidden"
                                accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.gif,.zip"
                              />
                              <button
                                onClick={() => fileInputRefs.current[item.id]?.click()}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-warm-200 text-warm-600 rounded-lg text-xs font-medium hover:border-brand-300 hover:text-brand-700 hover:bg-warm-50 transition-all"
                              >
                                <Upload size={11} />
                                업로드
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
        </div>

        <div className="sticky bottom-0 bg-white border-t border-warm-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => onClose()} className="btn-ghost">
              <X size={15} />
              닫기
            </button>
            <button
              onClick={() => {
                const rows = items.map((item, idx) => ({
                  '번호': idx + 1,
                  'Transaction ID': item.transaction_id ?? '-',
                  '거래일': item.transaction_date ?? '-',
                  '거래설명': item.description ?? '-',
                  '추가정보': item.extra_info ?? '-',
                  '업로드파일수': item.uploads.length,
                  '파일명': item.uploads.map(u => u.file_name).join(', ') || '-',
                }))
                const ws = XLSX.utils.json_to_sheet(rows)
                ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 14 }, { wch: 44 }, { wch: 20 }, { wch: 10 }, { wch: 40 }]
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, '모집단')
                XLSX.writeFile(wb, `모집단_${activity.control_code}_${new Date().toISOString().slice(0, 10)}.xlsx`)
              }}
              className="btn-secondary text-xs"
            >
              <FileSpreadsheet size={14} />
              엑셀 다운로드
            </button>
          </div>

          {!viewOnly && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !hasNewFiles}
                className={clsx('btn-secondary', !hasNewFiles && 'opacity-40 cursor-not-allowed')}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                중간 저장
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || saving || activity.submission_status === '승인'}
                className={clsx('btn-primary', activity.submission_status === '승인' && 'opacity-40 cursor-not-allowed')}
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

function FileDownloadBtn({ path, name }: { path: string; name: string }) {
  async function handleDownload() {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 3600)
    if (!data?.signedUrl) return

    const link = document.createElement('a')
    link.href = data.signedUrl
    link.download = name
    link.click()
  }

  return (
    <button onClick={handleDownload} className="text-warm-400 hover:text-brand-700 transition-colors" title="다운로드">
      <Download size={12} />
    </button>
  )
}
