import { useEffect, useState } from 'react'
import { Download, Loader2, Search, Package, Filter, CheckCircle2, Clock, AlertCircle, FileCheck2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { type FileRow } from '../adminShared'
import clsx from 'clsx'
import JSZip from 'jszip'

type ApprovalInfo = {
  activity_id: string
  status: string
}

const STATUS_OPTIONS = [
  { key: 'all',      label: '전체',     icon: FileCheck2, color: 'text-warm-600' },
  { key: 'approved', label: '승인완료', icon: CheckCircle2, color: 'text-emerald-600' },
  { key: 'submitted', label: '승인대기', icon: Clock, color: 'text-amber-600' },
  { key: 'rejected', label: '반려',     icon: AlertCircle, color: 'text-red-600' },
  { key: 'none',     label: '미상신',   icon: FileCheck2, color: 'text-warm-400' },
] as const

export default function FilesTab() {
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [approvalMap, setApprovalMap] = useState<Record<string, string>>({})
  const [activityKeyMap, setActivityKeyMap] = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState('')

  useEffect(() => {
    async function load() {
      const db = supabase as any
      // Load files
      const { data: filesData } = await db
        .from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, unique_key, uploaded_at, activity_id, owner:owner_id(full_name)')
        .order('uploaded_at', { ascending: false })
        .limit(1000)
      const rows: (FileRow & { activity_id?: string })[] = filesData ?? []
      setFiles(rows)

      // Build activity -> unique_key map from files
      const keyMap: Record<string, string> = {}
      for (const f of rows) {
        if (f.activity_id && f.unique_key) keyMap[f.activity_id] = f.unique_key
      }

      // Also load activity unique_keys for files without them
      const activityIds = [...new Set(rows.filter(f => f.activity_id).map(f => (f as any).activity_id))]
      if (activityIds.length > 0) {
        const { data: activities } = await db
          .from('activities')
          .select('id, unique_key, control_code')
          .in('id', activityIds)
        for (const a of activities ?? []) {
          keyMap[a.id] = a.unique_key ?? a.control_code ?? ''
        }

        // Load approval statuses
        const { data: approvals } = await db
          .from('approval_requests')
          .select('activity_id, status')
          .in('activity_id', activityIds)
        const aMap: Record<string, string> = {}
        for (const a of (approvals ?? []) as ApprovalInfo[]) {
          aMap[a.activity_id] = a.status
        }
        setApprovalMap(aMap)
      }
      setActivityKeyMap(keyMap)
      setLoading(false)
    }
    load()
  }, [])

  async function downloadFile(path: string, name: string) {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 3600)
    if (!data?.signedUrl) return
    const anchor = document.createElement('a')
    anchor.href = data.signedUrl
    anchor.download = name
    anchor.click()
  }

  function getFileUniqueKey(file: FileRow): string {
    if (file.unique_key) return file.unique_key
    const actId = (file as any).activity_id
    if (actId && activityKeyMap[actId]) return activityKeyMap[actId]
    return ''
  }

  function getFileApprovalStatus(file: FileRow): string {
    const actId = (file as any).activity_id
    if (!actId) return 'none'
    return approvalMap[actId] ?? 'none'
  }

  function buildDownloadName(file: FileRow): string {
    const uk = getFileUniqueKey(file)
    const originalName = file.original_file_name ?? file.file_name
    if (uk) return `${uk}_${originalName}`
    return originalName
  }

  const filtered = files.filter(file => {
    // Status filter
    if (statusFilter !== 'all') {
      const approvalStatus = getFileApprovalStatus(file)
      if (statusFilter !== approvalStatus) return false
    }
    // Text search
    if (!search) return true
    return [
      file.original_file_name ?? file.file_name,
      file.file_name,
      file.unique_key ?? '',
      file.owner?.full_name ?? '',
      getFileUniqueKey(file),
    ].some(value => value.toLowerCase().includes(search.toLowerCase()))
  })

  async function handleBulkDownload() {
    if (filtered.length === 0) return
    setDownloading(true)
    setDownloadProgress(`0/${filtered.length} 파일 준비 중...`)

    try {
      const zip = new JSZip()
      const nameCount: Record<string, number> = {}
      let completed = 0

      // Download files in batches of 5
      const batchSize = 5
      for (let i = 0; i < filtered.length; i += batchSize) {
        const batch = filtered.slice(i, i + batchSize)
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(file.file_path, 3600)
            if (!data?.signedUrl) throw new Error('URL 생성 실패')
            const response = await fetch(data.signedUrl)
            if (!response.ok) throw new Error(`다운로드 실패: ${response.status}`)
            const blob = await response.blob()

            // Build filename with UNIQUE KEY prefix
            let downloadName = buildDownloadName(file)
            // Handle duplicates
            if (nameCount[downloadName]) {
              nameCount[downloadName]++
              const ext = downloadName.lastIndexOf('.')
              if (ext > 0) {
                downloadName = `${downloadName.slice(0, ext)}_(${nameCount[downloadName]})${downloadName.slice(ext)}`
              } else {
                downloadName = `${downloadName}_(${nameCount[downloadName]})`
              }
            } else {
              nameCount[downloadName] = 1
            }

            zip.file(downloadName, blob)
          })
        )

        completed += results.filter(r => r.status === 'fulfilled').length
        setDownloadProgress(`${completed}/${filtered.length} 파일 완료`)
      }

      setDownloadProgress('ZIP 파일 생성 중...')
      const content = await zip.generateAsync({ type: 'blob' })

      // Trigger download
      const statusLabel = statusFilter === 'all' ? '전체' :
        STATUS_OPTIONS.find(s => s.key === statusFilter)?.label ?? statusFilter
      const dateStr = new Date().toISOString().slice(0, 10)
      const fileName = `증빙파일_${statusLabel}_${dateStr}.zip`

      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Bulk download error:', err)
      alert('일괄 다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
      setDownloadProgress('')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search + filter + bulk download */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="파일명, 고유키, 업로드 사용자 검색..."
            className="form-input pl-9 text-sm"
          />
        </div>
        <button
          onClick={handleBulkDownload}
          disabled={downloading || filtered.length === 0}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all',
            downloading || filtered.length === 0
              ? 'bg-warm-100 text-warm-400 cursor-not-allowed'
              : 'bg-brand-800 text-white hover:bg-brand-900 shadow-sm'
          )}
        >
          {downloading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Package size={15} />
          )}
          {downloading ? downloadProgress : `일괄 다운로드 (${filtered.length}건)`}
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter size={14} className="text-warm-400 mr-1" />
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={clsx(
              'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
              statusFilter === s.key
                ? 'bg-brand-800 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            )}
          >
            <s.icon size={12} />
            {s.label}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-warm-50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-warm-500">
            총 <b className="text-brand-700">{filtered.length}</b>개 파일
            {statusFilter !== 'all' && ` (${STATUS_OPTIONS.find(s => s.key === statusFilter)?.label} 필터)`}
          </span>
          {downloading && (
            <span className="text-xs text-brand-700 font-semibold animate-pulse">{downloadProgress}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명 (다운로드 시 UNIQUE KEY 접두사)</th>
                <th>고유키</th>
                <th>업로드 사용자</th>
                <th>승인상태</th>
                <th>업로드일</th>
                <th className="text-center">다운로드</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(file => {
                const approvalStatus = getFileApprovalStatus(file)
                return (
                  <tr key={file.id}>
                    <td className="max-w-[320px]">
                      <div className="truncate text-xs text-brand-700" title={buildDownloadName(file)}>
                        {file.original_file_name ?? file.file_name}
                      </div>
                      {getFileUniqueKey(file) && (
                        <div className="text-[10px] text-warm-400 truncate" title={buildDownloadName(file)}>
                          → {buildDownloadName(file)}
                        </div>
                      )}
                    </td>
                    <td>
                      <code className="font-mono text-xs text-warm-500 bg-warm-50 px-1 py-0.5 rounded">
                        {getFileUniqueKey(file) || '-'}
                      </code>
                    </td>
                    <td className="text-xs text-warm-600">{file.owner?.full_name ?? '-'}</td>
                    <td className="text-center">
                      {approvalStatus === 'approved' ? (
                        <span className="badge-green">승인완료</span>
                      ) : approvalStatus === 'rejected' ? (
                        <span className="badge-red">반려</span>
                      ) : approvalStatus === 'submitted' ? (
                        <span className="badge-yellow">승인대기</span>
                      ) : (
                        <span className="text-xs text-warm-300">미상신</span>
                      )}
                    </td>
                    <td className="text-xs text-warm-400">
                      {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => downloadFile(file.file_path, buildDownloadName(file))}
                        className="inline-flex items-center gap-1 rounded-lg bg-warm-50 px-2 py-1 text-xs text-brand-700 transition-all hover:bg-brand-100"
                      >
                        <Download size={11} />
                        다운로드
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-warm-400">
                    해당 조건의 파일이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
