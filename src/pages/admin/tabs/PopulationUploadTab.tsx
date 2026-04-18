import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Upload, AlertTriangle, Download } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readText, toDateString, PreviewTable, ResultCard, retryOnNetworkError } from '../adminShared'
import { useToast } from '../../../components/Toast'

export default function PopulationUploadTab({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const resultRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<{ inserted: number; overwritten: number; errors: string[] } | null>(null)
  const [resetResult, setResetResult] = useState<{
    populationDeleted: number
    approvalsDeleted: number
    errors: string[]
  } | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' })

  function formatCellValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return ''
    if (value instanceof Date) {
      const dateStr = toDateString(value)
      return dateStr ?? String(value)
    }
    // Excel serial-date numbers fall in ~25569 (1970-01-01) to ~80000 (2118). Apply only to plausible dates.
    if (typeof value === 'number' && value >= 25569 && value <= 80000 && Number.isFinite(value)) {
      const dateStr = toDateString(value)
      if (dateStr) return dateStr
    }
    return String(value)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loaded => {
      try {
        const workbook = XLSX.read(loaded.target?.result, { type: 'binary', cellDates: true })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' }).slice(0, 5)
        const formattedRows = rawRows.map(row => {
          const formatted: Record<string, string> = {}
          for (const [key, value] of Object.entries(row)) {
            formatted[key] = formatCellValue(value)
          }
          return formatted
        })
        setPreview(formattedRows)
      } catch (err) {
        console.error('[PopulationUploadTab] file parse error:', err)
        alert('파일을 읽을 수 없습니다. 올바른 Excel 파일인지 확인해주세요.')
      }
    }
    reader.onerror = () => alert('파일 읽기 중 오류가 발생했습니다.')
    reader.readAsBinaryString(file)
  }

  async function handleExport() {
    setExporting(true)
    const loadingId = toast.loading('모집단 엑셀 다운로드 준비 중...')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const all: Array<Record<string, unknown>> = []
      let from = 0
      const size = 1000
      while (true) {
        const { data, error } = await db
          .from('population_items')
          .select('*')
          .order('unique_key')
          .range(from, from + size - 1)
        if (error) throw error
        const chunk = data ?? []
        all.push(...chunk)
        if (chunk.length < size) break
        from += size
      }

      const rows = all.map((item, index) => ({
        번호: index + 1,
        통제번호: item.control_code ?? '',
        부서코드: item.dept_code ?? '',
        관련부서: item.related_dept ?? '',
        'Sample ID': item.sample_id ?? '',
        'Transaction ID': item.transaction_id ?? '',
        거래일: item.transaction_date ?? '',
        거래설명: item.description ?? '',
        '추가 정보 1': item.extra_info ?? '',
        '추가 정보 2': item.extra_info_2 ?? '',
        '추가 정보 3': item.extra_info_3 ?? '',
        '추가 정보 4': item.extra_info_4 ?? '',
        고유키1: item.unique_key ?? '',
        고유키2: item.unique_key_2 ?? '',
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '모집단')
      XLSX.writeFile(workbook, `모집단_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.update(loadingId, {
        kind: 'success',
        title: '모집단 엑셀 다운로드 완료',
        description: `${rows.length.toLocaleString()}건 내보내기`,
      })
    } catch (err) {
      toast.update(loadingId, {
        kind: 'error',
        title: '엑셀 다운로드 실패',
        description: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setExporting(false)
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        '⚠ 모집단 전체 초기화 경고\n\n' +
          '다음 데이터가 삭제됩니다:\n' +
          '• 저장된 모집단 데이터 전체\n' +
          '• 결재 이력 (승인/반려/신청) 전체\n\n' +
          '※ 업로드된 증빙 파일은 보존됩니다.\n' +
          '   증빙 파일 삭제는 "증빙관리" 메뉴에서 따로 진행하세요.\n\n' +
          '되돌릴 수 없습니다. 계속하시겠습니까?'
      )
    )
      return

    if (!window.confirm('정말로 모집단·결재 데이터를 초기화하시겠습니까?\n(마지막 확인)')) return

    setResetting(true)
    setResetResult(null)

    const errors: string[] = []
    let populationDeleted = 0
    let approvalsDeleted = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 1) Delete approval_requests (evidence files stay untouched)
      const { count: apCount, error: apErr } = await db
        .from('approval_requests')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (apErr) errors.push(`결재 이력 삭제 실패: ${apErr.message}`)
      else approvalsDeleted = apCount ?? 0

      // 2) Delete population_items
      const { count: popCount, error: popErr } = await db
        .from('population_items')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (popErr) errors.push(`모집단 삭제 실패: ${popErr.message}`)
      else populationDeleted = popCount ?? 0

      // 3) Reset all activity submission statuses so dashboard reflects cleared state
      const { error: actErr } = await db
        .from('activities')
        .update({ submission_status: '미완료' })
        .not('id', 'is', null)
      if (actErr) errors.push(`통제활동 상태 초기화 실패: ${actErr.message}`)

      setResetResult({ populationDeleted, approvalsDeleted, errors })
      onDone()
      const summary = `모집단 ${populationDeleted.toLocaleString()}건 · 결재 ${approvalsDeleted.toLocaleString()}건 삭제`
      if (errors.length === 0) toast.success('모집단 초기화 완료', summary)
      else toast.info('모집단 초기화 부분 완료', `${summary}\n오류 ${errors.length.toLocaleString()}건`)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      errors.push(`초기화 처리 중 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
      setResetResult({ populationDeleted, approvalsDeleted, errors })
      toast.error('모집단 초기화 실패', err instanceof Error ? err.message : String(err))
    } finally {
      setResetting(false)
    }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setResult(null)
    setProgress({ current: 0, total: 0, phase: '파일 읽는 중...' })

    const reader = new FileReader()
    reader.onload = async loaded => {
      try {
        const workbook = XLSX.read(loaded.target?.result, { type: 'binary', cellDates: true })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
        const errors: string[] = []
        let inserted = 0
        let overwritten = 0
        const db = supabase as any

        setProgress({ current: 0, total: rows.length, phase: '기존 데이터 조회 중...' })

        // Fetch existing rows (id only) keyed by unique_key_2 — we need the id to UPDATE in place
        // (UPDATE preserves the id so FK references from evidence_uploads remain intact)
        const existingIdByKey2 = new Map<string, string>()
        {
          let from = 0
          const size = 1000
          while (true) {
            const { data, error } = await db
              .from('population_items')
              .select('id, unique_key_2')
              .range(from, from + size - 1)
            if (error) {
              errors.push(`기존 모집단 조회 실패: ${error.message}`)
              break
            }
            const chunk = (data ?? []) as { id: string; unique_key_2: string | null }[]
            chunk.forEach(row => {
              if (row.unique_key_2) existingIdByKey2.set(row.unique_key_2, row.id)
            })
            if (chunk.length < size) break
            from += size
          }
        }

        setProgress({ current: 0, total: rows.length, phase: '모집단 반영 중...' })

        for (let index = 0; index < rows.length; index += 1) {
          if (index % 10 === 0) setProgress({ current: index, total: rows.length, phase: '모집단 반영 중...' })
          const row = rows[index]
          const rowNumber = index + 2 // header is row 1
          const controlCode = readText(row, ['통제번호', 'control_code'])
          const department = readText(row, ['관련부서', 'department'])
          const uniqueKey =
            controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', '고유키1', '고유키 1', 'unique_key'])
          if (!uniqueKey) {
            errors.push(`행 ${rowNumber}: 고유키1 생성 실패 (통제번호/관련부서 누락)`)
            continue
          }

          // 고유키2 raw value from Excel (column "고유키2")
          const uniqueKey2 = readText(row, ['고유키2', '고유키 2', 'unique_key_2', 'Sample ID', 'sample_id'])
          if (!uniqueKey2) {
            errors.push(`행 ${rowNumber}: 고유키2 누락 (N열 "고유키2" 컬럼 확인)`)
            continue
          }

          // Transaction ID: if the cell value is a Date or Excel serial date number, convert to YYYY-MM-DD
          const txIdRaw = row['Transaction ID'] ?? row.transaction_id
          let transactionId: string | null
          if (txIdRaw instanceof Date) {
            transactionId = toDateString(txIdRaw)
          } else if (
            typeof txIdRaw === 'number' &&
            txIdRaw >= 25569 &&
            txIdRaw <= 80000 &&
            Number.isFinite(txIdRaw)
          ) {
            transactionId = toDateString(txIdRaw)
          } else {
            transactionId = String(txIdRaw ?? '').trim() || null
          }
          const transactionDate =
            toDateString(row['거래일'] ?? row.transaction_date) ??
            toDateString(row['Transaction Date'] ?? row.transaction_date)

          // Build the full payload from the new Excel row (overwrite semantics)
          const excelFields = {
            control_code: controlCode || null,
            dept_code: readText(row, ['부서코드', 'dept_code']) || null,
            related_dept: department || null,
            transaction_id: transactionId,
            transaction_date: transactionDate,
            description: readText(row, ['거래설명', 'description']) || null,
            extra_info: readText(row, ['추가 정보 1', '추가정보 1', '추가정보1', 'extra_info']) || null,
            extra_info_2: readText(row, ['추가 정보 2', '추가정보 2', '추가정보2', 'extra_info_2']) || null,
            extra_info_3: readText(row, ['추가 정보 3', '추가정보 3', '추가정보3', 'extra_info_3']) || null,
            extra_info_4: readText(row, ['추가 정보 4', '추가정보 4', '추가정보4', 'extra_info_4']) || null,
          }

          const existingId = existingIdByKey2.get(uniqueKey2)

          try {
            if (existingId) {
              // DUPLICATE 고유키2 → UPDATE in place (keeps id → evidence_uploads FK preserved)
              const updatePayload = {
                unique_key: uniqueKey,
                ...excelFields,
              }
              const result = await retryOnNetworkError(
                () =>
                  db
                    .from('population_items')
                    .update(updatePayload)
                    .eq('id', existingId) as Promise<{ error: { message: string; code?: string } | null }>,
                { label: `population.update row ${rowNumber}` },
              )
              if (result.error) {
                errors.push(`행 ${rowNumber} [고유키2=${uniqueKey2}]: 덮어쓰기 실패 — ${result.error.message}`)
              } else {
                overwritten += 1
              }
            } else {
              // NEW 고유키2 → insert
              const insertPayload = {
                unique_key: uniqueKey,
                unique_key_2: uniqueKey2,
                sample_id: null, // unique_key_2 is the canonical identifier
                ...excelFields,
              }

              const result = await retryOnNetworkError(
                () =>
                  db
                    .from('population_items')
                    .insert(insertPayload)
                    .select('id')
                    .single() as Promise<{ data: { id: string } | null; error: { message: string; code?: string } | null }>,
                { label: `population.insert row ${rowNumber}` },
              )
              if (result.error) {
                errors.push(`행 ${rowNumber} [고유키2=${uniqueKey2}]: 신규 추가 실패 — ${result.error.message}`)
              } else {
                inserted += 1
                if (result.data?.id) existingIdByKey2.set(uniqueKey2, result.data.id)
              }
            }
          } catch (opErr) {
            const rawMsg = opErr instanceof Error ? opErr.message : String(opErr)
            const isNetwork = /failed to fetch|networkerror|load failed|err_network|typeerror/i.test(rawMsg)
            const prefix = isNetwork ? '네트워크 오류' : '처리 오류'
            errors.push(`행 ${rowNumber} [고유키2=${uniqueKey2}]: ${prefix} (재시도 3회 실패) — ${rawMsg}`)
          }
        }

        setProgress({ current: rows.length, total: rows.length, phase: '완료' })
        setResult({ inserted, overwritten, errors })
        onDone()

        const summary = `신규 추가 ${inserted.toLocaleString()}건 · 덮어쓰기 ${overwritten.toLocaleString()}건`
        if (errors.length === 0) {
          toast.success('모집단 업로드 완료', summary)
        } else if (inserted + overwritten === 0) {
          toast.error('모집단 업로드 실패', `${errors.length.toLocaleString()}건 오류 — 결과 카드에서 상세 확인`)
        } else {
          toast.info(
            '모집단 업로드 부분 완료',
            `${summary}\n오류 ${errors.length.toLocaleString()}건 — 결과 카드에서 상세 확인`,
          )
        }
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      } catch (err) {
        console.error('[PopulationUploadTab] upload error:', err)
        toast.error('모집단 업로드 실패', err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setUploading(false)
      }
    }

    reader.onerror = () => {
      alert('파일 읽기 중 오류가 발생했습니다.')
      setUploading(false)
    }
    reader.readAsBinaryString(file)
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-brand-900">모집단 업로드</h3>
        <p className="mb-4 text-sm text-warm-500">
          엑셀 N열의 <strong>"고유키2"</strong>가 신규면 추가하고, 중복이면 해당 행을
          <strong>새 파일의 값으로 전체 덮어쓰기</strong>합니다. 기존 id는 그대로 유지되므로
          업로드한 증빙파일·결재이력·대시보드 상태는 영향받지 않습니다.
        </p>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="form-input text-sm"
              disabled={uploading || resetting}
            />
          </div>
          <button onClick={handleUpload} disabled={uploading || resetting} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '추가 업로드'}
          </button>
          <button
            onClick={handleExport}
            disabled={uploading || resetting || exporting}
            className="btn-secondary shrink-0"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {exporting ? '내보내는 중...' : '현재 DB 엑셀 다운로드'}
          </button>
          <button
            onClick={handleReset}
            disabled={uploading || resetting}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 shrink-0 inline-flex items-center gap-1.5"
          >
            {resetting ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
            {resetting ? '초기화 중...' : '전체 초기화'}
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <strong>추가 업로드</strong>: 신규 고유키2는 추가, 중복이면 새 값으로 전체 덮어쓰기. 증빙파일/결재이력은 id가 유지되므로 그대로 보존됨.<br />
          <strong>전체 초기화</strong>: 모집단 데이터와 결재이력만 삭제됩니다. 업로드된 증빙 파일은 보존되며, 증빙 파일 정리는 "증빙관리" 메뉴에서 따로 진행하세요.
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-warm-600">
              <span>{progress.phase}</span>
              <span>
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-warm-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <PreviewTable rows={preview} />

      <div ref={resultRef} />

      {result && (
        <ResultCard
          title="모집단 업로드 완료"
          stats={[
            { label: '신규 추가', value: result.inserted, color: 'text-emerald-600' },
            { label: '덮어쓰기', value: result.overwritten, color: 'text-blue-600' },
            { label: '오류', value: result.errors.length, color: 'text-red-500' },
          ]}
          errors={result.errors}
          note="중복 고유키2는 새 파일의 값으로 전체 덮어씌워집니다. id가 유지되어 증빙파일·결재·대시보드는 영향받지 않습니다."
        />
      )}

      {resetResult && (
        <ResultCard
          title="모집단 초기화 완료"
          stats={[
            { label: '삭제 모집단', value: resetResult.populationDeleted, color: 'text-red-500' },
            { label: '삭제 결재', value: resetResult.approvalsDeleted, color: 'text-red-500' },
            { label: '증빙 파일', value: 0, color: 'text-emerald-600' },
          ]}
          errors={resetResult.errors}
          note="증빙 파일은 보존되었습니다. 삭제가 필요하면 증빙관리 메뉴에서 진행하세요. 대시보드/승인현황은 새로고침 후 초기화된 상태로 보여집니다."
        />
      )}
    </div>
  )
}
