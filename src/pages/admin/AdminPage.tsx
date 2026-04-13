import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Loader2,
  PlayCircle,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

type Tab = 'upload-users' | 'upload-rcm' | 'upload-population' | 'users' | 'activities' | 'files' | 'notifications' | 'videos'

type UserRow = {
  id: string
  email: string
  full_name: string | null
  employee_id: string | null
  department: string | null
  phone: string | null
  role: string
  is_active: boolean
  initial_password: string | null
  created_at: string
}

type UserUploadInput = {
  employee_id: string
  full_name: string
  role: 'admin' | 'owner' | 'controller'
  department: string | null
  phone: string | null
  contact_email: string | null
  is_active: boolean
}

type UserUploadResult = {
  createdCount: number
  deletedAuthCount: number
  deletedStorageCount: number
  clearedTables: Record<string, number>
  errors: string[]
}

type ActivityRow = {
  id: string
  control_code: string | null
  owner_name: string | null
  department: string | null
  title: string | null
  submission_status: string | null
  controller_name: string | null
}

type FileRow = {
  id: string
  file_name: string
  original_file_name?: string | null
  file_path: string
  unique_key: string | null
  uploaded_at: string | null
  owner?: { full_name: string | null }
}

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'upload-users', label: '사용자 초기 업로드', icon: Users },
  { key: 'upload-rcm', label: 'RCM 업로드', icon: FileSpreadsheet },
  { key: 'upload-population', label: '모집단 업로드', icon: Database },
  { key: 'users', label: '사용자 관리', icon: Users },
  { key: 'activities', label: '통제활동 관리', icon: Shield },
  { key: 'files', label: '증빙 다운로드', icon: Download },
  { key: 'notifications', label: '알림 발송', icon: Bell },
  { key: 'videos', label: '강좌 동영상', icon: PlayCircle },
]

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  owner: '담당자',
  controller: '승인자',
}

const ROLE_BADGES: Record<string, string> = {
  admin: 'badge-purple',
  owner: 'badge-green',
  controller: 'badge-blue',
}

const SUBMISSION_BADGES: Record<string, string> = {
  미완료: 'badge-yellow',
  완료: 'badge-blue',
  승인: 'badge-green',
  반려: 'badge-red',
}

function buildLoginEmail(employeeId: string) {
  return `${employeeId.trim()}@tongyanginc.co.kr`
}

function readText(row: Record<string, unknown>, keys: string[]) {
  return keys.map(key => String(row[key] ?? '').trim()).find(Boolean) ?? ''
}

function readBoolean(value: string) {
  if (!value) return true
  return ['y', 'yes', 'true', '1', 'active', '활성', '사용'].includes(value.trim().toLowerCase())
}

function readRole(value: string): 'admin' | 'owner' | 'controller' | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['admin', '관리자'].includes(normalized)) return 'admin'
  if (['owner', '담당자', '증빙담당자', '일반사용자', '일반'].includes(normalized)) return 'owner'
  if (['controller', '승인자', '통제책임자'].includes(normalized)) return 'controller'
  return null
}

function toDateString(value: unknown) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }

  if (typeof value === 'number') {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000)
    if (Number.isNaN(date.getTime())) return null
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
  }

  const text = String(value ?? '').trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return toDateString(Number.parseInt(text, 10))
  return /^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10)) ? text.slice(0, 10) : null
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  if (!rows.length) return null

  return (
    <div className="card p-5">
      <p className="mb-3 text-sm font-semibold text-gray-700">파일 미리보기</p>
      <div className="overflow-x-auto">
        <table className="data-table text-xs">
          <thead>
            <tr>
              {Object.keys(rows[0]).slice(0, 8).map(key => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {Object.values(row).slice(0, 8).map((value, columnIndex) => (
                  <td key={columnIndex}>{String(value)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultCard({
  title,
  stats,
  errors,
  note,
}: {
  title: string
  stats: Array<{ label: string; value: number; color: string }>
  errors: string[]
  note?: string
}) {
  const hasErrors = errors.length > 0

  return (
    <div className={clsx('card p-5', hasErrors ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30')}>
      <div className="mb-3 flex items-center gap-2">
        {hasErrors ? (
          <AlertTriangle size={18} className="text-amber-600" />
        ) : (
          <CheckCircle2 size={18} className="text-emerald-600" />
        )}
        <p className="font-bold text-gray-900">{title}</p>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        {stats.map(item => (
          <div key={item.label} className="text-center">
            <p className={clsx('text-2xl font-black', item.color)}>{item.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      {note && <p className="mb-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-gray-600">{note}</p>}

      {!!errors.length && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-red-50 p-3">
          {errors.slice(0, 12).map((error, index) => (
            <p key={index} className="break-all font-mono text-xs text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('upload-users')
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey(value => value + 1)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-gray-900">
          <Shield size={22} className="text-purple-600" />
          관리자
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          사용자 초기 세팅, RCM, 모집단 업로드를 여기서 관리합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
        <p className="text-sm font-semibold text-orange-900">현재 권장 순서</p>
        <p className="mt-1 text-sm text-orange-800">
          1. 사용자 초기 업로드 2. RCM 업로드 3. 모집단 업로드 순서로 진행하면 됩니다.
          로그인 ID와 초기 비밀번호는 모두 사번으로 맞춰집니다.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1.5">
        {TABS.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
              tab === item.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <item.icon size={15} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'upload-users' && <UserUploadTab onDone={refresh} />}
      {tab === 'upload-rcm' && <RcmUploadTab onDone={refresh} />}
      {tab === 'upload-population' && <PopulationUploadTab onDone={refresh} />}
      {tab === 'users' && <UsersTab refreshKey={refreshKey} />}
      {tab === 'activities' && <ActivitiesTab refreshKey={refreshKey} />}
      {tab === 'files' && <FilesTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'videos' && <VideosTab />}
    </div>
  )
}

function UserUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [result, setResult] = useState<UserUploadResult | null>(null)

  function downloadTemplate() {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        사번: '900001',
        이름: '관리자 예시',
        구분: '관리자',
        이메일: 'admin@tongyanginc.co.kr',
        전화번호: '010-0000-0000',
        소속팀: '경영지원팀',
        활성여부: 'Y',
      },
      {
        사번: '101267',
        이름: '담당자 예시',
        구분: '담당자',
        이메일: 'owner@tongyanginc.co.kr',
        전화번호: '010-1111-1111',
        소속팀: '재경팀',
        활성여부: 'Y',
      },
      {
        사번: '101431',
        이름: '승인자 예시',
        구분: '승인자',
        이메일: 'controller@tongyanginc.co.kr',
        전화번호: '010-2222-2222',
        소속팀: '감사팀',
        활성여부: 'Y',
      },
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

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    const confirmed = window.confirm(
      '이 작업은 기존 사용자, 결재, 증빙, RCM, 모집단 데이터를 모두 비우고 템플릿 기준으로 다시 만듭니다. 계속할까요?'
    )
    if (!confirmed) return

    setUploading(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async loaded => {
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

      const errors: string[] = []
      const normalized: UserUploadInput[] = []
      const seenEmployeeIds = new Set<string>()

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

        if (seenEmployeeIds.has(employeeId)) {
          // 동일 사번이 여러 활동에 배정되어 중복 등장하는 경우 → 첫 번째만 사용
          continue
        }

        seenEmployeeIds.add(employeeId)
        normalized.push({
          employee_id: employeeId,
          full_name: fullName,
          role,
          department,
          phone,
          contact_email: contactEmail,
          is_active: isActive,
        })
      }

      if (errors.length) {
        setResult({
          createdCount: 0,
          deletedAuthCount: 0,
          deletedStorageCount: 0,
          clearedTables: {},
          errors,
        })
        setUploading(false)
        return
      }

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        setResult({
          createdCount: 0,
          deletedAuthCount: 0,
          deletedStorageCount: 0,
          clearedTables: {},
          errors: ['관리자 세션을 확인할 수 없습니다. 다시 로그인 후 시도해주세요.'],
        })
        setUploading(false)
        return
      }

      try {
        const response = await fetch('/api/admin/replace-users', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ users: normalized }),
        })

        const payload = await response.json()

        if (!response.ok || !payload?.ok) {
          setResult({
            createdCount: 0,
            deletedAuthCount: 0,
            deletedStorageCount: 0,
            clearedTables: {},
            errors: [payload?.detail ?? payload?.error ?? '사용자 초기 업로드에 실패했습니다.'],
          })
          setUploading(false)
          return
        }

        setResult({
          createdCount: payload.createdCount ?? 0,
          deletedAuthCount: payload.deletedAuthCount ?? 0,
          deletedStorageCount: payload.deletedStorageCount ?? 0,
          clearedTables: payload.clearedTables ?? {},
          errors: payload.errors ?? [],
        })
        onDone()
      } catch (error) {
        setResult({
          createdCount: 0,
          deletedAuthCount: 0,
          deletedStorageCount: 0,
          clearedTables: {},
          errors: [error instanceof Error ? error.message : String(error)],
        })
      } finally {
        setUploading(false)
      }
    }

    reader.readAsBinaryString(file)
  }

  const [updateResult, setUpdateResult] = useState<{ createdCount: number; updatedCount: number; errors: string[] } | null>(null)

  async function handleUpdate() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setUpdateResult(null)

    const reader = new FileReader()
    reader.onload = async loaded => {
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

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
        if (!employeeId || !fullName || !role) continue
        if (seenIds.has(employeeId)) continue
        seenIds.add(employeeId)
        normalized.push({ employee_id: employeeId, full_name: fullName, role, department, phone, contact_email: contactEmail, is_active: isActive })
      }

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
        setUpdateResult({
          createdCount: payload.createdCount ?? 0,
          updatedCount: payload.updatedCount ?? 0,
          errors: payload.errors ?? [payload.detail ?? payload.error ?? '업데이트 실패'],
        })
        if (response.ok && payload.ok) onDone()
      } catch (error) {
        setUpdateResult({ createdCount: 0, updatedCount: 0, errors: [error instanceof Error ? error.message : String(error)] })
      } finally {
        setUploading(false)
      }
    }
    reader.readAsBinaryString(file)
  }

  const clearedDataCount = Object.values(result?.clearedTables ?? {}).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="mb-1 text-base font-bold text-gray-900">사용자 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          형식: <code className="rounded bg-gray-100 px-1 text-xs">사번 | 이름 | 권한(담당자/승인자/관리자) | e-mail | CP | 관련부서</code>
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
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="form-input text-sm"
              disabled={uploading}
            />
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

function RcmUploadTab({ onDone }: { onDone: () => void }) {
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

      // Build employee_id → profile id map for owner/controller linking
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
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="form-input text-sm"
              disabled={uploading}
            />
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

function PopulationUploadTab({ onDone }: { onDone: () => void }) {
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
      const workbook = XLSX.read(loaded.target?.result, { type: 'binary', cellDates: true })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })
      const errors: string[] = []
      let upserted = 0
      const db = supabase as any

      setProgress({ current: 0, total: rows.length, phase: '기존 데이터 정리 중...' })

      const uniqueKeys = Array.from(
        new Set(
          rows
            .map(row => {
              const controlCode = readText(row, ['통제번호', 'control_code'])
              const department = readText(row, ['관련부서', 'department'])
              return controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
            })
            .filter(Boolean)
        )
      )

      for (let index = 0; index < uniqueKeys.length; index += 100) {
        const { error } = await db.from('population_items').delete().in('unique_key', uniqueKeys.slice(index, index + 100))
        if (error) {
          errors.push(`기존 모집단 삭제 실패: ${error.message}`)
          break
        }
      }

      setProgress({ current: 0, total: rows.length, phase: '모집단 등록 중...' })

      for (let index = 0; index < rows.length; index += 1) {
        if (index % 10 === 0) setProgress({ current: index, total: rows.length, phase: '모집단 등록 중...' })
        const row = rows[index]
        const controlCode = readText(row, ['통제번호', 'control_code'])
        const department = readText(row, ['관련부서', 'department'])
        const uniqueKey = controlCode && department ? `${controlCode}${department}` : readText(row, ['고유키', 'unique_key'])
        if (!uniqueKey) continue

        const sampleId = readText(row, ['Sample ID', 'sample_id'])
        const transactionId = String(row['Transaction ID'] ?? row.transaction_id ?? '').trim() || null
        const transactionDate =
          toDateString(row['거래일'] ?? row.transaction_date) ??
          toDateString(row['Transaction Date'] ?? row.transaction_date)

        const payload = {
          unique_key: uniqueKey,
          control_code: controlCode || null,
          dept_code: readText(row, ['부서코드', 'dept_code']) || null,
          related_dept: department || null,
          sample_id: sampleId ? `${sampleId}__${index + 1}` : `${uniqueKey}__${index + 1}`,
          transaction_id: transactionId,
          transaction_date: transactionDate,
          description: readText(row, ['거래설명', 'description']) || null,
          extra_info: readText(row, ['추가 정보 1', 'extra_info']) || null,
          extra_info_2: readText(row, ['추가 정보 2', 'extra_info_2']) || null,
          extra_info_3: readText(row, ['추가 정보 3', 'extra_info_3']) || null,
          extra_info_4: readText(row, ['추가 정보 4', 'extra_info_4']) || null,
        }

        const { error } = await db.from('population_items').insert(payload)
        if (error) {
          errors.push(`[${sampleId || uniqueKey}] ${error.message}`)
        } else {
          upserted += 1
        }
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
        <h3 className="mb-1 text-base font-bold text-gray-900">모집단 업로드</h3>
        <p className="mb-4 text-sm text-gray-500">
          모집단 파일은 거래 단위 데이터만 다시 적재합니다. 사용자 생성과는 완전히 분리되어 있습니다.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="form-input text-sm"
              disabled={uploading}
            />
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
          title="모집단 업로드 완료"
          stats={[
            { label: '적재된 행', value: result.upserted, color: 'text-emerald-600' },
            { label: '미리보기', value: preview.length, color: 'text-blue-600' },
            { label: '오류', value: result.errors.length, color: 'text-red-500' },
          ]}
          errors={result.errors}
        />
      )}
    </div>
  )
}

function UsersTab({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      const db = supabase as any
      const { data } = await db.from('profiles').select('*').order('role').order('department').order('full_name')
      setUsers(data ?? [])
      setLoading(false)
    }

    load()
  }, [refreshKey])

  async function toggleActive(user: UserRow) {
    const db = supabase as any
    await db.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    setUsers(previous =>
      previous.map(item => (item.id === user.id ? { ...item, is_active: !item.is_active } : item))
    )
  }

  const filtered = users.filter(user => {
    if (!search) return true
    return [user.full_name ?? '', user.email ?? '', user.employee_id ?? '', user.department ?? ''].some(value =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="이름, 사번, 로그인 ID, 소속팀 검색..."
          className="form-input pl-9 text-sm"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-50 px-4 py-3 text-xs text-gray-500">
          총 <b className="text-gray-700">{filtered.length}</b>명
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>로그인 ID</th>
                <th>소속팀</th>
                <th>구분</th>
                <th>초기 비밀번호</th>
                <th>상태</th>
                <th className="text-center">조작</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td className="font-mono text-xs text-gray-600">{user.employee_id ?? '-'}</td>
                  <td className="text-sm font-semibold text-gray-800">{user.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-500">{user.email ?? buildLoginEmail(user.employee_id ?? '')}</td>
                  <td className="text-xs text-gray-600">{user.department ?? '-'}</td>
                  <td>
                    <span className={ROLE_BADGES[user.role] ?? 'badge-gray'}>{ROLE_LABELS[user.role] ?? user.role}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {showPassword[user.id] ? user.initial_password ?? '사용자 변경 또는 미기록' : '••••••'}
                      </code>
                      <button
                        onClick={() => setShowPassword(previous => ({ ...previous, [user.id]: !previous[user.id] }))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {showPassword[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={user.is_active ? 'badge-green' : 'badge-gray'}>
                      {user.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => toggleActive(user)}
                      className={clsx(
                        'rounded-lg px-2 py-1 text-xs transition-all',
                        user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                      )}
                    >
                      {user.is_active ? '비활성화' : '활성화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ActivitiesTab({ refreshKey }: { refreshKey: number }) {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const db = supabase as any
      const { data } = await db
        .from('activities')
        .select('id, control_code, owner_name, department, title, submission_status, controller_name')
        .order('control_code')
        .order('department')
      setActivities(data ?? [])
      setLoading(false)
    }

    load()
  }, [refreshKey])

  async function resetStatus(id: string) {
    const confirmed = window.confirm('이 통제활동의 상신 상태를 미완료로 초기화할까요?')
    if (!confirmed) return

    setProcessing(id)
    const db = supabase as any
    await db.from('activities').update({ submission_status: '미완료' }).eq('id', id)
    setActivities(previous =>
      previous.map(item => (item.id === id ? { ...item, submission_status: '미완료' } : item))
    )
    setProcessing(null)
  }

  const filtered = activities.filter(item => {
    if (!search) return true
    return [item.control_code ?? '', item.owner_name ?? '', item.department ?? '', item.title ?? ''].some(value =>
      value.toLowerCase().includes(search.toLowerCase())
    )
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="통제번호, 담당자, 부서 검색..."
          className="form-input pl-9 text-sm"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-50 px-4 py-3 text-xs text-gray-500">
          총 <b className="text-gray-700">{filtered.length}</b>건
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>통제번호</th>
                <th>담당자</th>
                <th>부서</th>
                <th>통제활동명</th>
                <th>승인자</th>
                <th>상신상태</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{item.control_code ?? '-'}</code>
                  </td>
                  <td className="text-sm font-medium text-gray-800">{item.owner_name ?? '-'}</td>
                  <td className="text-xs text-gray-500">{item.department ?? '-'}</td>
                  <td className="max-w-[220px] truncate text-xs text-gray-600">{item.title ?? '-'}</td>
                  <td className="text-xs text-gray-500">{item.controller_name ?? '-'}</td>
                  <td>
                    <span className={SUBMISSION_BADGES[item.submission_status ?? ''] ?? 'badge-gray'}>
                      {item.submission_status ?? '-'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => resetStatus(item.id)}
                      disabled={processing === item.id || item.submission_status === '미완료'}
                      className="rounded-lg px-2 py-1 text-xs text-orange-600 transition-all hover:bg-orange-50 disabled:opacity-30"
                    >
                      {processing === item.id ? <Loader2 size={11} className="inline animate-spin" /> : '초기화'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilesTab() {
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const db = supabase as any
      const { data } = await db
        .from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, unique_key, uploaded_at, owner:owner_id(full_name)')
        .order('uploaded_at', { ascending: false })
        .limit(500)
      setFiles(data ?? [])
      setLoading(false)
    }

    load()
  }, [])

  async function downloadFile(path: string, name: string) {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 60)
    if (!data?.signedUrl) return
    const anchor = document.createElement('a')
    anchor.href = data.signedUrl
    anchor.download = name
    anchor.click()
  }

  const filtered = files.filter(file => {
    if (!search) return true
    return [
      file.original_file_name ?? file.file_name,
      file.file_name,
      file.unique_key ?? '',
      file.owner?.full_name ?? '',
    ].some(value => value.toLowerCase().includes(search.toLowerCase()))
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="파일명, 고유키, 업로드 사용자 검색..."
          className="form-input pl-9 text-sm"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-50 px-4 py-3 text-xs text-gray-500">
          총 <b className="text-gray-700">{filtered.length}</b>개 파일
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>파일명</th>
                <th>고유키</th>
                <th>업로드 사용자</th>
                <th>업로드일</th>
                <th className="text-center">다운로드</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(file => (
                <tr key={file.id}>
                  <td className="max-w-[320px] truncate text-xs text-gray-700">{file.original_file_name ?? file.file_name}</td>
                  <td className="font-mono text-xs text-gray-500">{file.unique_key ?? '-'}</td>
                  <td className="text-xs text-gray-600">{file.owner?.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-400">
                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => downloadFile(file.file_path, file.original_file_name ?? file.file_name)}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-700 transition-all hover:bg-brand-100"
                    >
                      <Download size={11} />
                      다운로드
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── 알림 발송 탭 ── */

type ProfileOption = { id: string; full_name: string | null; employee_id: string | null; role: string }

function NotificationsTab() {
  const [recipients, setRecipients] = useState<ProfileOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, employee_id, role')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) setRecipients(data as ProfileOption[])
      })
  }, [])

  const filtered = recipients.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (p.full_name ?? '').toLowerCase().includes(q) || (p.employee_id ?? '').includes(q)
    }
    return true
  })

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filtered.map(p => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!title.trim() || selectedIds.size === 0) return
    setSending(true)
    setSentCount(null)

    const { data: { session } } = await supabase.auth.getSession()
    const senderId = session?.user?.id ?? null

    const rows = Array.from(selectedIds).map(recipientId => ({
      recipient_id: recipientId,
      sender_id: senderId,
      title: title.trim(),
      body: body.trim() || null,
      is_read: false,
    }))

    const { error } = await (supabase as any).from('notifications').insert(rows)
    setSending(false)

    if (!error) {
      setSentCount(rows.length)
      setTitle('')
      setBody('')
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-900">알림 메시지 작성</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">제목 *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="form-input"
              placeholder="알림 제목을 입력하세요"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">내용</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="form-input min-h-[80px]"
              placeholder="알림 내용 (선택)"
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-900">수신자 선택</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { value: 'all', label: '전체' },
              { value: 'admin', label: '관리자' },
              { value: 'owner', label: '담당자' },
              { value: 'controller', label: '승인자' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  roleFilter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input pl-8 text-xs"
              placeholder="이름 또는 사번 검색"
            />
          </div>
          <button
            onClick={() => toggleAll(selectedIds.size < filtered.length)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {selectedIds.size >= filtered.length && filtered.length > 0 ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        <p className="mb-2 text-xs text-gray-500">
          {filtered.length}명 중 <strong className="text-brand-700">{selectedIds.size}명</strong> 선택됨
        </p>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
          {filtered.map(p => (
            <label
              key={p.id}
              className={clsx(
                'flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2 transition hover:bg-gray-50',
                selectedIds.has(p.id) && 'bg-brand-50/40'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(p.id)}
                onChange={() => toggleOne(p.id)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-sm text-gray-900">{p.full_name ?? '-'}</span>
              <span className="text-xs text-gray-400">{p.employee_id ?? ''}</span>
              <span className={clsx('badge ml-auto text-[10px]', ROLE_BADGES[p.role] ?? 'badge-gray')}>
                {ROLE_LABELS[p.role] ?? p.role}
              </span>
            </label>
          ))}
        </div>
      </div>

      {sentCount !== null && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={16} /> {sentCount}명에게 알림을 발송했습니다.
          </p>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !title.trim() || selectedIds.size === 0}
        className="btn-primary flex items-center gap-2 disabled:opacity-50"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {sending ? '발송 중...' : `알림 발송 (${selectedIds.size}명)`}
      </button>
    </div>
  )
}

/* ── 강좌 동영상 관리 탭 ── */
type VideoRow = {
  id: string
  title: string
  description: string | null
  youtube_url: string
  youtube_id: string
  thumbnail_url: string | null
  duration: string | null
  has_subtitles: boolean
  sort_order: number
  is_active: boolean
  created_at: string
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function VideosTab() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function fetchVideos() {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('course_videos')
        .select('*')
        .order('created_at', { ascending: false }) as { data: VideoRow[] | null; error: any }
      if (error) {
        setMsg('동영상 목록 로드 실패: ' + error.message)
        setVideos([])
      } else {
        setVideos(data ?? [])
      }
    } catch (e: any) {
      setMsg('동영상 목록 로드 오류: ' + (e.message ?? '알 수 없는 오류'))
      setVideos([])
    }
    setLoading(false)
  }

  useEffect(() => { void fetchVideos() }, [])

  async function addVideo() {
    const ytId = extractYoutubeId(youtubeUrl.trim())
    if (!ytId) { setMsg('올바른 YouTube URL을 입력해주세요.'); return }
    if (!videoTitle.trim()) { setMsg('제목을 입력해주세요.'); return }

    setSaving(true)
    setMsg('')

    const thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    const fullUrl = `https://www.youtube.com/watch?v=${ytId}`

    const { error } = await (supabase as any).from('course_videos').insert({
      title: videoTitle.trim(),
      description: videoDesc.trim() || null,
      youtube_url: fullUrl,
      youtube_id: ytId,
      thumbnail_url: thumbnail,
      is_active: true,
      sort_order: 0,
    })

    if (error) {
      setMsg('저장 실패: ' + error.message)
    } else {
      setMsg('동영상이 추가되었습니다.')
      setYoutubeUrl('')
      setVideoTitle('')
      setVideoDesc('')
      fetchVideos()
    }
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await (supabase as any).from('course_videos').update({ is_active: !current }).eq('id', id)
    fetchVideos()
  }

  async function deleteVideo(id: string) {
    if (!confirm('이 동영상을 삭제하시겠습니까?')) return
    await (supabase as any).from('course_videos').delete().eq('id', id)
    fetchVideos()
  }

  return (
    <div className="space-y-6">
      {/* Add video form */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <PlayCircle size={16} className="text-brand-600" />새 동영상 추가
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label">YouTube URL *</label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="form-input text-sm"
            />
          </div>
          <div>
            <label className="form-label">제목 *</label>
            <input
              type="text"
              value={videoTitle}
              onChange={e => setVideoTitle(e.target.value)}
              placeholder="강좌 제목"
              className="form-input text-sm"
            />
          </div>
        </div>
        <div>
          <label className="form-label">설명 (선택)</label>
          <input
            type="text"
            value={videoDesc}
            onChange={e => setVideoDesc(e.target.value)}
            placeholder="강좌 설명"
            className="form-input text-sm"
          />
        </div>
        {msg && <p className={clsx('text-xs', msg.includes('실패') ? 'text-red-600' : 'text-emerald-600')}>{msg}</p>}
        <button onClick={addVideo} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          동영상 추가
        </button>
        <p className="text-[11px] text-gray-400">
          💡 자막 설정: YouTube Studio → 해당 동영상 → 자막 → 자동 생성 또는 수동 업로드
        </p>
      </div>

      {/* Video list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">등록된 동영상 ({videos.length}개) — 최신순</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">등록된 동영상이 없습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {videos.map(v => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <a href={v.youtube_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <img
                    src={v.thumbnail_url ?? ''}
                    alt={v.title}
                    className="h-16 w-28 rounded-lg object-cover bg-gray-200"
                    onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg` }}
                  />
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{v.title}</p>
                  {v.description && <p className="text-xs text-gray-500 truncate">{v.description}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(v.created_at).toLocaleDateString('ko-KR')}
                    {!v.is_active && <span className="ml-2 text-red-500 font-semibold">비활성</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(v.id, v.is_active)}
                    className={clsx('text-xs px-3 py-1.5 rounded-lg border font-semibold', v.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500')}
                  >
                    {v.is_active ? '활성' : '비활성'}
                  </button>
                  <button
                    onClick={() => deleteVideo(v.id)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
