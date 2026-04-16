import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, Loader2, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import {
  type UserUploadInput,
  type UserUploadResult,
  readText,
  readBoolean,
  readRole,
  PreviewTable,
  ResultCard,
} from '../adminShared'

export default function UserUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<UserUploadResult | null>(null)
  const [updateResult, setUpdateResult] = useState<{ createdCount: number; updatedCount: number; errors: string[] } | null>(null)

  function downloadTemplate() {
    const worksheet = XLSX.utils.json_to_sheet([
      { 사번: '900001', 이름: '관리자 예시', 구분: '관리자', 이메일: 'admin@tongyanginc.co.kr', 전화번호: '010-0000-0000', 소속팀: '경영지원팀', 활성여부: 'Y' },
      { 사번: '101267', 이름: '담당자 예시', 구분: '담당자', 이메일: 'owner@tongyanginc.co.kr', 전화번호: '010-1111-1111', 소속팀: '재경팀', 활성여부: 'Y' },
      { 사번: '101431', 이름: '승인자 예시', 구분: '승인자', 이메일: 'controller@tongyanginc.co.kr', 전화번호: '010-2222-2222', 소속팀: '감사팀', 활성여부: 'Y' },
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users')
    XLSX.writeFile(workbook, '사용자등록_템플릿.xlsx')
  }

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

  function parseFile(file: File): Promise<Record<string, unknown>[]> {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = loaded => {
        const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' }))
      }
      reader.readAsBinaryString(file)
    })
  }

  function normalizeRows(rows: Record<string, unknown>[]) {
    const errors: string[] = []
    const normalized: UserUploadInput[] = []
    const seenIds = new Set<string>()

    for (const row of rows) {
      const employeeId = readText(row, ['사번', 'employee_id'])
      const fullName = readText(row, ['이름', '성명', 'full_name'])
      const role = readRole(readText(row, ['구분', '권한', 'role']))
      const contactEmail = readText(row, ['이메일', 'e-mail', 'email', 'contact_email']) || null
      const phone = readText(row, ['전화번호', '연락처', ' CP', 'CP', 'phone']) || null
      const department = readText(row, ['소속팀', '관련부서', '부서', 'department']) || null
      const isActive = readBoolean(readText(row, ['활성여부', 'is_active']))

      if (!employeeId && !fullName) continue
      if (!employeeId || !fullName || !role) {
        errors.push(`필수값 누락: 사번=${employeeId || '-'} 이름=${fullName || '-'} 구분=${role ?? '-'}`)
        continue
      }
      if (seenIds.has(employeeId)) continue
      seenIds.add(employeeId)
      normalized.push({ employee_id: employeeId, full_name: fullName, role, department, phone, contact_email: contactEmail, is_active: isActive })
    }

    return { normalized, errors }
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    if (!window.confirm('이 작업은 기존 사용자, 결재, 증빙, RCM, 모집단 데이터를 모두 비우고 템플릿 기준으로 다시 만듭니다. 계속할까요?')) return

    setUploading(true)
    setResult(null)

    const rows = await parseFile(file)
    const { normalized, errors } = normalizeRows(rows)

    if (errors.length) {
      setResult({ createdCount: 0, deletedAuthCount: 0, deletedStorageCount: 0, clearedTables: {}, errors })
      setUploading(false)
      return
    }

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setResult({ createdCount: 0, deletedAuthCount: 0, deletedStorageCount: 0, clearedTables: {}, errors: ['관리자 세션을 확인할 수 없습니다. 다시 로그인 후 시도해주세요.'] })
      setUploading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/replace-users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ users: normalized }),
      })
      const payload = await response.json()

      if (!response.ok || !payload?.ok) {
        setResult({ createdCount: 0, deletedAuthCount: 0, deletedStorageCount: 0, clearedTables: {}, errors: [payload?.detail ?? payload?.error ?? '사용자 초기 업로드에 실패했습니다.'] })
      } else {
        setResult({ createdCount: payload.createdCount ?? 0, deletedAuthCount: payload.deletedAuthCount ?? 0, deletedStorageCount: payload.deletedStorageCount ?? 0, clearedTables: payload.clearedTables ?? {}, errors: payload.errors ?? [] })
        onDone()
      }
    } catch (error) {
      setResult({ createdCount: 0, deletedAuthCount: 0, deletedStorageCount: 0, clearedTables: {}, errors: [error instanceof Error ? error.message : String(error)] })
    } finally {
      setUploading(false)
    }
  }

  async function handleUpdate() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setUpdateResult(null)

    const rows = await parseFile(file)
    const { normalized } = normalizeRows(rows)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) {
      setUpdateResult({ createdCount: 0, updatedCount: 0, errors: ['관리자 세션 없음. 다시 로그인해주세요.'] })
      setUploading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/update-users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ users: normalized }),
      })
      const payload = await response.json()
      setUpdateResult({ createdCount: payload.createdCount ?? 0, updatedCount: payload.updatedCount ?? 0, errors: payload.errors ?? [payload.detail ?? payload.error ?? '업데이트 실패'] })
      if (response.ok && payload.ok) onDone()
    } catch (error) {
      setUpdateResult({ createdCount: 0, updatedCount: 0, errors: [error instanceof Error ? error.message : String(error)] })
    } finally {
      setUploading(false)
    }
  }

  const clearedDataCount = Object.values(result?.clearedTables ?? {}).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-brand-900">사용자 업로드</h3>
        <p className="mb-4 text-sm text-warm-500">
          형식: <code className="rounded bg-warm-100 px-1 text-xs">사번 | 이름 | 권한(담당자/승인자/관리자) | e-mail | CP | 관련부서</code>
          <br />중복 사번은 자동으로 첫 번째만 사용합니다. 로그인 ID = 사번, 초기 비밀번호 = 사번.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={downloadTemplate} className="btn-secondary px-3 py-2 text-xs">
            <Download size={14} />
            템플릿 다운로드
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="form-input text-sm" disabled={uploading} />
          </div>
          <button onClick={handleUpdate} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '정보 업데이트'}
          </button>
          <button onClick={handleUpload} disabled={uploading} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : '⚠'}
            {uploading ? '' : '전체 초기화'}
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <strong>정보 업데이트</strong>: 기존 사용자 비밀번호 유지 + 이름/이메일/전화/소속팀 덮어쓰기. 신규 사번은 새로 생성.<br />
          <strong>전체 초기화</strong>: 모든 데이터(사용자·결재·증빙·RCM·모집단) 삭제 후 재생성. 최초 1회만 사용.
        </div>
      </div>

      <PreviewTable rows={preview} />

      {updateResult && (
        <ResultCard
          title="사용자 정보 업데이트 완료"
          stats={[
            { label: '정보 업데이트', value: updateResult.updatedCount, color: 'text-blue-600' },
            { label: '신규 생성', value: updateResult.createdCount, color: 'text-emerald-600' },
            { label: '오류', value: updateResult.errors.length, color: 'text-red-500' },
          ]}
          errors={updateResult.errors}
          note="기존 사용자의 비밀번호는 변경되지 않았습니다."
        />
      )}

      {result && (
        <ResultCard
          title="전체 초기화 완료"
          stats={[
            { label: '생성된 사용자', value: result.createdCount, color: 'text-emerald-600' },
            { label: '삭제된 기존 계정', value: result.deletedAuthCount, color: 'text-blue-600' },
            { label: '초기화된 데이터', value: clearedDataCount + result.deletedStorageCount, color: 'text-red-500' },
          ]}
          errors={result.errors}
          note="완료 후 관리자 계정으로 다시 로그인해주세요."
        />
      )}
    </div>
  )
}
