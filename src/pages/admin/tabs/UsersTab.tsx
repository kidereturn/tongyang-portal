import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Search, UserPlus, Download, X } from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { type UserRow, buildLoginEmail, ROLE_LABELS, ROLE_BADGES } from '../adminShared'
import { useToast } from '../../../components/Toast'

export default function UsersTab({ refreshKey }: { refreshKey: number }) {
  const toast = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [addModalOpen, setAddModalOpen] = useState(false)

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

  async function reloadUsers() {
    const db = supabase as any
    const { data } = await db.from('profiles').select('*').order('role').order('department').order('full_name')
    setUsers(data ?? [])
  }

  function exportToExcel() {
    const rows = filtered.map((u, index) => ({
      번호: index + 1,
      사번: u.employee_id ?? '',
      이름: u.full_name ?? '',
      '로그인 ID': u.email ?? buildLoginEmail(u.employee_id ?? ''),
      소속팀: u.department ?? '',
      구분: ROLE_LABELS[u.role] ?? u.role,
      전화번호: u.phone ?? '',
      '초기 비밀번호': u.initial_password ?? '',
      상태: u.is_active ? '활성' : '비활성',
      '생성일': u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 18 },
      { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '사용자목록')
    XLSX.writeFile(workbook, `사용자목록_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('엑셀 다운로드 완료', `사용자 ${rows.length.toLocaleString()}명 내보내기`)
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
      {/* Top bar: search + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="이름, 사번, 로그인 ID, 소속팀 검색..."
            className="form-input pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-800 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-900"
          >
            <UserPlus size={14} />
            사용자 추가
          </button>
          <button
            onClick={exportToExcel}
            className="btn-secondary text-xs px-3 py-2"
          >
            <Download size={14} />
            엑셀 다운로드
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-warm-50 px-4 py-3 text-xs text-warm-500">
          총 <b className="text-brand-700">{filtered.length}</b>명
          {filtered.length !== users.length ? ` (전체 ${users.length}명 중)` : ''}
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
                  <td className="font-mono text-xs text-warm-600">{user.employee_id ?? '-'}</td>
                  <td className="text-sm font-semibold text-brand-800">{user.full_name ?? '-'}</td>
                  <td className="text-xs text-warm-500">{user.email ?? buildLoginEmail(user.employee_id ?? '')}</td>
                  <td className="text-xs text-warm-600">{user.department ?? '-'}</td>
                  <td>
                    <span className={ROLE_BADGES[user.role] ?? 'badge-gray'}>{ROLE_LABELS[user.role] ?? user.role}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-warm-100 px-2 py-0.5 text-xs text-warm-600">
                        {showPassword[user.id] ? user.initial_password ?? '사용자 변경 또는 미기록' : '••••••'}
                      </code>
                      <button
                        onClick={() => setShowPassword(previous => ({ ...previous, [user.id]: !previous[user.id] }))}
                        className="text-warm-400 hover:text-warm-600"
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

      {addModalOpen && (
        <AddUserModal
          onClose={() => setAddModalOpen(false)}
          onAdded={async () => {
            setAddModalOpen(false)
            await reloadUsers()
          }}
        />
      )}
    </div>
  )
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'owner' | 'controller'>('owner')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!employeeId.trim() || !fullName.trim()) {
      toast.error('필수값 누락', '사번과 이름은 필수입니다.')
      return
    }
    setSubmitting(true)

    const loadingId = toast.loading('사용자 추가 중...', `${fullName} (${employeeId})`)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        toast.update(loadingId, { kind: 'error', title: '세션 만료', description: '다시 로그인 후 시도해주세요.' })
        setSubmitting(false)
        return
      }

      const response = await fetch('/api/admin/update-users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          users: [
            {
              employee_id: employeeId.trim(),
              full_name: fullName.trim(),
              role,
              department: department.trim() || null,
              phone: phone.trim() || null,
              contact_email: contactEmail.trim() || null,
              is_active: true,
            },
          ],
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.ok) {
        toast.update(loadingId, {
          kind: 'error',
          title: '사용자 추가 실패',
          description: payload?.detail ?? payload?.error ?? payload?.errors?.[0] ?? '알 수 없는 오류',
        })
        setSubmitting(false)
        return
      }
      const created = payload.createdCount ?? 0
      toast.update(loadingId, {
        kind: 'success',
        title: created > 0 ? '사용자 추가 완료' : '기존 사용자 업데이트',
        description: `${fullName} (${employeeId})${created > 0 ? ' — 초기 비밀번호는 사번' : ''}`,
      })
      onAdded()
    } catch (error) {
      toast.update(loadingId, {
        kind: 'error',
        title: '사용자 추가 실패',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-box max-w-md p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-brand-900">사용자 추가</h3>
            <p className="mt-1 text-xs text-warm-500">로그인 ID는 사번이며, 초기 비밀번호는 사번과 동일합니다.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-warm-400 transition hover:bg-warm-100 hover:text-warm-600"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">사번 *</label>
              <input
                className="form-input"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                placeholder="101267"
                required
              />
            </div>
            <div>
              <label className="form-label">이름 *</label>
              <input
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="홍길동"
                required
              />
            </div>
          </div>
          <div>
            <label className="form-label">구분 *</label>
            <select
              className="form-input"
              value={role}
              onChange={e => setRole(e.target.value as 'admin' | 'owner' | 'controller')}
            >
              <option value="owner">담당자</option>
              <option value="controller">승인자</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div>
            <label className="form-label">소속팀</label>
            <input
              className="form-input"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="예: 재경팀"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">전화번호</label>
              <input
                className="form-input"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="form-label">개인 이메일</label>
              <input
                className="form-input"
                type="email"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                placeholder="선택사항"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost" disabled={submitting}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              사용자 추가
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
