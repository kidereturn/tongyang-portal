import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowRight,
  Bell,
  Activity,
  LayoutDashboard,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCountUp } from '../../hooks/useCountUp'

interface Stats {
  total: number
  pendingApproval: number
  approved: number
  rejected: number
}

interface MonthlyData {
  month: string
  submitted: number
  approved: number
  rejected: number
}

interface ActivityStat {
  title: string
  total: number
  approved: number
}

interface DashboardActivity {
  id: string
  control_code: string | null
  submission_status: string | null
  created_at: string | null
  updated_at: string | null
  owner_id: string | null
  controller_id: string | null
}

const PIE_COLORS = ['#f59e0b', '#6366f1', '#22c55e', '#ef4444']

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  unit,
  to,
  loaded,
}: {
  icon: React.ElementType
  color: string
  label: string
  value: number
  unit: string
  to: string
  loaded: boolean
}) {
  const animated = useCountUp(value, 900, loaded)

  return (
    <Link to={to} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group">
      {loaded ? (
        <>
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center mb-3',
              color === 'brand'
                ? 'bg-brand-50 text-brand-600'
                : color === 'amber'
                  ? 'bg-amber-50 text-amber-600'
                  : color === 'green'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
            )}
          >
            <Icon size={20} />
          </div>
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          <p className="text-2xl font-black text-gray-900" style={{ animation: 'countUp 0.4s ease-out' }}>
            {animated.toLocaleString()}
            <span className="text-sm text-gray-400 font-normal ml-1">{unit}</span>
          </p>
          <p className="text-xs text-gray-300 group-hover:text-brand-400 transition-colors mt-2 flex items-center gap-0.5">
            바로가기
            <ArrowRight size={10} />
          </p>
        </>
      ) : (
        <>
          <div className="skeleton w-10 h-10 rounded-xl mb-3" />
          <div className="skeleton h-3 w-16 mb-2 rounded" />
          <div className="skeleton h-7 w-20 rounded" />
        </>
      )}
    </Link>
  )
}

function getSubmissionStatus(status: string | null) {
  if (status === '승인') return 'approved'
  if (status === '반려') return 'rejected'
  if (status === '완료') return 'pendingApproval'
  return 'draft'
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<Stats>({ total: 0, pendingApproval: 0, approved: 0, rejected: 0 })
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [actStats, setActStats] = useState<ActivityStat[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const approvalRate = stats.approved + stats.rejected > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : 0

  const animatedRate = useCountUp(approvalRate, 1000, !loading)
  const animatedUsers = useCountUp(userCount, 900, !loading)

  useEffect(() => {
    void fetchAll()
  }, [profile])

  async function fetchAll() {
    if (!profile) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    try {
      let activityQuery = db
        .from('activities')
        .select('id, control_code, submission_status, created_at, updated_at, owner_id, controller_id')
        .eq('active', true)

      if (profile.role === 'owner') {
        activityQuery = activityQuery.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        activityQuery = activityQuery.eq('controller_id', profile.id)
      }

      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('dashboard_timeout')), 15000)
      })

      const { data: records } = await Promise.race([activityQuery, timeout]) as { data: DashboardActivity[] | null }
      const activityRecords = (records ?? []) as DashboardActivity[]

    const nextStats: Stats = { total: activityRecords.length, pendingApproval: 0, approved: 0, rejected: 0 }
    const activityMap: Record<string, ActivityStat> = {}
    const monthMap: Record<string, MonthlyData> = {}
    const now = new Date()

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getMonth() + 1}월`
      monthMap[key] = { month: key, submitted: 0, approved: 0, rejected: 0 }
    }

    activityRecords.forEach(record => {
      const status = getSubmissionStatus(record.submission_status)

      if (status === 'pendingApproval') nextStats.pendingApproval += 1
      if (status === 'approved') nextStats.approved += 1
      if (status === 'rejected') nextStats.rejected += 1

      const title = record.control_code ?? '미지정'
      if (!activityMap[title]) {
        activityMap[title] = { title, total: 0, approved: 0 }
      }
      activityMap[title].total += 1
      if (status === 'approved') {
        activityMap[title].approved += 1
      }

      const baseDate = record.updated_at ?? record.created_at
      if (!baseDate) return

      const date = new Date(baseDate)
      if (Number.isNaN(date.getTime())) return

      const diff = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
      if (diff < 0 || diff >= 6) return

      const key = `${date.getMonth() + 1}월`
      if (!monthMap[key]) return

      if (status === 'pendingApproval') monthMap[key].submitted += 1
      if (status === 'approved') monthMap[key].approved += 1
      if (status === 'rejected') monthMap[key].rejected += 1
    })

      setStats(nextStats)
      setMonthly(Object.values(monthMap))
      setActStats(
        Object.values(activityMap)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
      )

      if (profile.role === 'admin') {
        try {
          const countTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('count_timeout')), 8000)
          })
          const { count } = await Promise.race([
            db.from('profiles').select('id', { count: 'exact', head: true }),
            countTimeout,
          ]) as { count: number | null }
          setUserCount(count ?? 0)
        } catch {
          setUserCount(0)
        }
      } else {
        setUserCount(0)
      }
    } catch {
      setStats({ total: 0, pendingApproval: 0, approved: 0, rejected: 0 })
      setMonthly([])
      setActStats([])
      setUserCount(0)
      setLoadError('데이터 조회가 지연되어 빈 상태로 전환했습니다. 새로 고침으로 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const pieData = [
    { name: '결재대기', value: stats.pendingApproval },
    {
      name: '미완료',
      value: Math.max(0, stats.total - stats.pendingApproval - stats.approved - stats.rejected),
    },
    { name: '승인완료', value: stats.approved },
    { name: '반려', value: stats.rejected },
  ].filter(item => item.value > 0)

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 6) return '좋은 새벽이에요'
    if (hour < 12) return '좋은 아침이에요'
    if (hour < 17) return '좋은 오후에요'
    return '좋은 저녁이에요'
  }

  const roleLabel: Record<string, string> = {
    admin: '관리자',
    controller: '통제책임자',
    owner: '증빙담당자',
  }

  return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      <div className="rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 p-4 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-64 opacity-10">
          <LayoutDashboard size={180} className="absolute -right-8 -top-4" />
        </div>
        <div className="relative">
          {loading ? (
            <>
              <div
                className="skeleton h-4 w-32 mb-2 rounded"
                style={{ background: 'rgba(255,255,255,0.2)', animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }}
              />
              <div
                className="skeleton h-8 w-40 mb-2 rounded"
                style={{ background: 'rgba(255,255,255,0.2)', animation: 'shimmer 1.4s infinite linear', backgroundSize: '400px 100%' }}
              />
            </>
          ) : (
            <>
              <p className="text-brand-200 text-sm font-medium">
                {greeting()}, {roleLabel[profile?.role ?? ''] ?? ''}
              </p>
              <h2 className="text-2xl font-black text-white mt-0.5">
                {profile?.full_name ?? '사용자'}님
              </h2>
              <p className="text-brand-100/80 text-sm mt-2">
                {profile?.department && <span className="mr-2">{profile.department}</span>}
                {new Date().toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })}
              </p>
              {stats.pendingApproval > 0 && (
                <div className="flex items-center gap-2 mt-3 bg-white/10 backdrop-blur rounded-xl px-4 py-2 w-fit">
                  <Bell size={14} className="text-yellow-300" />
                  <span className="text-sm text-white">
                    결재 대기 중인 건이 <b className="text-yellow-300">{stats.pendingApproval}건</b> 있습니다
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { icon: FileCheck2, color: 'brand', label: '전체', value: stats.total, unit: '건', to: '/evidence' },
          {
            icon: Clock,
            color: 'amber',
            label: '결재대기',
            value: stats.pendingApproval,
            unit: '건',
            to: profile?.role === 'controller' ? '/inbox' : '/evidence',
          },
          { icon: CheckCircle2, color: 'green', label: '승인완료', value: stats.approved, unit: '건', to: '/inbox' },
          { icon: XCircle, color: 'red', label: '반려', value: stats.rejected, unit: '건', to: '/inbox' },
        ].map(item => (
          <StatCard key={item.label} {...item} loaded={!loading} />
        ))}
      </div>

      {loadError && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 border-amber-100">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-10 w-32 rounded" />
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-brand-500" />
                <p className="text-sm font-semibold text-gray-600">승인율</p>
              </div>
              <p className="text-4xl font-black text-gray-900" style={{ animation: 'countUp 0.5s ease-out' }}>
                {animatedRate}
                <span className="text-xl text-gray-400 ml-0.5">%</span>
              </p>
              <div className="mt-3 bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">승인 {stats.approved}건 · 반려 {stats.rejected}건</p>
            </>
          )}
        </div>

        {profile?.role === 'admin' && (
          <>
            <div className="card p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-10 w-28 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-brand-500" />
                    <p className="text-sm font-semibold text-gray-600">등록 사용자</p>
                  </div>
                  <p className="text-4xl font-black text-gray-900" style={{ animation: 'countUp 0.5s ease-out' }}>
                    {animatedUsers}
                    <span className="text-xl text-gray-400 ml-1">명</span>
                  </p>
                  <Link to="/admin" className="text-xs text-brand-500 hover:underline mt-3 flex items-center gap-0.5">
                    사용자 관리
                    <ArrowRight size={10} />
                  </Link>
                </>
              )}
            </div>

            <div className="card p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="skeleton h-4 w-24 rounded" />
                  <div className="skeleton h-10 w-20 rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <p className="text-sm font-semibold text-gray-600">처리 필요</p>
                  </div>
                  <p className="text-4xl font-black text-gray-900">
                    {stats.pendingApproval}
                    <span className="text-xl text-gray-400 ml-1">건</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-3">결재 대기 중인 증빙</p>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-brand-500" />
            <p className="font-bold text-gray-900 text-sm">월별 증빙 현황 (최근 6개월)</p>
          </div>
          {loading ? (
            <div className="space-y-2 pt-4">
              {[80, 60, 90, 50, 70, 85].map((height, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="skeleton rounded" style={{ height: `${height * 0.4}px`, width: '40px' }} />
                  <div className="skeleton rounded" style={{ height: `${height * 0.6}px`, width: '40px' }} />
                  <div className="skeleton rounded" style={{ height: `${height * 0.2}px`, width: '40px' }} />
                </div>
              ))}
            </div>
          ) : monthly.every(item => item.submitted === 0 && item.approved === 0 && item.rejected === 0) ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">데이터 없음</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barSize={12} barGap={3}>
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="submitted" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="approved" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 size={15} className="text-brand-500" />
            <p className="font-bold text-gray-900 text-sm">증빙 상태 분포</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-8">
              <div className="skeleton w-32 h-32 rounded-full" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map(item => (
                  <div key={item} className="skeleton h-3 w-20 rounded" />
                ))}
              </div>
            </div>
          ) : stats.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300 text-sm gap-2">
              <FileCheck2 size={32} className="text-gray-200" />
              아직 데이터가 없습니다
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={7} formatter={value => <span style={{ color: '#6b7280', fontSize: 11 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {actStats.length > 0 && !loading && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-brand-500" />
            <p className="font-bold text-gray-900 text-sm">통제활동별 현황 (상위 5개)</p>
          </div>
          <div className="space-y-3">
            {actStats.map((item, index) => {
              const rate = item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0
              return (
                <div key={index}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium truncate max-w-xs">{item.title}</span>
                    <span className="text-gray-400 shrink-0 ml-2">
                      {item.approved}/{item.total}건 ({rate}%)
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {profile?.role === 'admin' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/admin', label: 'RCM 파일 업로드', desc: '사용자 계정 등록', icon: FileCheck2, color: 'brand' },
            { to: '/admin', label: '모집단 업로드', desc: '증빙 모집단 등록', icon: Activity, color: 'blue' },
            { to: '/inbox', label: '결재 현황', desc: '전체 결재 관리', icon: CheckCircle2, color: 'green' },
            { to: '/admin', label: '사용자 관리', desc: '권한 및 계정 관리', icon: Users, color: 'purple' },
          ].map(item => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group cursor-pointer"
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
                  item.color === 'brand'
                    ? 'bg-brand-50 text-brand-600'
                    : item.color === 'blue'
                      ? 'bg-blue-50 text-blue-600'
                      : item.color === 'green'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-purple-50 text-purple-600'
                )}
              >
                <item.icon size={15} />
              </div>
              <p className="text-sm font-bold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
