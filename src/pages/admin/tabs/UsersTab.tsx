import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, Search } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'
import { type UserRow, buildLoginEmail, ROLE_LABELS, ROLE_BADGES } from '../adminShared'

export default function UsersTab({ refreshKey }: { refreshKey: number }) {
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
