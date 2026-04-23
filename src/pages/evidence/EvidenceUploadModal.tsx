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
  RefreshCw,
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
  unique_key_2: string | null
  transaction_id: string | null
  transaction_date: string | null
  description: string | null
  evidence_name?: string | null
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
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null)
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
        .order('unique_key_2', { ascending: true, nullsFirst: false })

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

    const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
    const ALLOWED_EXT = /\.(pdf|xlsx|xls)$/i

    const validFiles: File[] = []
    const rejectedByType: string[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_EXT.test(file.name)) {
        rejectedByType.push(file.name)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`파일 크기는 100MB를 초과할 수 없습니다: ${file.name}`)
        continue
      }
      validFiles.push(file)
    }
    if (rejectedByType.length > 0) {
      alert(`PDF 및 엑셀(.xlsx, .xls) 파일만 업로드 가능합니다.\n제외된 파일: ${rejectedByType.join(', ')}`)
    }

    if (validFiles.length === 0) return

    setItems(previous =>
      previous.map(item => {
        if (item.id !== itemId) return item

        // 각 pending upload 에 고유 local id 부여 — 동명 파일 삭제 오류 방지
        const newUploads: UploadedFile[] = validFiles.map(file => ({
          id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          file_name: file.name,
          file_path: '',
          file_size: file.size,
          isNew: true,
          file,
        }))

        return { ...item, uploads: [...item.uploads, ...newUploads] }
      })
    )

    // 파일 선택 후 자동저장은 race condition 위험 — 사용자가 '중간 저장' 클릭 시에만 저장
  }

  function handleDragOver(event: React.DragEvent, itemId: string) {
    event.preventDefault()
    event.stopPropagation()
    if (viewOnly || uploadBlocked) return
    setDragOverItemId(itemId)
  }

  function handleDragLeave(event: React.DragEvent, itemId: string) {
    event.preventDefault()
    event.stopPropagation()
    if (dragOverItemId === itemId) setDragOverItemId(null)
  }

  function handleDrop(event: React.DragEvent, itemId: string) {
    event.preventDefault()
    event.stopPropagation()
    setDragOverItemId(null)
    if (viewOnly) return
    const droppedFiles = event.dataTransfer?.files
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(itemId, droppedFiles)
    }
  }

  function removeFile(itemId: string, localId: string) {
    setItems(previous =>
      previous.map(item => {
        if (item.id !== itemId) return item
        return {
          ...item,
          uploads: item.uploads.filter(upload => upload.id !== localId),
        }
      })
    )
  }

  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function reloadItems() {
    if (!activity.unique_key) return
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
  }

  async function handleDeletePersisted(uploadId: string, filePath: string) {
    // 결재상신이 완료(활동 상태 '완료' 이상)면 삭제 불가 — 사용자 요청
    const locked = activity.submission_status === '완료' || activity.submission_status === '승인'
    if (locked) {
      setError('결재상신이 완료된 증빙은 삭제할 수 없습니다. 관리자에게 취소를 요청하세요.')
      setTimeout(() => setError(''), 4000)
      return
    }
    if (!window.confirm('이 증빙 파일을 삭제하시겠습니까?')) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      // 1) DB 레코드 먼저 삭제 (RLS/권한 문제로 인한 실패 조기 감지)
      const { error: deleteError } = await db
        .from('evidence_uploads')
        .delete()
        .eq('id', uploadId)
      if (deleteError) throw deleteError

      // 2) Storage 파일 삭제 (실패해도 DB 삭제는 이미 반영됨 — 고아 파일만 남음)
      try {
        await (supabase.storage as any).from('evidence').remove([filePath])
      } catch { /* storage cleanup 실패 무시 */ }

      await reloadItems()
      setSavedMsg('파일이 삭제되었습니다.')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.')
    }
  }

  async function handleReplacePersisted(uploadId: string, oldFilePath: string, populationItemId: string, newFile: File) {
    if (!profile?.id) {
      setError('로그인 정보가 확인되지 않아 교체를 진행할 수 없습니다.')
      return
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeName = sanitizeFileName(newFile.name)
      const storagePath = `${profile.id}/${populationItemId}/${timestamp}_${safeName}`

      const { error: storageError } = await (supabase.storage as any)
        .from('evidence')
        .upload(storagePath, newFile, { upsert: false })

      if (storageError) throw storageError

      const dbFileName = `${activity.unique_key ?? ''}_${populationItemId}_${newFile.name}`
      const { error: updateError } = await db
        .from('evidence_uploads')
        .update({
          file_path: storagePath,
          file_name: dbFileName,
          original_file_name: newFile.name,
          file_size: newFile.size,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', uploadId)

      if (updateError) {
        await (supabase.storage as any).from('evidence').remove([storagePath])
        throw updateError
      }

      await (supabase.storage as any).from('evidence').remove([oldFilePath])

      await reloadItems()
      setSavedMsg('파일이 교체되었습니다.')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 교체 중 오류가 발생했습니다.')
    }
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

    const incompleteItems = items.filter(item => item.uploads.length === 0)
    if (incompleteItems.length > 0) {
      alert(
        `모든 증빙이 업로드되지 않았습니다.\n미완료 항목: ${incompleteItems.length}건\n\n모든 증빙을 업로드한 후 결재상신해주세요.`
      )
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

  // Upload progress — % of population items with at least 1 file
  const uploadedCount = items.filter(it => it.uploads.length > 0).length
  const totalPopulation = items.length || 1
  const uploadProgress = Math.round((uploadedCount / totalPopulation) * 100)
  const allUploaded = uploadedCount === items.length && items.length > 0

  return (
    <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      {/* modal-box 는 뷰포트 내에 맞춤 · 내부 스크롤 — 뷰포트 좁아져도 창 전체 스크롤 생기지 않도록 */}
      <div className="modal-box max-w-[1560px] max-h-[94vh]" style={{ width: 'min(96vw, 1560px)', overflow: 'auto' }}>
        <div style={{ minWidth: 1200 }}>
        <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-brand-900">
              {viewOnly ? '증빙 확인' : '증빙 Upload'}
            </h2>
            <div className="flex flex-wrap gap-2 mt-1.5 items-center">
              <code className="text-sm bg-warm-100 text-brand-900 px-2 py-0.5 rounded font-bold font-mono">{activity.control_code}</code>
              <span className="text-sm text-brand-900 font-bold">{activity.department}</span>
              {activity.controller_name && (
                <span className="text-xs text-warm-500 font-semibold">승인자: <span className="text-brand-900">{activity.controller_name}</span></span>
              )}
            </div>
            <p className="text-sm text-brand-900 font-bold mt-1">{activity.title}</p>
          </div>

          <button
            onClick={() => onClose()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-all ml-4"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload progress bar — always visible at top, shown stronger while submitting/saving */}
        {!viewOnly && (
          <div className="px-6 py-3 bg-white border-b border-warm-100">
            <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
              <span className="text-brand-900">증빙 업로드 진행률 · {uploadedCount}/{items.length}건</span>
              <span className={allUploaded ? 'text-emerald-600' : 'text-brand-700'}>
                {submitting ? '결재상신 처리 중…' : saving ? '저장 중…' : `${uploadProgress}%`}
              </span>
            </div>
            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${allUploaded ? 'bg-emerald-500' : (submitting || saving) ? 'bg-brand-500 animate-pulse' : 'bg-brand-500'}`}
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {!allUploaded && !viewOnly && (
              <p className="text-xs text-amber-700 font-semibold mt-1.5">※ 결재상신은 모든 항목이 업로드된 후에만 가능합니다 (중간저장은 언제든 가능).</p>
            )}
          </div>
        )}

        {activity.description && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-700 font-bold mb-0.5">제출 증빙에 대한 설명</p>
            <p className="text-sm text-blue-900 font-semibold">{activity.description}</p>
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

              <div className="overflow-y-auto overflow-x-hidden border border-warm-200 rounded-lg max-h-[62vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <table className="w-full table-fixed text-left border-collapse compact-evidence-table">
                  <colgroup>
                    <col style={{ width: '36px' }} />
                    <col style={{ width: '130px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '90px' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '22%' }} />
                    {!viewOnly && <col style={{ width: '86px' }} />}
                  </colgroup>
                  <thead className="bg-warm-50">
                    <tr className="border-b border-warm-200">
                      <th className="text-center px-1.5 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">#</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">고유키2</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">거래일</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">거래 설명</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">추가 정보</th>
                      <th className="px-2 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">업로드된 파일</th>
                      {!viewOnly && <th className="text-center px-1.5 py-2 text-[11px] font-medium text-warm-500 uppercase tracking-wider">업로드</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const additionalRows = getAdditionalInfoRows(item)
                      const isDraggingOver = dragOverItemId === item.id

                      return (
                        <tr
                          key={item.id}
                          onDragOver={event => handleDragOver(event, item.id)}
                          onDragLeave={event => handleDragLeave(event, item.id)}
                          onDrop={event => handleDrop(event, item.id)}
                          className={clsx(
                            'align-top border-b border-warm-100 transition-colors',
                            isDraggingOver
                              ? 'bg-brand-50 ring-2 ring-brand-400 ring-inset'
                              : index % 2 === 0
                                ? 'bg-white'
                                : 'bg-warm-50/70'
                          )}
                        >
                          <td className="text-center text-[11px] text-warm-400 align-top pt-3 px-1">{index + 1}</td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-brand-100 bg-brand-50/40 px-2 py-2 text-[11px] font-mono text-brand-800 break-all whitespace-normal font-semibold">
                              {item.unique_key_2 ?? '-'}
                            </div>
                          </td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-warm-200 bg-white px-2 py-2 text-[11px] font-mono text-brand-700 break-all whitespace-normal">
                              {item.transaction_id ?? '-'}
                            </div>
                          </td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-warm-200 bg-white px-2 py-2 text-[11px] text-brand-700 whitespace-nowrap">
                              {item.transaction_date ?? '-'}
                            </div>
                          </td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-warm-200 bg-white px-2 py-2 text-[11px] text-brand-700 whitespace-normal break-words leading-5">
                              {item.description ?? '-'}
                            </div>
                          </td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-warm-200 bg-white px-2 py-2 min-h-[64px]">
                              {additionalRows.length === 0 ? (
                                <span className="text-[11px] text-warm-400">-</span>
                              ) : (
                                <div className="space-y-1.5">
                                  {additionalRows.map(row => (
                                    <div key={row.label} className="rounded-md bg-warm-50 border border-warm-100 px-1.5 py-1">
                                      <p className="text-[10px] font-semibold text-warm-500">{row.label}</p>
                                      <p className="text-[11px] font-medium text-brand-800 break-words">{row.value}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="align-top py-2 px-1.5">
                            <div className="rounded-lg border border-warm-200 bg-white px-2 py-2 min-h-[64px]">
                              {item.uploads.length === 0 ? (
                                <div className="text-[11px] text-warm-400">
                                  {!viewOnly && isDraggingOver ? (
                                    <span className="text-brand-600 font-medium">여기에 파일을 놓으세요</span>
                                  ) : (
                                    <>
                                      <div>파일 없음</div>
                                      {!viewOnly && (
                                        <div className="text-[10px] text-warm-300 mt-1 leading-tight">
                                          업로드 시 <span className="text-brand-500">다운로드·교체·삭제</span> 버튼 표시
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {item.uploads.map((upload, uploadIndex) => (
                                    <div
                                      key={`${upload.file_name}-${uploadIndex}`}
                                      className={clsx(
                                        'px-2 py-1.5 rounded-md text-[11px] border',
                                        upload.isNew
                                          ? 'bg-warm-50 border-brand-100'
                                          : 'bg-warm-50 border-warm-100'
                                      )}
                                    >
                                      <div className="flex items-start gap-1.5">
                                        <FileText size={12} className={clsx('mt-0.5 shrink-0', upload.isNew ? 'text-brand-500' : 'text-warm-400')} />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-brand-700 break-all whitespace-normal leading-tight">{upload.file_name}</p>
                                          {upload.file_size ? (
                                            <p className="text-[10px] text-warm-400 mt-0.5">{formatFileSize(upload.file_size)}</p>
                                          ) : null}
                                        </div>
                                      </div>

                                      {upload.isNew && !viewOnly ? (
                                        <div className="mt-1.5 flex">
                                          <button
                                            onClick={() => removeFile(item.id, upload.id ?? '')}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors"
                                            title="제거"
                                          >
                                            <Trash2 size={12} />
                                            <span>제거</span>
                                          </button>
                                        </div>
                                      ) : null}

                                      {!upload.isNew && upload.file_path ? (
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                          <FileDownloadBtn path={upload.file_path} name={upload.file_name} />
                                          {!viewOnly && upload.id && (
                                            <>
                                              <input
                                                type="file"
                                                ref={el => { replaceInputRefs.current[upload.id!] = el }}
                                                onChange={e => {
                                                  const file = e.target.files?.[0]
                                                  if (file) handleReplacePersisted(upload.id!, upload.file_path, item.id, file)
                                                  e.target.value = ''
                                                }}
                                                className="hidden"
                                                accept=".pdf,.xlsx,.xls"
                                              />
                                              <button
                                                onClick={() => replaceInputRefs.current[upload.id!]?.click()}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100 hover:border-brand-200 transition-colors"
                                                title="교체"
                                              >
                                                <RefreshCw size={12} />
                                                <span>교체</span>
                                              </button>
                                              <button
                                                onClick={() => handleDeletePersisted(upload.id!, upload.file_path)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors"
                                                title="삭제"
                                              >
                                                <Trash2 size={12} />
                                                <span>삭제</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          {!viewOnly && (
                            <td className="text-center align-top py-2 px-1">
                              <input
                                type="file"
                                multiple
                                ref={element => { fileInputRefs.current[item.id] = element }}
                                onChange={event => handleFileSelect(item.id, event.target.files)}
                                className="hidden"
                                accept=".pdf,.xlsx,.xls"
                              />
                              <button
                                onClick={() => fileInputRefs.current[item.id]?.click()}
                                className={clsx(
                                  'inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium border transition-all',
                                  isDraggingOver
                                    ? 'bg-brand-600 border-brand-600 text-white'
                                    : 'bg-white border-warm-200 text-warm-600 hover:border-brand-300 hover:text-brand-700 hover:bg-warm-50'
                                )}
                              >
                                <Upload size={11} />
                                {isDraggingOver ? '놓기' : '업로드'}
                              </button>
                              <p className="text-[9px] text-warm-400 mt-0.5 leading-tight">드래그<br/>가능</p>
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
                  '고유키2': item.unique_key_2 ?? '-',
                  'Transaction ID': item.transaction_id ?? '-',
                  '거래일': item.transaction_date ?? '-',
                  '거래설명': item.description ?? '-',
                  '추가정보': item.extra_info ?? '-',
                  '업로드파일수': item.uploads.length,
                  '파일명': item.uploads.map(u => u.file_name).join(', ') || '-',
                }))
                const ws = XLSX.utils.json_to_sheet(rows)
                ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 44 }, { wch: 20 }, { wch: 10 }, { wch: 40 }]
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
                onClick={async () => {
                  const ok = await handleSave()
                  if (ok) window.alert('중간 저장이 완료되었습니다.')
                }}
                disabled={saving || !hasNewFiles}
                className={clsx('btn-secondary', !hasNewFiles && 'opacity-40 cursor-not-allowed')}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                중간 저장
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || saving || activity.submission_status === '승인' || !allUploaded}
                className={clsx('btn-primary', (activity.submission_status === '승인' || !allUploaded) && 'opacity-40 cursor-not-allowed')}
                title={!allUploaded ? '모든 증빙이 업로드되어야 결재상신이 가능합니다' : undefined}
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                결재상신 {!allUploaded && <span className="text-[10px] opacity-80">({uploadedCount}/{items.length})</span>}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

function FileDownloadBtn({ path, name: _name }: { path: string; name: string }) {
  async function handleDownload() {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 3600)
    if (!data?.signedUrl) return

    window.open(data.signedUrl, '_blank')
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-brand-700 bg-warm-50 border border-warm-200 hover:bg-warm-100 hover:border-warm-300 transition-colors"
      title="다운로드"
    >
      <Download size={12} />
      <span>다운로드</span>
    </button>
  )
}
