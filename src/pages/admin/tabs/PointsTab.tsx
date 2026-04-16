import { useEffect, useState, useCallback } from 'react'
import { Award, Download, RefreshCw, RotateCcw, Search, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'

interface PointRow {
  user_id: string
  full_name: string | null
  employee_id: string | null
  department: string | null
  total_points: number
}

interface PointHistory {
  id: string
  user_id: string
  points: number
  reason: string
  created_at: string
}

interface MonthlySnapshot {
  month: string
  totalUsers: number
  totalPoints: number
  avgPoints: number
}

export default function PointsTab() {
  const [rows, setRows] = useState<PointRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<PointRow | null>(null)
  const [history, setHistory] = useState<PointHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [monthlyData, setMonthlyData] = useState<MonthlySnapshot[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const fetchPoints = useCallback(async () => {
    setLoading(true)
    try {
      // Get all users
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, employee_id, department')
        .order('full_name')

      // Get points per user
      const { data: points } = await db
        .from('user_points')
        .select('user_id, points')

      // Aggregate
      const pointMap: Record<string, number> = {}
      for (const p of points ?? []) {
        pointMap[p.user_id] = (pointMap[p.user_id] ?? 0) + (p.points ?? 0)
      }

      const result: PointRow[] = (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        full_name: p.full_name,
        employee_id: p.employee_id,
        department: p.department,
        total_points: pointMap[p.id] ?? 0,
      }))

      // Sort by points descending
      result.sort((a, b) => b.total_points - a.total_points)
      setRows(result)

      // Generate monthly snapshots from user_points with created_at
      const { data: allPts } = await db
        .from('user_points')
        .select('user_id, points, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      const mMap: Record<string, { pts: number; users: Set<string> }> = {}
      for (const p of allPts ?? []) {
        if (!p.created_at) continue
        const d = new Date(p.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!mMap[key]) mMap[key] = { pts: 0, users: new Set() }
        mMap[key].pts += p.points ?? 0
        mMap[key].users.add(p.user_id)
      }

      const snapshots: MonthlySnapshot[] = Object.entries(mMap)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([month, v]) => ({
          month,
          totalUsers: v.users.size,
          totalPoints: v.pts,
          avgPoints: v.users.size > 0 ? Math.round(v.pts / v.users.size) : 0,
        }))

      setMonthlyData(snapshots)
    } catch (err) {
      console.error('points fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [db])

  useEffect(() => { fetchPoints() }, [fetchPoints])

  async function fetchUserHistory(user: PointRow) {
    setSelectedUser(user)
    setHistoryLoading(true)
    try {
      const { data } = await db
        .from('user_points')
        .select('id, user_id, points, reason, created_at')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(100)
      setHistory(data ?? [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleMonthlyReset() {
    const now = new Date()
    const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`
    if (!confirm(`${monthLabel} 포인트를 전체 초기화하시겠습니까?\n\n현재 포인트는 이력에 보존되며, 전체 사용자의 포인트를 0으로 리셋합니다.`)) return

    setResetting(true)
    try {
      // Insert a negative adjustment for each user who has points
      const usersWithPoints = rows.filter(r => r.total_points > 0)
      const resetRecords = usersWithPoints.map(r => ({
        user_id: r.user_id,
        points: -r.total_points,
        reason: `${monthLabel} 월별 초기화`,
        created_at: new Date().toISOString(),
      }))

      if (resetRecords.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < resetRecords.length; i += 50) {
          const batch = resetRecords.slice(i, i + 50)
          await db.from('user_points').insert(batch)
        }
      }

      alert(`${usersWithPoints.length}명의 포인트가 초기화되었습니다.`)
      fetchPoints()
    } catch (err) {
      console.error('reset error', err)
      alert('초기화 중 오류가 발생했습니다.')
    } finally {
      setResetting(false)
    }
  }

  function downloadExcel() {
    const header = '순위,사번,이름,부서,포인트'
    const lines = filteredRows.map((r, i) =>
      `${i + 1},${r.employee_id ?? '-'},${r.full_name ?? '-'},${r.department ?? '-'},${r.total_points}`
    )
    const csv = '\uFEFF' + [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `포인트현황_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredRows = rows.filter(r => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (r.full_name ?? '').toLowerCase().includes(term) ||
      (r.employee_id ?? '').includes(term) ||
      (r.department ?? '').toLowerCase().includes(term)
    )
  })

  const totalPoints = rows.reduce((s, r) => s + r.total_points, 0)
  const usersWithPoints = rows.filter(r => r.total_points > 0).length

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
          <p className="text-[10px] font-bold text-accent-600">전체 포인트</p>
          <p className="text-2xl font-bold text-amber-700">{totalPoints.toLocaleString()}<span className="text-xs ml-0.5">P</span></p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
          <p className="text-[10px] font-bold text-blue-500">보유자 수</p>
          <p className="text-2xl font-bold text-blue-700">{usersWithPoints}<span className="text-xs ml-0.5">명</span></p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
          <p className="text-[10px] font-bold text-emerald-500">전체 사용자</p>
          <p className="text-2xl font-bold text-emerald-700">{rows.length}<span className="text-xs ml-0.5">명</span></p>
        </div>
        <div className="rounded-xl bg-warm-50 border border-warm-100 p-4 text-center">
          <p className="text-[10px] font-bold text-warm-500">평균 포인트</p>
          <p className="text-2xl font-bold text-brand-700">
            {rows.length > 0 ? Math.round(totalPoints / rows.length) : 0}<span className="text-xs ml-0.5">P</span>
          </p>
        </div>
      </div>

      {/* Monthly history */}
      {monthlyData.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold text-brand-900 mb-3">월별 포인트 이력</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-warm-200 text-left text-[11px] font-semibold text-warm-500">
                  <th className="py-2 px-3">월</th>
                  <th className="py-2 px-3 text-right">참여자 수</th>
                  <th className="py-2 px-3 text-right">총 포인트</th>
                  <th className="py-2 px-3 text-right">평균</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map(m => (
                  <tr key={m.month} className="border-b border-warm-50 hover:bg-warm-50">
                    <td className="py-2 px-3 font-semibold text-brand-800">{m.month}</td>
                    <td className="py-2 px-3 text-right text-warm-600">{m.totalUsers}명</td>
                    <td className="py-2 px-3 text-right font-bold text-amber-600">{m.totalPoints.toLocaleString()}P</td>
                    <td className="py-2 px-3 text-right text-warm-500">{m.avgPoints}P</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="이름, 사번, 부서 검색..."
            className="w-full rounded-xl border border-warm-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
          />
        </div>
        <button onClick={() => fetchPoints()} className="btn-ghost text-xs" disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
        <button onClick={downloadExcel} className="btn-ghost text-xs">
          <Download size={13} />
          엑셀 다운로드
        </button>
        <button
          onClick={handleMonthlyReset}
          disabled={resetting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
        >
          {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          월별 초기화
        </button>
      </div>

      {/* Points table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-warm-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            로딩 중...
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-warm-50 border-b border-warm-200 z-10">
                <tr className="text-left text-[11px] font-semibold text-warm-500">
                  <th className="py-2.5 px-3 w-12">#</th>
                  <th className="py-2.5 px-3">사번</th>
                  <th className="py-2.5 px-3">이름</th>
                  <th className="py-2.5 px-3">부서</th>
                  <th className="py-2.5 px-3 text-right">포인트</th>
                  <th className="py-2.5 px-3 w-16">이력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map((r, i) => (
                  <tr
                    key={r.user_id}
                    className={clsx(
                      'hover:bg-warm-50 transition',
                      i < 3 && r.total_points > 0 && 'bg-amber-50/50'
                    )}
                  >
                    <td className="py-2 px-3">
                      {i === 0 && r.total_points > 0 ? '\uD83E\uDD47' : i === 1 && r.total_points > 0 ? '\uD83E\uDD48' : i === 2 && r.total_points > 0 ? '\uD83E\uDD49' : i + 1}
                    </td>
                    <td className="py-2 px-3 font-mono text-warm-500">{r.employee_id ?? '-'}</td>
                    <td className="py-2 px-3 font-semibold text-brand-800">{r.full_name ?? '-'}</td>
                    <td className="py-2 px-3 text-warm-500">{r.department ?? '-'}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={clsx('font-bold', r.total_points > 0 ? 'text-amber-600' : 'text-warm-300')}>
                        {r.total_points.toLocaleString()}P
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => fetchUserHistory(r)}
                        className="rounded-md bg-warm-100 px-2 py-1 text-[10px] font-semibold text-warm-600 hover:bg-warm-200 transition"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-warm-400">
                      {searchTerm ? '검색 결과가 없습니다.' : '데이터가 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User history popup */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-md border border-warm-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-warm-200 bg-amber-50 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                  <Award size={16} className="text-accent-600" />
                  {selectedUser.full_name ?? '사용자'} 포인트 이력
                </h3>
                <p className="text-[11px] text-warm-500 mt-0.5">
                  {selectedUser.employee_id} · {selectedUser.department ?? '-'} · 총 {selectedUser.total_points}P
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-200 transition text-lg font-bold">
                &times;
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8 text-warm-400">
                  <Loader2 size={18} className="animate-spin mr-2" />
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-1.5">
                  {history.map(h => (
                    <div key={h.id} className="flex items-center justify-between rounded-lg bg-warm-50 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-brand-700">{h.reason}</p>
                        <p className="text-[10px] text-warm-400">
                          {new Date(h.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={clsx('text-sm font-bold', h.points >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {h.points >= 0 ? '+' : ''}{h.points}P
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-sm text-warm-400">포인트 이력이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
