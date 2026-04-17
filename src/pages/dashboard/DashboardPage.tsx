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
  LineChart,
  Line,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
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
  BookOpen,
  Gamepad2,
  Info,
  Trophy,
  Star,
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
  department: string | null
}

interface DeptData {
  name: string
  total: number
  approved: number
  pending: number
}

interface DailyData {
  day: string
  count: number
}

const PIE_COLORS = ['#A89167', '#5C564A', '#7A7466', '#C2BEB5']

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
                ? 'bg-warm-50 text-brand-700'
                : color === 'amber'
                  ? 'bg-amber-50 text-amber-600'
                  : color === 'green'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
            )}
          >
            <Icon size={20} />
          </div>
          <p className="text-xs text-warm-500 mb-0.5">{label}</p>
          <p className="text-2xl font-bold text-brand-900" style={{ animation: 'countUp 0.4s ease-out' }}>
            {animated.toLocaleString()}
            <span className="text-sm text-warm-400 font-normal ml-1">{unit}</span>
          </p>
          <p className="text-xs text-warm-300 group-hover:text-brand-400 transition-colors mt-2 flex items-center gap-0.5">
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
  const [deptStats, setDeptStats] = useState<DeptData[]>([])
  const [dailyActivity, setDailyActivity] = useState<DailyData[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dbNotices, setDbNotices] = useState<Array<{ id: string; type: string; title: string; badge: string; badge_color: string; created_at: string }>>([])
  const [pointsRanking, setPointsRanking] = useState<Array<{ user_id: string; full_name: string | null; total_points: number }>>([])
  const [quizPerfect, setQuizPerfect] = useState<Array<{ id: string; full_name: string | null; created_at: string }>>([])
  const [learningStats, setLearningStats] = useState({ total: 10, inProgress: 0, completed: 0 })


  const approvalRate = stats.approved + stats.rejected > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : 0

  const animatedRate = useCountUp(approvalRate, 1000, !loading)
  const animatedUsers = useCountUp(userCount, 900, !loading)

  useEffect(() => {
    void fetchAll()
    void fetchExtras()

    // 절대 안전장치: 8초 후에도 로딩 중이면 강제 해제
    const failsafe = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('[Dashboard] failsafe: force loading=false after 8s')
          setLoadError('데이터 로딩이 지연되고 있습니다.')
        }
        return false
      })
    }, 8000)

    return () => clearTimeout(failsafe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function fetchExtras() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const extrasTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('extras_timeout')), 6000),
    )
    try {
      await Promise.race([
        (async () => {
          // Notices
          const { data: notices } = await db.from('notices').select('id, type, title, badge, badge_color, created_at')
            .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(10)
          setDbNotices(notices ?? [])

          // Points ranking TOP 5
          const { data: pts } = await db.rpc('get_points_ranking')
          setPointsRanking((pts ?? []).slice(0, 5))

          // Quiz perfect scorers
          const { data: qr } = await db.from('quiz_results').select('id, user_id, score, total_questions, created_at')
            .eq('score', 10).order('created_at', { ascending: false }).limit(5)
          if (qr && qr.length > 0) {
            const userIds = [...new Set(qr.map((r: any) => r.user_id))]
            const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', userIds)
            const nameMap: Record<string, string> = {}
            for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? ''
            setQuizPerfect(qr.map((r: any) => ({ ...r, full_name: nameMap[r.user_id] ?? null })))
          }

          // Learning stats
          const { data: cVids } = await db.from('course_videos').select('id').eq('is_active', true)
          const totalCourses = cVids?.length ?? 10
          const { data: allProg } = await db.from('learning_progress').select('user_id, course_id, progress_percent')
          const progRows = allProg ?? []
          if (profile?.role === 'admin') {
            const inProg = progRows.filter((p: any) => p.progress_percent > 0 && p.progress_percent < 95).length
            const comp = progRows.filter((p: any) => p.progress_percent >= 95).length
            setLearningStats({ total: totalCourses, inProgress: inProg, completed: comp })
          } else if (profile?.id) {
            const myProg = progRows.filter((p: any) => p.user_id === profile.id)
            const inProg = myProg.filter((p: any) => p.progress_percent > 0 && p.progress_percent < 95).length
            const comp = myProg.filter((p: any) => p.progress_percent >= 95).length
            setLearningStats({ total: totalCourses, inProgress: inProg, completed: comp })
          } else {
            setLearningStats({ total: totalCourses, inProgress: 0, completed: 0 })
          }
        })(),
        extrasTimeout,
      ])
    } catch {
      console.warn('[Dashboard] fetchExtras timeout or error')
    }
  }

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
        .select('id, control_code, submission_status, created_at, updated_at, owner_id, controller_id, department')
        .eq('active', true)

      if (profile.role === 'owner') {
        if (profile.employee_id) activityQuery = activityQuery.eq('owner_employee_id', profile.employee_id)
        else activityQuery = activityQuery.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) activityQuery = activityQuery.eq('controller_employee_id', profile.employee_id)
        else activityQuery = activityQuery.eq('controller_id', profile.id)
      }

      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('dashboard_timeout')), 8000)
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

      // 부서별 통계
      const deptMap: Record<string, DeptData> = {}
      activityRecords.forEach(record => {
        const dept = record.department ?? '미지정'
        if (!deptMap[dept]) deptMap[dept] = { name: dept, total: 0, approved: 0, pending: 0 }
        deptMap[dept].total += 1
        const st = getSubmissionStatus(record.submission_status)
        if (st === 'approved') deptMap[dept].approved += 1
        if (st === 'pendingApproval') deptMap[dept].pending += 1
      })

      // 일별 활동 추이 (최근 14일)
      const dailyMap: Record<string, number> = {}
      for (let d = 13; d >= 0; d--) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
        const key = `${dt.getMonth() + 1}/${dt.getDate()}`
        dailyMap[key] = 0
      }
      activityRecords.forEach(record => {
        const baseDate = record.updated_at ?? record.created_at
        if (!baseDate) return
        const dt = new Date(baseDate)
        if (Number.isNaN(dt.getTime())) return
        const key = `${dt.getMonth() + 1}/${dt.getDate()}`
        if (dailyMap[key] !== undefined) dailyMap[key] += 1
      })

      setDeptStats(Object.values(deptMap).sort((a, b) => b.total - a.total).slice(0, 8))
      setDailyActivity(Object.entries(dailyMap).map(([day, count]) => ({ day, count })))

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
      <div className="rounded-lg bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 p-4 sm:p-6 text-white relative overflow-hidden">
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
              <h2 className="text-2xl font-bold text-white mt-0.5">
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

      {/* 공지사항 / 매뉴얼 + 리더보드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 공지사항 + 매뉴얼 통합 리스트 */}
        <div className="lg:col-span-2 card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-accent-600" />
            <p className="font-bold text-brand-900 text-sm">공지사항 / 매뉴얼</p>
          </div>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
            {dbNotices.map(n => (
              <Link key={n.id} to={`/notice/${n.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-warm-50 transition group">
                <span className={clsx('shrink-0 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  n.type === 'notice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                )}>
                  {n.type === 'notice' ? n.badge : '매뉴얼'}
                </span>
                <p className="flex-1 text-brand-700 truncate group-hover:text-brand-700 transition">{n.title}</p>
                <span className="shrink-0 text-[10px] text-warm-400">{new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
              </Link>
            ))}
            {dbNotices.length === 0 && <p className="text-xs text-warm-400 py-4 text-center">등록된 공지사항이 없습니다</p>}
          </div>
        </div>

        {/* 실시간 리더보드 */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-accent-600" />
            <p className="font-bold text-brand-900 text-sm">실시간 랭킹</p>
          </div>
          {/* 포인트 TOP 5 */}
          <p className="text-[10px] font-bold text-warm-400 mb-1.5">POINT TOP 5</p>
          <div className="space-y-1 mb-3">
            {pointsRanking.map((r, i) => (
              <div key={r.user_id} className="flex items-center gap-2 rounded-lg bg-warm-50 px-2.5 py-1.5">
                <span className="text-sm">{i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : `${i+1}`}</span>
                <span className="flex-1 text-xs font-semibold text-brand-800 truncate">{r.full_name ?? '사용자'}</span>
                <span className="text-xs font-bold text-blue-600">{r.total_points}P</span>
              </div>
            ))}
            {pointsRanking.length === 0 && <p className="text-[10px] text-warm-400 text-center py-2">데이터 없음</p>}
          </div>
          {/* 퀴즈 만점자 */}
          <p className="text-[10px] font-bold text-warm-400 mb-1.5">QUIZ PERFECT</p>
          <div className="space-y-1">
            {quizPerfect.map(r => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
                <Star size={12} className="text-accent-600 shrink-0" />
                <span className="flex-1 text-xs font-semibold text-brand-800 truncate">{r.full_name ?? '사용자'}</span>
                <span className="text-[10px] text-warm-400">{new Date(r.created_at).toLocaleDateString('ko-KR', { month:'short', day:'numeric' })}</span>
              </div>
            ))}
            {quizPerfect.length === 0 && <p className="text-[10px] text-warm-400 text-center py-2">아직 만점자가 없습니다</p>}
          </div>
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
        <div className="card p-4 flex items-center justify-between gap-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => { setLoadError(null); setLoading(true); void fetchAll(); void fetchExtras() }}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
          >
            새로고침
          </button>
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
                <p className="text-sm font-semibold text-warm-600">승인율</p>
              </div>
              <p className="text-4xl font-bold text-brand-900" style={{ animation: 'countUp 0.5s ease-out' }}>
                {animatedRate}
                <span className="text-xl text-warm-400 ml-0.5">%</span>
              </p>
              <div className="mt-3 bg-warm-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
              <p className="text-xs text-warm-400 mt-2">승인 {stats.approved}건 · 반려 {stats.rejected}건</p>
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
                    <p className="text-sm font-semibold text-warm-600">등록 사용자</p>
                  </div>
                  <p className="text-4xl font-bold text-brand-900" style={{ animation: 'countUp 0.5s ease-out' }}>
                    {animatedUsers}
                    <span className="text-xl text-warm-400 ml-1">명</span>
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
                    <AlertTriangle size={16} className="text-accent-600" />
                    <p className="text-sm font-semibold text-warm-600">처리 필요</p>
                  </div>
                  <p className="text-4xl font-bold text-brand-900">
                    {stats.pendingApproval}
                    <span className="text-xl text-warm-400 ml-1">건</span>
                  </p>
                  <p className="text-xs text-warm-400 mt-3">결재 대기 중인 증빙</p>
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
            <p className="font-bold text-brand-900 text-sm">월별 증빙 현황 (최근 6개월)</p>
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
            <div className="flex items-center justify-center h-48 text-warm-300 text-sm">데이터 없음</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} barSize={12} barGap={3}>
                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="submitted" fill="#A89167" radius={[3, 3, 0, 0]} />
                <Bar dataKey="approved" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejected" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck2 size={15} className="text-brand-500" />
            <p className="font-bold text-brand-900 text-sm">증빙 상태 분포</p>
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
            <div className="flex flex-col items-center justify-center h-48 text-warm-300 text-sm gap-2">
              <FileCheck2 size={32} className="text-warm-200" />
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

      {/* 부서별 현황 + 일별 활동 추이 */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 부서별 증빙 현황 */}
          {deptStats.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-brand-500" />
                <p className="font-bold text-brand-900 text-sm">부서별 증빙 현황</p>
              </div>
              {deptStats.every(d => d.total === 0) ? (
                <div className="flex items-center justify-center h-48 text-warm-300 text-sm">데이터 없음</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptStats} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} width={60} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="approved" fill="#22c55e" radius={[0, 3, 3, 0]} name="승인" stackId="a" />
                    <Bar dataKey="pending" fill="#A89167" radius={[0, 3, 3, 0]} name="결재대기" stackId="a" />
                    <Bar dataKey="total" fill="#e5e7eb" radius={[0, 3, 3, 0]} name="전체" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* 일별 활동 추이 (최근 14일) */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-brand-500" />
              <p className="font-bold text-brand-900 text-sm">일별 활동 추이 (최근 14일)</p>
            </div>
            {dailyActivity.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-48 text-warm-300 text-sm">데이터 없음</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#A89167" strokeWidth={2} dot={{ r: 3, fill: '#A89167' }} name="활동 건수" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* 완료율 게이지 */}
      {!loading && stats.total > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-brand-500" />
            <p className="font-bold text-brand-900 text-sm">전체 진행률</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: '상신완료율', value: stats.total > 0 ? Math.round(((stats.pendingApproval + stats.approved + stats.rejected) / stats.total) * 100) : 0, color: '#A89167' },
              { label: '승인 완료율', value: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0, color: '#22c55e' },
              { label: '반려율', value: (stats.approved + stats.rejected) > 0 ? Math.round((stats.rejected / (stats.approved + stats.rejected)) * 100) : 0, color: '#ef4444' },
            ].map(g => (
              <div key={g.label} className="text-center">
                <ResponsiveContainer width="100%" height={120}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" startAngle={180} endAngle={0} data={[{ value: g.value, fill: g.color }]}>
                    <RadialBar background dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className="text-2xl font-bold text-brand-900 -mt-6">{g.value}%</p>
                <p className="text-xs text-warm-500 mt-1">{g.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {actStats.length > 0 && !loading && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={15} className="text-brand-500" />
            <p className="font-bold text-brand-900 text-sm">통제활동별 현황 (상위 5개)</p>
          </div>
          <div className="space-y-3">
            {actStats.map((item, index) => {
              const rate = item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0
              return (
                <div key={index}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-brand-700 font-medium truncate max-w-xs">{item.title}</span>
                    <span className="text-warm-400 shrink-0 ml-2">
                      {item.approved}/{item.total}건 ({rate}%)
                    </span>
                  </div>
                  <div className="bg-warm-100 rounded-full h-1.5">
                    <div className="bg-warm-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 강좌학습현황 + 빙고참여현황 */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/learning" className="card p-5 hover:shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={15} className="text-blue-500" />
              <p className="font-bold text-brand-900 text-sm">강좌학습현황</p>
              <ArrowRight size={12} className="ml-auto text-warm-300 group-hover:text-brand-500 transition" />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-xs text-blue-500">총 강좌</p>
                <p className="text-lg font-bold text-blue-700">{learningStats.total}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-500">수강중</p>
                <p className="text-lg font-bold text-emerald-700">{learningStats.inProgress}</p>
              </div>
              <div className="rounded-xl bg-warm-100 p-3">
                <p className="text-xs text-warm-500">이수완료</p>
                <p className="text-lg font-bold text-brand-700">{learningStats.completed}</p>
              </div>
            </div>
            <p className="text-[11px] text-warm-400 mt-3">강좌관리 페이지에서 상세 진도율을 확인하세요</p>
          </Link>

          <Link to="/bingo" className="card p-5 hover:shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 size={15} className="text-warm-500" />
              <p className="font-bold text-brand-900 text-sm">빙고퀴즈 참여현황</p>
              <ArrowRight size={12} className="ml-auto text-warm-300 group-hover:text-brand-500 transition" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-warm-50 p-3">
                <p className="text-xs text-warm-500">빙고퀴즈</p>
                <p className="text-lg font-bold text-brand-700">5x5</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-accent-600">목표</p>
                <p className="text-lg font-bold text-amber-700">3줄</p>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-50 to-red-50 border border-amber-100 px-3 py-2 text-center">
              <p className="text-xs font-bold text-amber-700">3줄 완성 시 기프티콘 증정! 🎁</p>
            </div>
          </Link>
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
                    ? 'bg-warm-50 text-brand-700'
                    : item.color === 'blue'
                      ? 'bg-blue-50 text-blue-600'
                      : item.color === 'green'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-warm-50 text-brand-600'
                )}
              >
                <item.icon size={15} />
              </div>
              <p className="text-sm font-bold text-brand-900">{item.label}</p>
              <p className="text-xs text-warm-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
