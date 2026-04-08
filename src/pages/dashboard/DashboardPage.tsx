import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  FileCheck2, Clock, CheckCircle2, XCircle,
  TrendingUp, Users, Activity, AlertTriangle, Loader2
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface Stats {
  total: number
  draft: number
  submitted: number
  approved: number
  rejected: number
}

interface MonthlyData {
  month: string
  제출: number
  승인: number
  반려: number
}

interface ActivityStat {
  title: string
  total: number
  approved: number
}

const PIE_COLORS = ['#64748b', '#eab308', '#22c55e', '#ef4444']

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats,    setStats]    = useState<Stats>({ total: 0, draft: 0, submitted: 0, approved: 0, rejected: 0 })
  const [monthly,  setMonthly]  = useState<MonthlyData[]>([])
  const [actStats, setActStats] = useState<ActivityStat[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchAll() }, [profile])

  async function fetchAll() {
    if (!profile) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // 1. 전체 증빙 현황
    const { data: records } = await db
      .from('evidence_records')
      .select('id, status, submitted_at, created_at, activity_id, activities(title)')

    if (records) {
      const s: Stats = { total: records.length, draft: 0, submitted: 0, approved: 0, rejected: 0 }
      records.forEach((r: { status: string }) => {
        if (r.status in s) s[r.status as keyof Stats]++
      })
      setStats(s)

      // 2. 월별 통계 (최근 6개월)
      const now = new Date()
      const monthMap: Record<string, MonthlyData> = {}
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getMonth() + 1}월`
        monthMap[key] = { month: key, 제출: 0, 승인: 0, 반려: 0 }
      }
      records.forEach((r: { status: string; submitted_at: string | null; created_at: string }) => {
        const dateStr = r.submitted_at ?? r.created_at
        const d = new Date(dateStr)
        const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
        if (diff >= 0 && diff < 6) {
          const key = `${d.getMonth() + 1}월`
          if (monthMap[key]) {
            if (r.status === 'submitted' || r.status === 'approved' || r.status === 'rejected') monthMap[key].제출++
            if (r.status === 'approved') monthMap[key].승인++
            if (r.status === 'rejected') monthMap[key].반려++
          }
        }
      })
      setMonthly(Object.values(monthMap))

      // 3. 활동별 통계 (상위 5개)
      const actMap: Record<string, ActivityStat> = {}
      records.forEach((r: { status: string; activities: { title: string } | null }) => {
        const title = r.activities?.title ?? '미지정'
        if (!actMap[title]) actMap[title] = { title, total: 0, approved: 0 }
        actMap[title].total++
        if (r.status === 'approved') actMap[title].approved++
      })
      setActStats(
        Object.values(actMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      )
    }

    // 4. 사용자 수 (관리자만)
    if (profile.role === 'admin') {
      const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
      setUserCount(count ?? 0)
    }

    setLoading(false)
  }

  const approvalRate = stats.total > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected || 1)) * 100)
    : 0

  const pieData = [
    { name: '임시저장', value: stats.draft },
    { name: '검토중',   value: stats.submitted },
    { name: '승인완료', value: stats.approved },
    { name: '반려',     value: stats.rejected },
  ].filter(d => d.value > 0)

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={28} className="text-brand-500 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white">대시보드</h1>
        <p className="text-slate-400 text-sm mt-1">
          안녕하세요, <span className="text-white font-medium">{profile?.full_name ?? ''}</span>님 — 전체 현황을 확인하세요
        </p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FileCheck2}   color="brand"  label="전체 증빙"  value={stats.total}     unit="건" />
        <KpiCard icon={Clock}        color="yellow" label="검토 중"    value={stats.submitted} unit="건" />
        <KpiCard icon={CheckCircle2} color="green"  label="승인 완료"  value={stats.approved}  unit="건" />
        <KpiCard icon={XCircle}      color="red"    label="반려"        value={stats.rejected}  unit="건" />
      </div>

      {/* 승인율 + 사용자 수 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-brand-400" />
            <p className="text-slate-400 text-sm">승인율</p>
          </div>
          <p className="text-4xl font-bold text-white">{approvalRate}<span className="text-xl text-slate-400">%</span></p>
          <div className="mt-3 bg-slate-800 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${approvalRate}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-2">
            승인 {stats.approved}건 / 반려 {stats.rejected}건
          </p>
        </div>

        {profile?.role === 'admin' && (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-brand-400" />
                <p className="text-slate-400 text-sm">등록 사용자</p>
              </div>
              <p className="text-4xl font-bold text-white">{userCount}<span className="text-xl text-slate-400"> 명</span></p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-yellow-400" />
                <p className="text-slate-400 text-sm">처리 필요</p>
              </div>
              <p className="text-4xl font-bold text-white">{stats.submitted}<span className="text-xl text-slate-400"> 건</span></p>
              <p className="text-slate-500 text-xs mt-2">결재 대기 중인 증빙</p>
            </div>
          </>
        )}
      </div>

      {/* 차트 행 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 바차트 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-brand-400" />
            <p className="text-white text-sm font-medium">월별 증빙 현황 (최근 6개월)</p>
          </div>
          {monthly.every(m => m.제출 === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              데이터가 없습니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barSize={12} barGap={4}>
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="제출" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="승인" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="반려" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 상태 파이차트 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 size={16} className="text-brand-400" />
            <p className="text-white text-sm font-medium">증빙 상태 분포</p>
          </div>
          {stats.total === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              데이터가 없습니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 활동별 통계 */}
      {actStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-brand-400" />
            <p className="text-white text-sm font-medium">활동별 증빙 현황 (상위 5개)</p>
          </div>
          <div className="space-y-3">
            {actStats.map((a, i) => {
              const rate = a.total > 0 ? Math.round((a.approved / a.total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 truncate max-w-xs">{a.title}</span>
                    <span className="text-slate-500 shrink-0 ml-2">{a.approved}/{a.total}건 ({rate}%)</span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon, color, label, value, unit
}: {
  icon: React.ElementType
  color: 'brand' | 'yellow' | 'green' | 'red'
  label: string
  value: number
  unit: string
}) {
  const colors = {
    brand:  { bg: 'bg-brand-950/50',  border: 'border-brand-900',  icon: 'text-brand-400'  },
    yellow: { bg: 'bg-yellow-950/50', border: 'border-yellow-900', icon: 'text-yellow-400' },
    green:  { bg: 'bg-green-950/50',  border: 'border-green-900',  icon: 'text-green-400'  },
    red:    { bg: 'bg-red-950/50',    border: 'border-red-900',    icon: 'text-red-400'    },
  }
  const c = colors[color]
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className={`inline-flex items-center justify-center w-9 h-9 ${c.bg} border ${c.border} rounded-lg mb-3`}>
        <Icon size={18} className={c.icon} />
      </div>
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value.toLocaleString()}
        <span className="text-sm text-slate-500 font-normal ml-1">{unit}</span>
      </p>
    </div>
  )
}
