import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Users, FileSpreadsheet, Database, Shield,
  Upload, Loader2, AlertCircle, CheckCircle2,
  Download, Eye, EyeOff, Search,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

type Tab = 'upload-rcm' | 'upload-population' | 'users' | 'activities' | 'files'

interface UserRow {
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

interface ActivityRow {
  id: string
  control_code: string
  owner_name: string | null
  department: string | null
  title: string | null
  submission_status: string
  controller_name: string | null
  active: boolean
}

const TAB_ITEMS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'upload-rcm',        label: 'RCM 업로드',    icon: FileSpreadsheet },
  { key: 'upload-population', label: '모집단 업로드',  icon: Database },
  { key: 'users',             label: '사용자 관리',    icon: Users },
  { key: 'activities',        label: '통제활동 관리',  icon: Shield },
  { key: 'files',             label: '증빙 다운로드',  icon: Download },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('upload-rcm')
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Shield size={22} className="text-purple-600" />
          관리자
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">시스템 데이터 및 사용자를 관리합니다</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5 overflow-x-auto">
        {TAB_ITEMS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'upload-rcm'        && <RcmUploadTab onDone={refresh} />}
      {tab === 'upload-population' && <PopulationUploadTab onDone={refresh} />}
      {tab === 'users'             && <UsersTab refreshKey={refreshKey} />}
      {tab === 'activities'        && <ActivitiesTab refreshKey={refreshKey} />}
      {tab === 'files'             && <FilesDownloadTab />}
    </div>
  )
}

/* ─── RCM 업로드 탭 ─── */
function RcmUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; phase: string } | null>(null)
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      setPreview(raw.slice(0, 5))
    }
    reader.readAsBinaryString(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async ev => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      let created = 0, updated = 0
      const errors: string[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const colMap: Record<string, string> = {
        '통제번호': 'control_code', '담당자': 'owner_name', '관련부서': 'department',
        '통제활동명': 'title', '제출 증빙에 대한 설명': 'description',
        '승인자': 'controller_name', 'KPI 점수': 'kpi_score', '상신여부': 'submission_status',
        '담당자 사번': 'owner_employee_id', '담당자 mail': 'owner_email',
        '담당자 CP': 'owner_phone', '승인자 사번': 'controller_employee_id',
        '승인자 mail': 'controller_email', '승인자 CP': 'controller_phone',
        '통제부서': 'control_department', '주기': 'cycle',
        '핵심/비핵심': 'key_control_raw', '수동/자동': 'manual_control_raw',
        '배점': 'base_score', '환산점수': 'converted_score',
        '고유키': 'unique_key', '테스트 문서': 'test_document',
      }

      // 1단계: 사용자 일괄 생성
      setProgress({ current: 0, total: rows.length, phase: '사용자 계정 등록 중...' })
      const userMap: Record<string, { name: string; email: string; phone: string; role: 'owner' | 'controller' }> = {}
      for (const row of rows) {
        const ownerEmpId = String(row['담당자 사번'] ?? '').trim()
        if (ownerEmpId) userMap[ownerEmpId] = {
          name: String(row['담당자'] ?? '').trim(),
          email: String(row['담당자 mail'] ?? '').trim(),
          phone: String(row['담당자 CP'] ?? '').trim(),
          role: 'owner'
        }
        const ctrlEmpId = String(row['승인자 사번'] ?? '').trim()
        if (ctrlEmpId) userMap[ctrlEmpId] = {
          name: String(row['승인자'] ?? '').trim(),
          email: String(row['승인자 mail'] ?? '').trim(),
          phone: String(row['승인자 CP'] ?? '').trim(),
          role: 'controller'
        }
      }
      try {
        const { data: bulkResult } = await supabase.functions.invoke('bulk-create-users', {
          body: { users: Object.entries(userMap).map(([empId, u]) => ({
            employee_id: empId, email: u.email || `${empId}@tongyanginc.co.kr`,
            full_name: u.name, phone: u.phone, role: u.role, initial_password: empId,
          })) }
        })
        if (bulkResult) { created += bulkResult.created ?? 0; updated += bulkResult.updated ?? 0 }
      } catch (e) { errors.push(`사용자 생성 오류: ${e}`) }

      // 2단계: activities 저장 (배치 50개셈)
      const BATCH = 50
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        setProgress({ current: i + 1, total: rows.length, phase: `통제활동 등록 중 (${i + 1}/${rows.length})` })
        try {
          const controlCode = String(row['통제번호'] ?? '').trim()
          const dept = String(row['관련부서'] ?? '').trim()
          const uniqueKey = controlCode && dept ? controlCode + dept
            : String(row['고유키'] ?? '').trim()
          if (!uniqueKey) continue

          const actData: Record<string, unknown> = { active: true }
          for (const [excelCol, dbCol] of Object.entries(colMap)) {
            const val = row[excelCol]
            if (dbCol === 'kpi_score' || dbCol === 'base_score' || dbCol === 'converted_score') {
              actData[dbCol] = parseFloat(String(val ?? 0)) || 0
            } else if (dbCol === 'key_control_raw') {
              actData['key_control'] = String(val ?? '').includes('핵심')
            } else if (dbCol === 'manual_control_raw') {
              actData['manual_control'] = String(val ?? '').includes('수동')
            } else if (dbCol === 'submission_status') {
              actData[dbCol] = '미완료'
            } else {
              actData[dbCol] = String(val ?? '').trim() || null
            }
          }
          actData['unique_key'] = uniqueKey

          const { error } = await db.from('activities').upsert(actData, { onConflict: 'unique_key' })
          if (error) errors.push(`[${uniqueKey}] ${error.message}`)
          else created++
        } catch (e) { errors.push(String(e)) }

        // 페이지 렌더링 허용 (50개마다)
        if ((i + 1) % BATCH === 0) await new Promise(r => setTimeout(r, 0))
      }

      setProgress(null)
      setResult({ created, updated, errors })
      setUploading(false)
      onDone()
    }
    reader.readAsBinaryString(file)
  }

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">RCM 증빙 사용자 업로드</h3>
        <p className="text-sm text-gray-500 mb-4">
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">RCM_증빙_사용자_업로드_최종.xlsx</code> 파일을 업로드하면
          사용자(담당자/승인자) 계정이 자동 생성되고 통제활동이 등록됩니다.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-blue-700 mb-2">📋 파일 컴럼 구조</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-blue-600">
            {[
              { col: 'A', label: '통제번호' }, { col: 'B', label: '담당자' },
              { col: 'C', label: '관련부서' }, { col: 'D', label: '통제활동명' },
              { col: 'J', label: '담당자 사번' }, { col: 'K', label: '담당자 mail' },
              { col: 'M', label: '승인자 사번' }, { col: 'V', label: '고유키' },
            ].map(item => (
              <span key={item.col} className="flex items-center gap-1">
                <b className="bg-blue-100 text-blue-800 px-1 rounded font-mono">{item.col}</b>
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept=".xlsx,.xls"
              onChange={handleFileChange} className="form-input text-sm" disabled={uploading} />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '업로드'}
          </button>
        </div>

        {/* 진행바 */}
        {uploading && progress && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{progress.phase}</span>
              <span className="font-semibold text-gray-900">{pct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress.current} / {progress.total} 행 처리됨</p>
          </div>
        )}
      </div>

      {/* 미리보기 */}
      {preview.length > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">파일 미리보기 (상위 5행)</p>
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead><tr>{Object.keys(preview[0]).slice(0, 10).map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>{Object.values(row).slice(0, 10).map((v, j) => (
                    <td key={j} className="truncate max-w-[120px]" title={String(v)}>{String(v)}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className={clsx('card p-5', result.errors.length > 0 ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30')}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length > 0 ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
            <p className="font-bold text-gray-900">업로드 완료</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center"><p className="text-2xl font-black text-emerald-600">{result.created}</p><p className="text-xs text-gray-500">등록/업데이트</p></div>
            <div className="text-center"><p className="text-2xl font-black text-blue-600">{result.updated}</p><p className="text-xs text-gray-500">사용자 생성</p></div>
            <div className="text-center"><p className="text-2xl font-black text-red-500">{result.errors.length}</p><p className="text-xs text-gray-500">오류</p></div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
              {result.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-xs text-red-600 font-mono">{e}</p>
              ))}
              {result.errors.length > 10 && (
                <p className="text-xs text-red-400">...외 {result.errors.length - 10}건 더 있음</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



/* ─── 모집단 업로드 탭 ─── */
function PopulationUploadTab({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<{ upserted: number; errors: string[] } | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[]>([])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      setPreview(raw.slice(0, 5))
    }
    reader.readAsBinaryString(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async ev => {
      // cellDates: true → Excel 날짜 셀을 JS Date 객체로 파싱
      const wb = XLSX.read(ev.target?.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

      let upserted = 0
      const errors: string[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const BATCH = 50

      /** 날짜값을 'YYYY-MM-DD' 문자열로 변환 (Date객체/숫자/문자열 모두 처리) */
      function toDateStr(val: unknown): string | null {
        if (!val) return null

        function formatDateParts(year: number, month: number, day: number): string {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        }

        /** Excel 시리얼 → YYYY-MM-DD */
        function serialToDate(n: number): string | null {
          if (n < 1 || n > 100000) return null
          const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
          return isNaN(d.getTime())
            ? null
            : formatDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
        }

        // JS Date 객체
        if (val instanceof Date) {
          return isNaN(val.getTime())
            ? null
            : formatDateParts(val.getFullYear(), val.getMonth() + 1, val.getDate())
        }
        // 숫자: Excel 시리얼
        if (typeof val === 'number') {
          return serialToDate(Math.floor(val))
        }
        // 문자열
        const s = String(val).trim()
        if (!s) return null
        // 순수 숫자 문자열 → Excel 시리얼로 처리 (new Date("45969") = 연도 45969년 방지)
        if (/^\d+$/.test(s)) {
          return serialToDate(parseInt(s, 10))
        }
        // YYYY-MM-DD 또는 한국어 날짜: 앞 10자만
        const datePart = s.slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart
        }
        return null
      }

      /** 모집단 원문값을 문자열 그대로 보존 */
      function toTextStr(val: unknown): string | null {
        if (val === null || val === undefined) return null
        if (val instanceof Date) {
          return isNaN(val.getTime())
            ? null
            : `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`
        }
        const text = String(val).trim()
        return text || null
      }

      const uniqueKeysToReplace = Array.from(new Set(
        rows.map(row => {
          const controlCode = String(row['통제번호'] ?? '').trim()
          const dept = String(row['관련부서'] ?? '').trim()
          return controlCode && dept
            ? controlCode + dept
            : String(row['고유키'] ?? '').trim()
        }).filter(Boolean)
      ))

      if (uniqueKeysToReplace.length > 0) {
        const DELETE_BATCH = 100
        for (let start = 0; start < uniqueKeysToReplace.length; start += DELETE_BATCH) {
          const deleteBatch = uniqueKeysToReplace.slice(start, start + DELETE_BATCH)
          const { error: deleteError } = await db
            .from('population_items')
            .delete()
            .in('unique_key', deleteBatch)

          if (deleteError) {
            errors.push(`기존 모집단 삭제 실패: ${deleteError.message}`)
            break
          }
        }
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        setProgress({ current: i + 1, total: rows.length })
        try {
          const controlCode = String(row['통제번호'] ?? '').trim()
          const dept = String(row['관련부서'] ?? '').trim()
          const uniqueKey = controlCode && dept ? controlCode + dept
            : String(row['고유키'] ?? '').trim()
          const sampleId = String(row['Sample ID'] ?? '').trim()
          if (!uniqueKey) continue

          const transactionText = toTextStr(row['Transaction ID'])
          const transactionDate = toDateStr(row['거래일']) ?? toDateStr(row['Transaction ID'])
          const stableSampleId = sampleId
            ? `${sampleId}__${i + 1}`
            : `${uniqueKey}__${i + 1}`

          const itemData = {
            unique_key: uniqueKey,
            control_code: controlCode || null,
            dept_code: String(row['부서코드'] ?? '').trim() || null,
            related_dept: dept || null,
            sample_id: stableSampleId,
            // 실제 업로드 파일에서는 날짜가 Transaction ID 컬럼에 들어오는 케이스가 있어
            // 거래일이 비어 있을 때만 날짜형 값으로 보조 해석한다.
            transaction_id: transactionText,
            transaction_date: transactionDate,
            description: String(row['거래설명'] ?? '').trim() || null,
            extra_info: String(row['추가 정보 1'] ?? '').trim() || null,
            extra_info_2: String(row['추가 정보 2'] ?? '').trim() || null,
            extra_info_3: String(row['추가 정보 3'] ?? '').trim() || null,
            extra_info_4: String(row['추가 정보 4'] ?? '').trim() || null,
          }
          const { error } = await db.from('population_items').insert(itemData)
          if (error) {
            // 오류 시 전송값 포함 (디버깅)
            errors.push(`[${sampleId || uniqueKey}] ${error.message} (TID=${JSON.stringify(transactionText)} TDATE=${JSON.stringify(transactionDate)})`)
          }
          else upserted++
        } catch (e) { errors.push(String(e)) }

        if ((i + 1) % BATCH === 0) await new Promise(r => setTimeout(r, 0))
      }

      setProgress(null)
      setResult({ upserted, errors })
      setUploading(false)
      onDone()
    }
    reader.readAsBinaryString(file)
  }

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">모집단 데이터 업로드</h3>
        <p className="text-sm text-gray-500 mb-4">
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">모집단_업로드_최종_Final.xlsx</code> 파일을 업로드합니다.
          M열 고유키와 RCM의 V열 고유키가 자동으로 매핑됩니다.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-blue-700 mb-2">📋 파일 컴럼 구조</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-blue-600">
            {[
              { col: 'A', label: '통제번호' }, { col: 'C', label: '부서코드' },
              { col: 'D', label: '관련부서' }, { col: 'E', label: 'Sample ID' },
              { col: 'F', label: 'Transaction ID' }, { col: 'G', label: '거래일' },
              { col: 'H', label: '거래설명' }, { col: 'L', label: '고유키' },
            ].map(item => (
              <span key={item.col} className="flex items-center gap-1">
                <b className="bg-blue-100 text-blue-800 px-1 rounded font-mono">{item.col}</b>
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input ref={fileRef} type="file" accept=".xlsx,.xls"
              onChange={handleFileChange} className="form-input text-sm" disabled={uploading} />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary shrink-0">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? '처리 중...' : '업로드'}
          </button>
        </div>

        {/* 진행바 */}
        {uploading && progress && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>모집단 데이터 등록 중...</span>
              <span className="font-semibold text-gray-900">{pct}%</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{progress.current.toLocaleString()} / {progress.total.toLocaleString()} 행 처리됨</p>
          </div>
        )}
      </div>

      {preview.length > 0 && (
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">파일 미리보기</p>
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead><tr>{Object.keys(preview[0]).slice(0, 10).map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>{Object.values(row).slice(0, 10).map((v, j) => (
                    <td key={j} className="truncate max-w-[120px]" title={String(v)}>{String(v)}</td>
                  ))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={clsx('card p-5', result.errors.length > 0 ? 'border-amber-100 bg-amber-50/30' : 'border-emerald-100 bg-emerald-50/30')}>
          <div className="flex items-center gap-2 mb-3">
            {result.errors.length > 0 ? <AlertCircle size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-600" />}
            <p className="font-bold text-gray-900">업로드 완료</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center"><p className="text-2xl font-black text-emerald-600">{result.upserted.toLocaleString()}</p><p className="text-xs text-gray-500">등록 성공</p></div>
            <div className="text-center"><p className="text-2xl font-black text-red-500">{result.errors.length.toLocaleString()}</p><p className="text-xs text-gray-500">오류</p></div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-red-700 mb-1">오류 상세 (첫 10건):</p>
              {result.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-xs text-red-600 font-mono break-all">{e}</p>
              ))}
              {result.errors.length > 10 && (
                <p className="text-xs text-red-400">...외 {result.errors.length - 10}건 더</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}



/* ─── 사용자 관리 탭 ─── */
function UsersTab({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db.from('profiles').select('*').order('role').order('department').order('full_name')
      setUsers(data ?? [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const filtered = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.employee_id?.toLowerCase().includes(s) ||
      u.department?.toLowerCase().includes(s)
    )
  })

  const ROLE_KO: Record<string, string> = { admin: '관리자', controller: '통제책임자', owner: '담당자' }
  const ROLE_CLS: Record<string, string> = { admin: 'badge-purple', controller: 'badge-blue', owner: 'badge-green' }

  async function toggleActive(user: UserRow) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u))
  }

  function downloadUsersCSV() {
    const headers = ['사번', '이름', '이메일', '부서', '역할', '초기비밀번호', '활성여부', '등록일']
    const rows = filtered.map(u => [
      u.employee_id ?? '', u.full_name ?? '', u.email, u.department ?? '',
      ROLE_KO[u.role] ?? u.role, u.initial_password ?? u.employee_id ?? '',
      u.is_active ? '활성' : '비활성', u.created_at.slice(0, 10)
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = '사용자목록.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 사번, 이메일, 부서 검색..." className="form-input pl-9 text-sm" />
        </div>
        <button onClick={downloadUsersCSV} className="btn-secondary text-xs px-3 py-2">
          <Download size={14} />사용자 목록 다운로드
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex justify-between text-xs text-gray-500">
          <span>총 <b className="text-gray-700">{filtered.length}</b>명</span>
          <span>관리자 {users.filter(u=>u.role==='admin').length} | 통제책임자 {users.filter(u=>u.role==='controller').length} | 담당자 {users.filter(u=>u.role==='owner').length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>사번</th><th>이름</th><th>이메일</th><th>부서</th>
                <th>역할</th><th>초기 비밀번호</th><th>상태</th><th className="text-center">조작</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td className="font-mono text-xs text-gray-600">{user.employee_id ?? '-'}</td>
                  <td className="font-semibold text-sm text-gray-800">{user.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-500">{user.email}</td>
                  <td className="text-xs text-gray-600">{user.department ?? '-'}</td>
                  <td><span className={ROLE_CLS[user.role] ?? 'badge-gray'}>{ROLE_KO[user.role] ?? user.role}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {showPw[user.id] ? (user.initial_password ?? user.employee_id ?? '***') : '••••••'}
                      </code>
                      <button onClick={() => setShowPw(p => ({ ...p, [user.id]: !p[user.id] }))}
                        className="text-gray-400 hover:text-gray-600">
                        {showPw[user.id] ? <EyeOff size={12} /> : <Eye size={12} />}
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
                      className={clsx('text-xs px-2 py-1 rounded-lg transition-all',
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

/* ─── 통제활동 관리 탭 ─── */
function ActivitiesTab({ refreshKey }: { refreshKey: number }) {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db.from('activities').select('id, control_code, owner_name, department, title, submission_status, controller_name, active')
        .order('control_code').order('department')
      setActivities(data ?? [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const filtered = activities.filter(a => {
    if (!search) return true
    const s = search.toLowerCase()
    return a.control_code?.toLowerCase().includes(s) || a.owner_name?.toLowerCase().includes(s) || a.department?.toLowerCase().includes(s) || a.title?.toLowerCase().includes(s)
  })

  async function resetStatus(id: string) {
    if (!confirm('이 통제활동의 상신여부를 미완료로 초기화하시겠습니까?')) return
    setProcessing(id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('activities').update({ submission_status: '미완료' }).eq('id', id)
    setActivities(prev => prev.map(a => a.id === id ? { ...a, submission_status: '미완료' } : a))
    setProcessing(null)
  }

  const STATUS_MAP: Record<string, string> = { '미완료': 'badge-yellow', '완료': 'badge-blue', '승인': 'badge-green', '반려': 'badge-red' }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="통제번호, 담당자, 부서 검색..." className="form-input pl-9 text-sm" />
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 text-xs text-gray-500">
          총 <b className="text-gray-700">{filtered.length}</b>건
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>통제번호</th><th>담당자</th><th>부서</th><th>통제활동명</th>
                <th>승인자</th><th>상신여부</th><th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td><code className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{a.control_code}</code></td>
                  <td className="text-sm font-medium text-gray-800">{a.owner_name ?? '-'}</td>
                  <td className="text-xs text-gray-500">{a.department ?? '-'}</td>
                  <td className="text-xs text-gray-600 max-w-[200px] truncate" title={a.title ?? ''}>{a.title ?? '-'}</td>
                  <td className="text-xs text-gray-500">{a.controller_name ?? '-'}</td>
                  <td><span className={STATUS_MAP[a.submission_status] ?? 'badge-gray'}>{a.submission_status}</span></td>
                  <td className="text-center">
                    <button
                      onClick={() => resetStatus(a.id)}
                      disabled={processing === a.id || a.submission_status === '미완료'}
                      className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-all disabled:opacity-30"
                    >
                      {processing === a.id ? <Loader2 size={11} className="animate-spin inline" /> : '초기화'}
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

/* ─── 증빙 다운로드 탭 ─── */
export function FilesTab() {
  const [files, setFiles] = useState<{
    id: string
    file_name: string
    original_file_name?: string | null
    file_path: string
    unique_key: string | null
    uploaded_at: string | null
    owner?: { full_name: string | null }
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db.from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, unique_key, uploaded_at, owner:owner_id(full_name)')
        .order('uploaded_at', { ascending: false })
        .limit(500)
      setFiles(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = files.filter(file => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (file.original_file_name ?? file.file_name).toLowerCase().includes(s) ||
      file.file_name.toLowerCase().includes(s) ||
      (file.unique_key ?? '').toLowerCase().includes(s)
    )
  })

  async function downloadFile(path: string, name: string) {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 60)
    if (!data?.signedUrl) return

    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = name
    a.click()
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="파일명, 고유키 검색..." className="form-input pl-9 text-sm" />
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 text-xs text-gray-500">총 <b className="text-gray-700">{filtered.length}</b>개 파일</div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>파일명</th><th>고유키</th><th>담당자</th><th>업로드일</th><th className="text-center">다운로드</th></tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td className="text-xs text-gray-700 max-w-[250px] truncate" title={f.file_name}>{f.file_name}</td>
                  <td className="text-xs text-gray-500 font-mono">{f.unique_key ?? '-'}</td>
                  <td className="text-xs text-gray-600">{f.owner?.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-400">{f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('ko-KR') : '-'}</td>
                  <td className="text-center">
                    <button onClick={() => downloadFile(f.file_path, f.file_name)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs hover:bg-brand-100 transition-all">
                      <Download size={11} />다운로드
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

function FilesDownloadTab() {
  const [files, setFiles] = useState<{
    id: string
    file_name: string
    original_file_name?: string | null
    file_path: string
    unique_key: string | null
    uploaded_at: string | null
    owner?: { full_name: string | null }
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any
      const { data } = await db.from('evidence_uploads')
        .select('id, file_name, original_file_name, file_path, unique_key, uploaded_at, owner:owner_id(full_name)')
        .order('uploaded_at', { ascending: false })
        .limit(500)
      setFiles(data ?? [])
      setLoading(false)
    }

    load()
  }, [])

  const ownerOptions = Array.from(
    new Set(
      files
        .map(file => file.owner?.full_name)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => a.localeCompare(b, 'ko'))

  const filtered = files.filter(file => {
    const ownerName = file.owner?.full_name ?? ''
    const displayName = file.original_file_name ?? file.file_name
    const uploadedDate = file.uploaded_at ? file.uploaded_at.slice(0, 10) : ''

    const matchesSearch = !search || [
      displayName,
      file.file_name,
      file.unique_key ?? '',
      ownerName,
    ].some(value => value.toLowerCase().includes(search.toLowerCase()))

    const matchesOwner = ownerFilter === 'all' || ownerName === ownerFilter
    const matchesFrom = !dateFrom || (uploadedDate && uploadedDate >= dateFrom)
    const matchesTo = !dateTo || (uploadedDate && uploadedDate <= dateTo)

    return matchesSearch && matchesOwner && matchesFrom && matchesTo
  })

  const allVisibleSelected = filtered.length > 0 && filtered.every(file => selectedIds.includes(file.id))

  function toggleSelected(fileId: string) {
    setSelectedIds(previous =>
      previous.includes(fileId)
        ? previous.filter(id => id !== fileId)
        : [...previous, fileId]
    )
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds(previous => previous.filter(id => !filtered.some(file => file.id === id)))
      return
    }

    setSelectedIds(previous => Array.from(new Set([...previous, ...filtered.map(file => file.id)])))
  }

  async function downloadFile(path: string, name: string) {
    const { data } = await (supabase.storage as any).from('evidence').createSignedUrl(path, 60)
    if (!data?.signedUrl) return

    const anchor = document.createElement('a')
    anchor.href = data.signedUrl
    anchor.download = name
    anchor.click()
  }

  async function bulkDownload(targetFiles: typeof files) {
    if (targetFiles.length === 0) return

    setDownloading(true)
    try {
      for (const file of targetFiles) {
        await downloadFile(file.file_path, file.original_file_name ?? file.file_name)
        await new Promise(resolve => window.setTimeout(resolve, 150))
      }
    } finally {
      setDownloading(false)
    }
  }

  function resetFilters() {
    setSearch('')
    setOwnerFilter('all')
    setDateFrom('')
    setDateTo('')
    setSelectedIds([])
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_220px_160px_160px_auto] gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="파일명, 고유키, 업로드자 검색..."
            className="form-input pl-9 text-sm"
          />
        </div>

        <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="form-input text-sm">
          <option value="all">전체 업로드자</option>
          {ownerOptions.map(owner => (
            <option key={owner} value={owner}>{owner}</option>
          ))}
        </select>

        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-sm" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-sm" />

        <button onClick={resetFilters} className="btn-secondary text-xs px-3 py-2">
          필터 초기화
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          필터 결과 <b className="text-gray-900">{filtered.length.toLocaleString()}</b>건
          <span className="mx-2 text-gray-300">|</span>
          선택 <b className="text-gray-900">{selectedIds.length.toLocaleString()}</b>건
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => bulkDownload(filtered)}
            disabled={downloading || filtered.length === 0}
            className="btn-secondary text-xs px-3 py-2 disabled:opacity-40"
          >
            <Download size={14} />
            필터 결과 일괄 다운로드
          </button>

          <button
            onClick={() => bulkDownload(filtered.filter(file => selectedIds.includes(file.id)))}
            disabled={downloading || selectedIds.length === 0}
            className="btn-primary text-xs px-3 py-2 disabled:opacity-40"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            선택 다운로드
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>총 <b className="text-gray-700">{filtered.length.toLocaleString()}</b>개 파일</span>
          <label className="inline-flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="rounded border-gray-300"
            />
            현재 필터 결과 전체 선택
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 text-center">선택</th>
                <th>파일명</th>
                <th>고유키</th>
                <th>업로드자</th>
                <th>업로드일</th>
                <th className="text-center">다운로드</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(file => (
                <tr key={file.id}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(file.id)}
                      onChange={() => toggleSelected(file.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="text-xs text-gray-700 max-w-[320px] truncate" title={file.original_file_name ?? file.file_name}>
                    {file.original_file_name ?? file.file_name}
                  </td>
                  <td className="text-xs text-gray-500 font-mono">{file.unique_key ?? '-'}</td>
                  <td className="text-xs text-gray-600">{file.owner?.full_name ?? '-'}</td>
                  <td className="text-xs text-gray-400">
                    {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="text-center">
                    <button
                      onClick={() => downloadFile(file.file_path, file.original_file_name ?? file.file_name)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs hover:bg-brand-100 transition-all"
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
