import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { readText, PreviewTable, ResultCard } from '../adminShared'

export default function RcmUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<{ upserted: number; errors: string[] } | null>(null)
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
      let upserted = 0
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
            errors.push(`사전 등록이 필요한 사번 ${missing.length}건: ${missing.slice(0, 10).join(', ')}`)
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

      setProgress({ current: 0, total: rows.length, phase: '통제활동 등록 중...' })

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx]
        if (rowIdx % 5 === 0) setProgress({ current: rowIdx, total: rows.length, phase: '통제활동 등록 중...' })
        const controlCode = readText(row, ['통제번호', 'control_code'])
        const department = readText(row, ['관련부서', '부서', 'department'])
        const uniqueKey = controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
        if (!uniqueKey) continue

        const ownerEmpId = readText(row, ['담당자사번', '담당자 사번', 'owner_employee_id']) || null
        const controllerEmpId = readText(row, ['승인자사번', '승인자 사번', 'controller_employee_id']) || null

        const payload = {
          unique_key: uniqueKey,
          control_code: controlCode || null,
          owner_name: readText(row, ['담당자', 'owner_name']) || null,
          department: department || null,
          title: readText(row, ['통제활동명', 'title']) || null,
          description: readText(row, ['제출 증빙에 대한 설명', '제출 증빙자료명', '제출 증빙명', 'description']) || null,
          controller_name: readText(row, ['승인자', 'controller_name']) || null,
          kpi_score: Number.parseFloat(readText(row, ['KPI 점수', '환산점수', 'kpi_score']) || '0') || 0,
          submission_status: '미완료',
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

        const { error } = await db.from('activities').upsert(payload, { onConflict: 'unique_key' })
        if (error) errors.push(`[${uniqueKey}] ${error.message}`)
        else upserted += 1
      }

      setProgress({ current: rows.length, total: rows.length, phase: '완료' })
      setResult({ upserted, errors })
      setUploading(false)
      onDone()
    }

    reader.readAsBinaryString(file)
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900">RCM 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          RCM은 사용자 생성을 하지 않고, 통제활동과 담당자·승인자 매핑만 반영합니다. 사번은 사용자 템플릿에 먼저
          등록되어 있어야 합니다.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="form-input text-sm" disabled={uploading} />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '업로드'}
          </button>
        </div>

        {uploading && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{progress.phase}</span>
              <span>{progress.current.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <PreviewTable rows={preview} />

      {result && (
        <ResultCard
          title="RCM 업로드 완료"
          stats={[
            { label: '반영된 통제활동', value: result.upserted, color: 'text-emerald-600' },
            { label: '사용자 생성', value: 0, color: 'text-blue-600' },
            { label: '확인 필요', value: result.errors.length, color: 'text-red-500' },
          ]}
          errors={result.errors}
        />
      )}
    </div>
  )
}
