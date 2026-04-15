import { useEffect, useState, useMemo } from 'react'
import { Download, Trophy } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'

type LoginLog = {
  id: string
  employee_id: string | null
  full_name: string | null
  department: string | null
  ip_address: string | null
  logged_in_at: string
}

export default function LoginLogsTab() {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    setLoading(true)
    try {
      let q = (supabase as any)
        .from('login_logs')
        .select('id, employee_id, full_name, department, ip_address, logged_in_at')
        .order('logged_in_at', { ascending: false })
        .limit(1000)

      if (dateFrom) q = q.gte('logged_in_at', `${dateFrom}T00:00:00`)
      if (dateTo) q = q.lte('logged_in_at', `${dateTo}T23:59:59`)

      const { data } = await q
      setLogs(data ?? [])
    } catch {
      setLogs([])
    }
    setLoading(false)
  }

  // Top 3 users by login count
  const topUsers = useMemo(() => {
    const map: Record<string, { name: string; dept: string; count: number }> = {}
    for (const log of logs) {
      const key = log.employee_id ?? log.full_name ?? 'unknown'
      if (!map[key]) map[key] = { name: log.full_name ?? '-', dept: log.department ?? '-', count: 0 }
      map[key].count++
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 3)
  }, [logs])

  // Top 3 teams by login count
  const topTeams = useMemo(() => {
    const map: Record<string, number> = {}
    for (const log of logs) {
      const dept = log.department ?? '미지정'
      map[dept] = (map[dept] ?? 0) + 1
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 3).map(([name, count]) => ({ name, count }))
  }, [logs])

  function downloadExcel() {
    const rows = logs.map(log => ({
      '사번': log.employee_id ?? '-',
      '이름': log.full_name ?? '-',
      '소속팀': log.department ?? '-',
      'IP주소': log.ip_address ?? '-',
      '로그인 시각': new Date(log.logged_in_at).toLocaleString('ko-KR'),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '로그인이력')
    ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 22 }]
    XLSX.writeFile(wb, `로그인이력_${dateFrom}_${dateTo}.xlsx`)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">시작일</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-sm" />
          </div>
          <div>
            <label className="form-label">종료일</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-sm" />
          </div>
          <button onClick={fetchLogs} className="btn-primary text-sm py-2">조회</button>
          <button onClick={downloadExcel} className="btn-secondary text-sm py-2 ml-auto">
            <Download size={14} /> 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Top 3 cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
            <Trophy size={16} className="text-amber-500" />
            TOP 3 접속자 (기간 내)
          </h3>
          {topUsers.length > 0 ? (
            <div className="space-y-2">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="text-lg">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.dept}</p>
                  </div>
                  <span className="text-sm font-black text-brand-600">{u.count}회</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">데이터 없음</p>
          )}
        </div>

        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
            <Trophy size={16} className="text-emerald-500" />
            TOP 3 팀 (기간 내)
          </h3>
          {topTeams.length > 0 ? (
            <div className="space-y-2">
              {topTeams.map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                  <span className="text-lg">{medals[i]}</span>
                  <p className="flex-1 text-sm font-bold text-slate-900">{t.name}</p>
                  <span className="text-sm font-black text-emerald-600">{t.count}회</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">데이터 없음</p>
          )}
        </div>
      </div>

      {/* Log table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-sm font-bold text-slate-900">로그인 이력 ({logs.length}건)</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">로딩 중...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">로그인 이력이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-xs font-semibold text-slate-500">
                  <th className="px-4 py-2.5">사번</th>
                  <th className="px-4 py-2.5">이름</th>
                  <th className="px-4 py-2.5">소속팀</th>
                  <th className="px-4 py-2.5">IP주소</th>
                  <th className="px-4 py-2.5">로그인 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.employee_id ?? '-'}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{log.full_name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{log.department ?? '-'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{log.ip_address ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(log.logged_in_at).toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
