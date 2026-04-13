import { useEffect, useMemo, useState } from 'react'
import { BarChart2, CheckCircle2, Clock, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { COURSE_CATALOG } from '../../data/courseCatalog'

type CourseProgress = {
  courseId: string
  courseTitle: string
  watchedSeconds: number
  durationSeconds: number
  progressPercent: number
  status: 'not_started' | 'in_progress' | 'completed'
  updatedAt: string
}

type Learner = {
  userId: string
  employeeId: string
  fullName: string
  department: string
  role: string
  courses: Record<string, CourseProgress>
}

type LearningResponse = {
  ok: boolean
  me: Learner | null
  learners: Learner[]
}

const COURSE = COURSE_CATALOG[0]

export default function LearningPage() {
  const [me, setMe] = useState<Learner | null>(null)
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/learning-progress', {
        headers: {
          authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      })

      const payload = (await response.json()) as LearningResponse
      setMe(payload.me)
      setLearners(payload.learners)
      setLoading(false)
    }

    void load()
  }, [])

  const rows = useMemo(() => {
    if (learners.length > 0) return learners
    return me ? [me] : []
  }, [learners, me])

  const completedCount = rows.filter(row => row.courses?.[COURSE.id]?.status === 'completed').length
  const inProgressCount = rows.filter(row => row.courses?.[COURSE.id]?.status === 'in_progress').length

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">LEARNING STATUS</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <BarChart2 size={28} className="text-brand-300" />
          학습현황
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          관리자 계정에서는 사번별 진도율, 이수완료 여부, 최근 학습시각을 한 번에 볼 수 있습니다.
          일반 사용자는 본인 진도율만 표시됩니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Users size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">조회 대상</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{rows.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">이수완료</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{completedCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Clock size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">수강중</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{inProgressCount}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-900">사번별 학습 대시보드</h2>
          <p className="mt-1 text-sm text-slate-500">{COURSE.title}</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-3">사번</th>
                  <th className="px-5 py-3">이름</th>
                  <th className="px-5 py-3">소속팀</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">진도율</th>
                  <th className="px-5 py-3">최근 업데이트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => {
                  const progress = row.courses?.[COURSE.id]
                  const status = progress?.status ?? 'not_started'
                  return (
                    <tr key={row.userId} className="text-sm text-slate-700">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.employeeId}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{row.fullName}</td>
                      <td className="px-5 py-4">{row.department}</td>
                      <td className="px-5 py-4">
                        <span className={status === 'completed' ? 'badge-green' : status === 'in_progress' ? 'badge-blue' : 'badge-gray'}>
                          {status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
                              style={{ width: `${progress?.progressPercent ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{progress?.progressPercent ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {progress?.updatedAt ? new Date(progress.updatedAt).toLocaleString('ko-KR') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && me && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-sm font-bold text-slate-900">개인 학습 데이터</p>
            <p className="mt-2 text-sm text-slate-600">
              본인 진도율 {me.courses?.[COURSE.id]?.progressPercent ?? 0}% /
              상태 {me.courses?.[COURSE.id]?.status === 'completed' ? '이수완료' : me.courses?.[COURSE.id]?.status === 'in_progress' ? '수강중' : '미시작'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
