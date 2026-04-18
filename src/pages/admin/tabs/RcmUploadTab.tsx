import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Upload, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readText, PreviewTable, ResultCard, retryOnNetworkError } from '../adminShared'
import { useToast } from '../../../components/Toast'

export default function RcmUploadTab({ onDone }: { onDone: () => void }) {
  const toast = useToast()
  const resultRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<{ inserted: number; overwritten: number; errors: string[] } | null>(null)
  const [resetResult, setResetResult] = useState<{
    activitiesDeleted: number
    approvalsDeleted: number
    errors: string[]
  } | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' })

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = loaded => {
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      setPreview(XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' }).slice(0, 5))
    }
    reader.readAsBinaryString(file)
  }

  async function handleReset() {
    if (
      !window.confirm(
        '⚠ RCM 전체 초기화 경고\n\n' +
          '다음 데이터가 삭제됩니다:\n' +
          '• 저장된 RCM(통제활동) 전체\n' +
          '• 결재 이력(승인/반려/신청) 전체\n\n' +
          '※ 업로드된 증빙 파일은 보존됩니다.\n' +
          '   증빙 파일 삭제는 "증빙관리" 메뉴에서 따로 진행하세요.\n\n' +
          '되돌릴 수 없습니다. 계속하시겠습니까?'
      )
    )
      return

    if (!window.confirm('정말로 RCM·결재 데이터를 초기화하시겠습니까?\n(마지막 확인)')) return

    setResetting(true)
    setResetResult(null)

    const errors: string[] = []
    let activitiesDeleted = 0
    let approvalsDeleted = 0

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      // 1) approval_requests
      const { count: apCount, error: apErr } = await db
        .from('approval_requests')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (apErr) errors.push(`결재 이력 삭제 실패: ${apErr.message}`)
      else approvalsDeleted = apCount ?? 0

      // 2) activities (RCM) — keep evidence_uploads and storage files untouched
      const { count: actCount, error: actErr } = await db
        .from('activities')
        .delete({ count: 'exact' })
        .not('id', 'is', null)
      if (actErr) errors.push(`통제활동(RCM) 삭제 실패: ${actErr.message}`)
      else activitiesDeleted = actCount ?? 0

      setResetResult({ activitiesDeleted, approvalsDeleted, errors })
      onDone()
      const summary = `통제활동 ${activitiesDeleted.toLocaleString()}건 · 결재 ${approvalsDeleted.toLocaleString()}건 삭제`
      if (errors.length === 0) toast.success('RCM 초기화 완료', summary)
      else toast.info('RCM 초기화 부분 완료', `${summary}\n오류 ${errors.length.toLocaleString()}건`)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      errors.push(`초기화 처리 중 예외 발생: ${err instanceof Error ? err.message : String(err)}`)
      setResetResult({ activitiesDeleted, approvalsDeleted, errors })
      toast.error('RCM 초기화 실패', err instanceof Error ? err.message : String(err))
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
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
      const errors: string[] = []
      let inserted = 0
      let overwritten = 0
      const db = supabase as any

      setProgress({ current: 0, total: rows.length, phase: '사번 확인 중...' })

      const employeeIds = Array.from(
        new Set(
          rows
            .flatMap(row => [
              readText(row, ['담당자사번', '담당자 사번', 'owner_employee_id']),
              readText(row, ['승인자사번', '승인자 사번', 'controller_employee_id']),
            ])
            .filter(Boolean)
        )
      )

      if (employeeIds.length) {
        const { data: profiles, error } = await db.from('profiles').select('employee_id').in('employee_id', employeeIds)
        if (error) {
          errors.push(`사용자 사번 확인 실패: ${error.message}`)
        } else {
          const existing = new Set((profiles ?? []).map((profile: { employee_id: string | null }) => profile.employee_id))
          const missing = employeeIds.filter(employeeId => !existing.has(employeeId))
          if (missing.length) {
            errors.push(`사전 등록이 필요한 사번 ${missing.length}건: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ' …' : ''}`)
          }
        }
      }

      setProgress({ current: 0, total: rows.length, phase: '프로필 매핑 중...' })

      const allEmployeeIds = Array.from(
        new Set(
          rows.flatMap(row => [
            readText(row, ['담당자사번', '담당자 사번', 'owner_employee_id']),
            readText(row, ['승인자사번', '승인자 사번', 'controller_employee_id']),
          ]).filter(Boolean)
        )
      )
      const profileIdMap: Record<string, string> = {}
      if (allEmployeeIds.length) {
        for (let i = 0; i < allEmployeeIds.length; i += 100) {
          const { data: pData } = await db.from('profiles').select('id, employee_id').in('employee_id', allEmployeeIds.slice(i, i + 100))
          for (const p of pData ?? []) {
            if (p.employee_id) profileIdMap[p.employee_id] = p.id
          }
        }
      }

      setProgress({ current: 0, total: rows.length, phase: '기존 통제활동 조회 중...' })

      // Pre-fetch existing activity unique_keys so we can distinguish insert vs overwrite
      // and avoid resetting submission_status when it already has a runtime value.
      const existingActivityByKey = new Map<string, { id: string; submission_status: string | null }>()
      {
        let from = 0
        const size = 1000
        while (true) {
          const { data, error } = await db
            .from('activities')
            .select('id, unique_key, submission_status')
            .range(from, from + size - 1)
          if (error) {
            errors.push(`기존 통제활동 조회 실패: ${error.message}`)
            break
          }
          const chunk = (data ?? []) as { id: string; unique_key: string | null; submission_status: string | null }[]
          chunk.forEach(row => {
            if (row.unique_key) existingActivityByKey.set(row.unique_key, { id: row.id, submission_status: row.submission_status })
          })
          if (chunk.length < size) break
          from += size
        }
      }

      setProgress({ current: 0, total: rows.length, phase: '통제활동 반영 중...' })

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx]
        const rowNumber = rowIdx + 2 // header row = 1
        if (rowIdx % 5 === 0) setProgress({ current: rowIdx, total: rows.length, phase: '통제활동 반영 중...' })
        const controlCode = readText(row, ['통제번호', 'control_code'])
        const department = readText(row, ['관련부서', '부서', 'department'])
        const uniqueKey = controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
        if (!uniqueKey) {
          errors.push(`행 ${rowNumber}: 고유키 생성 실패 (통제번호/관련부서 누락)`)
          continue
        }

        const ownerEmpId = readText(row, ['담당자사번', '담당자 사번', 'owner_employee_id']) || null
        const controllerEmpId = readText(row, ['승인자사번', '승인자 사번', 'controller_employee_id']) || null
        const existing = existingActivityByKey.get(uniqueKey)

        // Base metadata from Excel (RCM fields — safe to overwrite)
        const metadata = {
          control_code: controlCode || null,
          owner_name: readText(row, ['담당자', 'owner_name']) || null,
          department: department || null,
          title: readText(row, ['통제활동명', 'title']) || null,
          description: readText(row, ['제출 증빙에 대한 설명', '제출 증빙자료명', '제출 증빙명', 'description']) || null,
          controller_name: readText(row, ['승인자', 'controller_name']) || null,
          kpi_score: Number.parseFloat(readText(row, ['KPI 점수', '환산점수', 'kpi_score']) || '0') || 0,
          owner_employee_id: ownerEmpId,
          owner_email: readText(row, ['담당자mail', '담당자 mail', 'owner_email']) || null,
          owner_phone: readText(row, ['담당자CP', '담당자 CP', 'owner_phone']) || null,
          controller_employee_id: controllerEmpId,
          controller_email: readText(row, ['승인자mail', '승인자 mail', 'controller_email']) || null,
          controller_phone: readText(row, ['승인자CP', '승인자 CP', 'controller_phone']) || null,
          control_department: readText(row, ['통제부서', 'control_department']) || null,
          cycle: readText(row, ['주기', 'cycle']) || null,
          key_control: readText(row, ['핵심/비핵심', 'key_control']).includes('핵심'),
          manual_control: readText(row, ['수동/자동', 'manual_control']).includes('수동'),
          base_score: Number.parseFloat(readText(row, ['배점', 'base_score']) || '0') || 0,
          converted_score: Number.parseFloat(readText(row, ['환산점수', 'converted_score']) || '0') || 0,
          test_document: readText(row, ['테스트 문서', 'test_document']) || null,
          owner_id: ownerEmpId && profileIdMap[ownerEmpId] ? profileIdMap[ownerEmpId] : null,
          controller_id: controllerEmpId && profileIdMap[controllerEmpId] ? profileIdMap[controllerEmpId] : null,
          active: true,
        }

        try {
          if (existing) {
            // DUPLICATE 고유키 → UPDATE (id preserved → approvals/evidence stay linked)
            // Do NOT overwrite submission_status — it's runtime state, not RCM metadata
            const result = await retryOnNetworkError(
              () =>
                db
                  .from('activities')
                  .update(metadata)
                  .eq('id', existing.id) as Promise<{ error: { message: string } | null }>,
              { label: `activities.update row ${rowNumber}` },
            )
            if (result.error) errors.push(`행 ${rowNumber} [${uniqueKey}]: 덮어쓰기 실패 — ${result.error.message}`)
            else overwritten += 1
          } else {
            // NEW 고유키 → INSERT with initial '미완료' status
            const insertPayload = {
              unique_key: uniqueKey,
              submission_status: '미완료',
              ...metadata,
            }
            const result = await retryOnNetworkError(
              () =>
                db
                  .from('activities')
                  .insert(insertPayload)
                  .select('id')
                  .single() as Promise<{ data: { id: string } | null; error: { message: string } | null }>,
              { label: `activities.insert row ${rowNumber}` },
            )
            if (result.error) errors.push(`행 ${rowNumber} [${uniqueKey}]: 신규 추가 실패 — ${result.error.message}`)
            else {
              inserted += 1
              if (result.data?.id) existingActivityByKey.set(uniqueKey, { id: result.data.id, submission_status: '미완료' })
            }
          }
        } catch (opErr) {
          const rawMsg = opErr instanceof Error ? opErr.message : String(opErr)
          const isNetwork = /failed to fetch|networkerror|load failed|err_network|typeerror/i.test(rawMsg)
          const prefix = isNetwork ? '네트워크 오류' : '처리 오류'
          errors.push(`행 ${rowNumber} [${uniqueKey}]: ${prefix} (재시도 3회 실패) — ${rawMsg}`)
        }
      }

      setProgress({ current: rows.length, total: rows.length, phase: '완료' })
      setResult({ inserted, overwritten, errors })
      setUploading(false)
      onDone()

      // Toast notification
      const summary = `신규 추가 ${inserted.toLocaleString()}건 · 덮어쓰기 ${overwritten.toLocaleString()}건`
      if (errors.length === 0) {
        toast.success('RCM 업로드 완료', summary)
      } else if (inserted + overwritten === 0) {
        toast.error('RCM 업로드 실패', `${errors.length.toLocaleString()}건 오류 — 결과 카드에서 상세 확인`)
      } else {
        toast.info(
          'RCM 업로드 부분 완료',
          `${summary}\n오류 ${errors.length.toLocaleString()}건 — 결과 카드에서 상세 확인`,
        )
      }

      // Auto-scroll to result card
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }

    reader.readAsBinaryString(file)
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-brand-900">RCM 업로드</h3>
        <p className="mb-4 text-sm text-warm-500">
          RCM은 사용자 생성을 하지 않고, 통제활동과 담당자·승인자 매핑만 반영합니다. 사번은 사용자 템플릿에 먼저
          등록되어 있어야 합니다. 같은 고유키(통제번호+관련부서)가 있으면 <strong>새 파일의 값으로 전체 덮어쓰기</strong>
          (id 유지 → 결재이력·증빙파일 보존, 진행 중인 결재상태도 그대로 유지).
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
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
            {uploading ? '처리 중...' : '업로드'}
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
          <strong>업로드</strong>: 신규 고유키는 추가, 중복 고유키는 새 값으로 전체 덮어쓰기 (submission_status는 runtime 상태라 변경 안 함).<br />
          <strong>전체 초기화</strong>: RCM/통제활동·결재 데이터만 삭제됩니다. 업로드된 증빙 파일은 보존되며, 증빙 파일 정리는 "증빙관리" 메뉴에서 따로 진행하세요.
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-warm-600">
              <span>{progress.phase}</span>
              <span>{progress.current.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)</span>
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
          title="RCM 업로드 완료"
          stats={[
            { label: '신규 추가', value: result.inserted, color: 'text-emerald-600' },
            { label: '덮어쓰기', value: result.overwritten, color: 'text-blue-600' },
            { label: '오류', value: result.errors.length, color: 'text-red-500' },
          ]}
          errors={result.errors}
          note="중복 고유키는 메타데이터만 새 값으로 덮어쓰고, 결재상태(submission_status)는 runtime 값이므로 유지됩니다. 결재이력·증빙파일도 id가 보존되어 영향 없음."
        />
      )}

      {resetResult && (
        <ResultCard
          title="RCM 초기화 완료"
          stats={[
            { label: '삭제 통제활동', value: resetResult.activitiesDeleted, color: 'text-red-500' },
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
