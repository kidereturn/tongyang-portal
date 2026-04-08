import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Users, Activity, Shield, UserCheck, UserX, Database,
  Plus, Loader2, AlertCircle, CheckCircle2, Pencil, X,
  Upload, FileSpreadsheet, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

type Tab = 'users' | 'activities' | 'upload' | 'population'

interface UserRow {
  id: string; email: string; full_name: string | null
  department: string | null; role: string; is_active: boolean; created_at: string
}
interface ActivityRow {
  id: string; control_code: string; title: string
  department: string | null; active: boolean
  owner: { full_name: string | null } | null
  controller: { full_name: string | null } | null
}
interface ParsedUser {
  email: string; full_name: string; employee_id: string
  role: 'owner' | 'controller'; department: string; password: string
}
interface ParsedActivity {
  unique_key: string; control_code: string; title: string; department: string
  owner_employee_id: string; controller_employee_id: string
  description: string; cycle: string
}
interface PopItem {
  unique_key: string; control_code: string; transaction_id: string
  transaction_date: string | null; description: string; extra_info: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자', controller: '통제책임자', owner: '담당자',
}
const DOMAIN = '@tongyanginc.co.kr'

// Excel 날짜 숫자 → ISO 문자열
function excelDateToISO(n: number): string | null {
  if (!n || typeof n !== 'number') return null
  const d = new Date((n - 25569) * 86400 * 1000)
  return d.toISOString().slice(0, 10)
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [users, setUsers] = useState<UserRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(''); const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ control_code: '', title: '', department: '' })
  const [saving, setSaving] = useState(false)

  // 일괄 등록 (사용자)
  const fileRef1 = useRef<HTMLInputElement>(null)
  const [isDrag1, setIsDrag1] = useState(false)
  const [fileName1, setFileName1] = useState('')
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([])
  const [parsedActs, setParsedActs] = useState<ParsedActivity[]>([])
  const [uploading1, setUploading1] = useState(false)
  const [uploadResult, setUploadResult] = useState<null | { created: number; updated: number; skipped: number; errors: number; activities: number }>(null)

  // 모집단
  const fileRef2 = useRef<HTMLInputElement>(null)
  const [isDrag2, setIsDrag2] = useState(false)
  const [fileName2, setFileName2] = useState('')
  const [popItems, setPopItems] = useState<PopItem[]>([])
  const [uploading2, setUploading2] = useState(false)
  const [popResult, setPopResult] = useState<null | { inserted: number; errors: number }>(null)

  useEffect(() => {
    if (tab === 'upload' || tab === 'population') return
    fetchData()
  }, [tab])

  async function fetchData() {
    setLoading(true); setMsg(''); setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    if (tab === 'users') {
      const { data } = await db.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data ?? [])
    } else {
      const { data } = await db.from('activities').select(`
        id, control_code, title, department, active,
        owner:profiles!activities_owner_id_fkey(full_name),
        controller:profiles!activities_controller_id_fkey(full_name)
      `).order('control_code')
      setActivities(data ?? [])
    }
    setLoading(false)
  }

  async function toggleActive(userId: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('profiles').update({ is_active: !current }).eq('id', userId)
    if (error) { setError(error.message); return }
    setMsg(!current ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.'); fetchData()
  }

  async function changeRole(userId: string, role: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('profiles').update({ role }).eq('id', userId)
    if (error) { setError(error.message); return }
    setMsg('역할이 변경되었습니다.'); fetchData()
  }

  async function addActivity() {
    if (!formData.control_code || !formData.title) { setError('통제 코드와 활동명은 필수입니다.'); return }
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('activities').insert({
      control_code: formData.control_code, title: formData.title,
      department: formData.department || null, active: true,
    })
    if (error) setError(error.message)
    else { setMsg('활동이 추가되었습니다.'); setFormData({ control_code: '', title: '', department: '' }); setShowForm(false); fetchData() }
    setSaving(false)
  }

  async function toggleActivityActive(id: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activities').update({ active: !current }).eq('id', id); fetchData()
  }

  // ── Excel 파싱: 사용자 양식 ──────────────────────────────────
  function parseUserExcel(file: File) {
    setFileName1(file.name); setParsedUsers([]); setParsedActs([]); setUploadResult(null)
    const isDamdan = file.name.includes('담당자')
    const isCtrl   = file.name.includes('통제자')
    if (!isDamdan && !isCtrl) { setError('파일명에 "담당자양식" 또는 "통제자양식"이 포함되어야 합니다.'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]
        const userMap = new Map<string, ParsedUser>()
        const actMap  = new Map<string, ParsedActivity>()
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i]
          if (!r[1]) continue
          if (isDamdan) {
            // [0]고유키 [1]담당자사번 [2]관련부서 [3]통제번호 [4]통제활동명 [5]설명 [7]승인자사번 [16]주기
            const uid = String(r[0] ?? '').trim()
            const ownerEid = String(r[1] ?? '').trim()
            const dept = String(r[2] ?? '').trim()
            const code = String(r[3] ?? '').trim()
            const title = String(r[4] ?? '').trim()
            const desc = String(r[5] ?? '').trim()
            const ctrlEid = String(r[7] ?? '').trim()
            const cycle = String(r[16] ?? '').trim()
            if (ownerEid && !userMap.has(ownerEid)) {
              userMap.set(ownerEid, { email: `${ownerEid}${DOMAIN}`, full_name: '', employee_id: ownerEid, role: 'owner', department: dept, password: ownerEid })
            }
            if (uid && code && title) actMap.set(uid, { unique_key: uid, control_code: code, title, department: dept, owner_employee_id: ownerEid, controller_employee_id: ctrlEid, description: desc, cycle })
          } else {
            // [0]고유키 [1]승인자사번 [2]담당자사번 [3]관련부서 [4]통제번호 [5]통제활동명 [6]설명 [14]승인자명 [15]승인자이메일 [17]주기
            const uid = String(r[0] ?? '').trim()
            const ctrlEid = String(r[1] ?? '').trim()
            const ownerEid = String(r[2] ?? '').trim()
            const dept = String(r[3] ?? '').trim()
            const code = String(r[4] ?? '').trim()
            const title = String(r[5] ?? '').trim()
            const desc = String(r[6] ?? '').trim()
            const ctrlName = String(r[14] ?? '').trim()
            const ctrlEmail = String(r[15] ?? '').trim()
            const cycle = String(r[17] ?? '').trim()
            if (ctrlEid && !userMap.has(ctrlEid)) {
              userMap.set(ctrlEid, { email: ctrlEmail || `${ctrlEid}${DOMAIN}`, full_name: ctrlName, employee_id: ctrlEid, role: 'controller', department: dept, password: ctrlEid })
            }
            if (uid && code && title) actMap.set(uid, { unique_key: uid, control_code: code, title, department: dept, owner_employee_id: ownerEid, controller_employee_id: ctrlEid, description: desc, cycle })
          }
        }
        setParsedUsers([...userMap.values()])
        setParsedActs([...actMap.values()])
      } catch (err) { setError('파싱 실패: ' + String(err)) }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleUserUpload() {
    if (!parsedUsers.length) { setError('등록할 사용자가 없습니다.'); return }
    setUploading1(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setError('로그인이 필요합니다.'); setUploading1(false); return }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const res = await fetch(`${supabaseUrl}/functions/v1/bulk-create-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ users: parsedUsers, activities: parsedActs }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? '서버 오류'); setUploading1(false); return }
    setUploadResult(json.summary)
    setMsg(`완료: 신규 ${json.summary.created}명, 업데이트 ${json.summary.updated}명, 스킵 ${json.summary.skipped}명, 활동 ${json.summary.activities}건`)
    setUploading1(false)
  }

  // ── Excel 파싱: 모집단 ──────────────────────────────────────
  function parsePopExcel(file: File) {
    setFileName2(file.name); setPopItems([]); setPopResult(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const items: PopItem[] = []
        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][]
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i] as string[]
            if (!r[0]) continue
            items.push({
              unique_key:       String(r[0] ?? '').trim(),
              control_code:     sheetName.trim(),
              transaction_id:   String(r[1] ?? '').trim(),
              transaction_date: typeof r[2] === 'number' ? excelDateToISO(r[2] as number) : null,
              description:      String(r[3] ?? '').trim(),
              extra_info:       String(r[4] ?? '').trim(),
            })
          }
        }
        setPopItems(items)
      } catch (err) { setError('모집단 파싱 실패: ' + String(err)) }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handlePopUpload() {
    if (!popItems.length) { setError('등록할 모집단 데이터가 없습니다.'); return }
    setUploading2(true); setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const BATCH = 100
    let inserted = 0; let errors = 0
    for (let i = 0; i < popItems.length; i += BATCH) {
      const batch = popItems.slice(i, i + BATCH)
      const { error } = await db.from('population_items').upsert(
        batch.map(it => ({
          unique_key: it.unique_key, control_code: it.control_code,
          transaction_id: it.transaction_id || null,
          transaction_date: it.transaction_date || null,
          description: it.description || null,
          extra_info: it.extra_info || null,
        })),
        { onConflict: 'unique_key,transaction_id' }
      )
      if (error) errors += batch.length
      else inserted += batch.length
    }
    setPopResult({ inserted, errors })
    setMsg(`모집단 등록 완료: ${inserted}건 / 오류: ${errors}건`)
    setUploading2(false)
  }

  // ── JSX ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">관리자</h1>
          <p className="text-slate-400 text-sm mt-0.5">사용자 및 통제 활동 관리</p>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 bg-green-950/50 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0" /><span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {([
          ['users',      '사용자 관리', Users],
          ['activities', '통제 활동',   Activity],
          ['upload',     '사용자 일괄 등록', Upload],
          ['population', '모집단 업로드',    Database],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px shrink-0',
              tab === key ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          탭 1: 사용자 관리
      ═══════════════════════════════════════════════ */}
      {tab === 'users' && (
        loading ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {users.length === 0 && <EmptyState text="등록된 사용자가 없습니다" />}
            {users.map(u => (
              <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 bg-brand-800 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-brand-200 text-sm font-bold">{u.full_name?.charAt(0) ?? '?'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium">{u.full_name ?? '-'}</p>
                    {!u.is_active && <span className="text-xs text-red-400 bg-red-950/50 border border-red-800 px-2 py-0.5 rounded-full">비활성</span>}
                  </div>
                  <p className="text-slate-500 text-xs">{u.email} · {u.department ?? '-'}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg pl-2 pr-6 py-1.5 outline-none focus:border-brand-500 cursor-pointer"
                    >
                      {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                  <button onClick={() => toggleActive(u.id, u.is_active)}
                    className={clsx('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                      u.is_active ? 'text-red-400 border-red-900 hover:bg-red-950/50' : 'text-green-400 border-green-900 hover:bg-green-950/50'
                    )}
                  >
                    {u.is_active ? <><UserX size={13} />비활성화</> : <><UserCheck size={13} />활성화</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════
          탭 2: 통제 활동
      ═══════════════════════════════════════════════ */}
      {tab === 'activities' && (
        loading ? <LoadingSpinner /> : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all"
              >
                <Plus size={16} />활동 추가
              </button>
            </div>
            {showForm && (
              <div className="bg-slate-900 border border-brand-800 rounded-xl p-5 space-y-4">
                <p className="text-white text-sm font-medium">새 통제 활동 추가</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">통제 코드 *</label>
                    <input value={formData.control_code} onChange={e => setFormData(p => ({ ...p, control_code: e.target.value }))} placeholder="CO1.01.W1.C1"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">활동명 *</label>
                    <input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="활동명"
                      className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">부서</label>
                  <input value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} placeholder="부서명"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addActivity} disabled={saving}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}추가
                  </button>
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm rounded-lg">취소</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {activities.length === 0 && <EmptyState text="등록된 활동이 없습니다" />}
              {activities.map(a => (
                <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-brand-400 bg-brand-950/50 border border-brand-900 px-2 py-0.5 rounded shrink-0">{a.control_code}</span>
                      <p className="text-white text-sm font-medium">{a.title}</p>
                      {!a.active && <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">비활성</span>}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{a.department ?? '부서 미지정'} · 담당: {a.owner?.full_name ?? '미지정'} · 통제: {a.controller?.full_name ?? '미지정'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-slate-500 hover:text-brand-400"><Pencil size={14} /></button>
                    <button onClick={() => toggleActivityActive(a.id, a.active)}
                      className={clsx('text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                        a.active ? 'text-slate-400 border-slate-700 hover:border-red-800 hover:text-red-400' : 'text-green-400 border-green-900 hover:bg-green-950/50'
                      )}
                    >
                      {a.active ? '비활성화' : '활성화'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════
          탭 3: 사용자 일괄 등록
      ═══════════════════════════════════════════════ */}
      {tab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400 space-y-2">
            <p className="text-white font-medium flex items-center gap-2"><FileSpreadsheet size={16} className="text-brand-400" />Excel 사용자 일괄 등록</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-yellow-400">담당자양식.xlsx</span> → 담당자(증빙담당자) 계정 생성, 초기 비밀번호 = 사번</li>
              <li><span className="text-brand-400">통제자양식.xlsx</span> → 통제책임자 계정 생성, 이름·이메일 자동 적용</li>
              <li>이미 등록된 사번은 역할·부서만 업데이트됩니다</li>
            </ul>
          </div>

          {/* 드롭존 */}
          <DropZone
            isDrag={isDrag1} label={fileName1 || '담당자양식.xlsx 또는 통제자양식.xlsx'}
            onDragOver={e => { e.preventDefault(); setIsDrag1(true) }}
            onDragLeave={() => setIsDrag1(false)}
            onDrop={e => { e.preventDefault(); setIsDrag1(false); const f = e.dataTransfer.files[0]; if (f) parseUserExcel(f) }}
            onClick={() => fileRef1.current?.click()}
          />
          <input ref={fileRef1} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseUserExcel(f) }} />

          {parsedUsers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-white text-sm font-medium">
                  미리보기 — 사용자 <span className="text-brand-400">{parsedUsers.length}</span>명 · 활동 <span className="text-brand-400">{parsedActs.length}</span>건
                </p>
                <button onClick={handleUserUpload} disabled={uploading1}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
                >
                  {uploading1 ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading1 ? '등록 중...' : `${parsedUsers.length}명 등록`}
                </button>
              </div>
              {uploadResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[['신규', uploadResult.created, 'text-green-400'],['업데이트', uploadResult.updated, 'text-brand-400'],['스킵', uploadResult.skipped, 'text-yellow-400'],['오류', uploadResult.errors, 'text-red-400']].map(([l,v,c]) => (
                    <div key={String(l)} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                      <p className={`text-2xl font-bold ${c}`}>{v}</p>
                      <p className="text-slate-500 text-xs mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['사번','이름','이메일','부서','역할','초기비밀번호'].map(h => (
                          <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedUsers.slice(0, 50).map((u, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{u.employee_id}</td>
                          <td className="px-4 py-2.5 text-slate-300">{u.full_name || <span className="text-slate-600">-</span>}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{u.email}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[120px] truncate">{u.department}</td>
                          <td className="px-4 py-2.5">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                              u.role === 'controller' ? 'text-brand-400 border-brand-900 bg-brand-950/50' : 'text-yellow-400 border-yellow-900 bg-yellow-950/50'
                            )}>{ROLE_LABELS[u.role]}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{u.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedUsers.length > 50 && <p className="text-center text-slate-600 text-xs py-3">... 외 {parsedUsers.length - 50}명 (미리보기 50개 제한)</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          탭 4: 모집단 업로드
      ═══════════════════════════════════════════════ */}
      {tab === 'population' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm text-slate-400 space-y-2">
            <p className="text-white font-medium flex items-center gap-2"><Database size={16} className="text-brand-400" />모집단 업로드</p>
            <ul className="list-disc list-inside space-y-1">
              <li>모집단.xlsx를 업로드하면 각 거래 건이 DB에 저장됩니다</li>
              <li>시트명 = 통제번호, <span className="text-yellow-400">고유키</span>는 담당자/통제자 양식의 고유키와 자동 연결됩니다</li>
              <li>담당자는 자신의 고유키에 해당하는 거래 건들을 보고 증빙을 업로드하게 됩니다</li>
              <li>이미 등록된 데이터는 업데이트됩니다</li>
            </ul>
          </div>

          <DropZone
            isDrag={isDrag2} label={fileName2 || '모집단.xlsx'}
            onDragOver={e => { e.preventDefault(); setIsDrag2(true) }}
            onDragLeave={() => setIsDrag2(false)}
            onDrop={e => { e.preventDefault(); setIsDrag2(false); const f = e.dataTransfer.files[0]; if (f) parsePopExcel(f) }}
            onClick={() => fileRef2.current?.click()}
          />
          <input ref={fileRef2} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parsePopExcel(f) }} />

          {popItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-white text-sm font-medium">
                  미리보기 — <span className="text-brand-400">{popItems.length}</span>건
                </p>
                <button onClick={handlePopUpload} disabled={uploading2}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
                >
                  {uploading2 ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading2 ? '저장 중...' : `${popItems.length}건 저장`}
                </button>
              </div>
              {popResult && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{popResult.inserted}</p>
                    <p className="text-slate-500 text-xs mt-1">저장 완료</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{popResult.errors}</p>
                    <p className="text-slate-500 text-xs mt-1">오류</p>
                  </div>
                </div>
              )}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['고유키','통제번호','Transaction ID','거래일','거래설명'].map(h => (
                          <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {popItems.slice(0, 50).map((it, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[160px] truncate">{it.unique_key}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-brand-400">{it.control_code}</td>
                          <td className="px-4 py-2.5 text-slate-300 text-xs">{it.transaction_id}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">{it.transaction_date ?? '-'}</td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[200px] truncate">{it.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {popItems.length > 50 && <p className="text-center text-slate-600 text-xs py-3">... 외 {popItems.length - 50}건</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 공통 컴포넌트 ────────────────────────────────────────────
function LoadingSpinner() {
  return <div className="flex justify-center py-16"><Loader2 size={28} className="text-brand-500 animate-spin" /></div>
}
function EmptyState({ text }: { text: string }) {
  return <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center"><p className="text-slate-500 text-sm">{text}</p></div>
}
function DropZone({ isDrag, label, onDragOver, onDragLeave, onDrop, onClick }: {
  isDrag: boolean; label: string
  onDragOver: React.DragEventHandler; onDragLeave: React.DragEventHandler
  onDrop: React.DragEventHandler; onClick: () => void
}) {
  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} onClick={onClick}
      className={clsx('border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
        isDrag ? 'border-brand-500 bg-brand-950/30' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-900/50'
      )}
    >
      <FileSpreadsheet size={36} className="mx-auto mb-3 text-slate-500" />
      <p className="text-slate-300 text-sm font-medium">{label}</p>
      <p className="text-slate-600 text-xs mt-1">끌어다 놓거나 클릭하여 선택</p>
    </div>
  )
}
