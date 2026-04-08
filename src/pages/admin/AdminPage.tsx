import { useEffect, useState } from 'react'
import {
  Users, Activity, Shield, UserCheck, UserX,
  Plus, Loader2, AlertCircle, CheckCircle2, Pencil, X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import clsx from 'clsx'

type Tab = 'users' | 'activities'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  department: string | null
  role: string
  is_active: boolean
  created_at: string
}

interface ActivityRow {
  id: string
  control_code: string
  title: string
  department: string | null
  active: boolean
  owner: { full_name: string | null } | null
  controller: { full_name: string | null } | null
}

const ROLE_LABELS: Record<string, string> = {
  admin:      '관리자',
  controller: '통제책임자',
  owner:      '증빙담당자',
}

export default function AdminPage() {
  const [tab,        setTab]        = useState<Tab>('users')
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [msg,        setMsg]        = useState('')
  const [error,      setError]      = useState('')

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ control_code: '', title: '', department: '' })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => { fetchData() }, [tab])

  async function fetchData() {
    setLoading(true)
    setMsg('')
    setError('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    if (tab === 'users') {
      const { data } = await db.from('profiles').select('*').order('created_at', { ascending: false })
      setUsers(data ?? [])
    } else {
      const { data } = await db
        .from('activities')
        .select(`
          id, control_code, title, department, active,
          owner:profiles!activities_owner_id_fkey(full_name),
          controller:profiles!activities_controller_id_fkey(full_name)
        `)
        .order('control_code')
      setActivities(data ?? [])
    }
    setLoading(false)
  }

  async function toggleActive(userId: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db.from('profiles').update({ is_active: !current }).eq('id', userId)
    if (error) { setError(error.message); return }
    setMsg(!current ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.')
    fetchData()
  }

  async function changeRole(userId: string, role: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db.from('profiles').update({ role }).eq('id', userId)
    if (error) { setError(error.message); return }
    setMsg('역할이 변경되었습니다.')
    fetchData()
  }

  async function addActivity() {
    if (!formData.control_code || !formData.title) { setError('통제 코드와 활동명은 필수입니다.'); return }
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { error } = await db.from('activities').insert({
      control_code: formData.control_code,
      title:        formData.title,
      department:   formData.department || null,
      active:       true,
    })
    if (error) { setError(error.message) }
    else {
      setMsg('활동이 추가되었습니다.')
      setFormData({ control_code: '', title: '', department: '' })
      setShowForm(false)
      fetchData()
    }
    setSaving(false)
  }

  async function toggleActivityActive(id: string, current: boolean) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    await db.from('activities').update({ active: !current }).eq('id', id)
    fetchData()
  }

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
      <div className="flex gap-0 border-b border-slate-800">
        {([['users', '사용자 관리', Users], ['activities', '통제 활동', Activity]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              tab === key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-brand-500 animate-spin" />
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-brand-800 rounded-full flex items-center justify-center shrink-0">
                <span className="text-brand-200 text-sm font-bold">{u.full_name?.charAt(0) ?? '?'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-medium">{u.full_name ?? '-'}</p>
                  {!u.is_active && (
                    <span className="text-xs text-red-400 bg-red-950/50 border border-red-800 px-2 py-0.5 rounded-full">비활성</span>
                  )}
                </div>
                <p className="text-slate-500 text-xs">{u.email} · {u.department ?? '-'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-brand-500 transition-all"
                >
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={() => toggleActive(u.id, u.is_active)}
                  className={clsx(
                    'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                    u.is_active
                      ? 'text-red-400 border-red-900 hover:bg-red-950/50'
                      : 'text-green-400 border-green-900 hover:bg-green-950/50'
                  )}
                >
                  {u.is_active ? <><UserX size={13} />비활성화</> : <><UserCheck size={13} />활성화</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all"
            >
              <Plus size={16} />활동 추가
            </button>
          </div>

          {showForm && (
            <div className="bg-slate-900 border border-brand-800 rounded-xl p-5 space-y-4">
              <p className="text-white text-sm font-medium">새 통제 활동 추가</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">통제 코드 *</label>
                  <input
                    value={formData.control_code}
                    onChange={e => setFormData(p => ({ ...p, control_code: e.target.value }))}
                    placeholder="예: IC-001"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">활동명 *</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="예: 매출채권 정기 검토"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">부서</label>
                <input
                  value={formData.department}
                  onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                  placeholder="예: 내부회계팀"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addActivity}
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}추가
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm rounded-lg transition-all">
                  취소
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {activities.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">등록된 활동이 없습니다</p>
              </div>
            ) : activities.map(a => (
              <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand-400 bg-brand-950/50 border border-brand-900 px-2 py-0.5 rounded">
                      {a.control_code}
                    </span>
                    <p className="text-white text-sm font-medium truncate">{a.title}</p>
                    {!a.active && (
                      <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">비활성</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    {a.department ?? '부서 미지정'} · 담당자: {a.owner?.full_name ?? '미지정'} · 통제: {a.controller?.full_name ?? '미지정'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="p-1.5 text-slate-500 hover:text-brand-400 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActivityActive(a.id, a.active)}
                    className={clsx(
                      'text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
                      a.active
                        ? 'text-slate-400 border-slate-700 hover:border-red-800 hover:text-red-400'
                        : 'text-green-400 border-green-900 hover:bg-green-950/50'
                    )}
                  >
                    {a.active ? '비활성화' : '활성화'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
