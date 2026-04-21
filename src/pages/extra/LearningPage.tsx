import { useEffect, useMemo, useState } from 'react'
import { BarChart2, CheckCircle2, Clock, Download, Search, Users, BookOpen } from 'lucide-react'
import clsx from 'clsx'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type ProfileRow = {
  id: string
  employee_id: string | null
  full_name: string | null
  department: string | null
  role: string
  is_active: boolean
}

type ProgressRow = {
  user_id: string
  course_id: string
  course_name?: string
  watched_seconds: number
  duration_seconds: number
  progress_percent: number
  status: string
  updated_at: string
}

type CourseInfo = {
  id: string
  name: string
}

export default function LearningPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([])
  const [allProgress, setAllProgress] = useState<ProgressRow[]>([])
  const [courses, setCourses] = useState<CourseInfo[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    async function load() {
      try {
        // 1) 모든 활성 사용자 프로필 가져오기
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, employee_id, full_name, department, role, is_active')
          .eq('is_active', true)
          .order('employee_id', { ascending: true }) as { data: ProfileRow[] | null }

        setAllProfiles(profiles ?? [])

        // 2) learning_progress 테이블에서 전체 진도 데이터 가져오기
        const { data: progressData } = await (supabase as any)
          .from('learning_progress')
          .select('*') as { data: ProgressRow[] | null }

        setAllProgress(progressData ?? [])

        // 3) 전체 강좌 목록을 course_videos 테이블에서 가져오기
        const { data: videoData } = await (supabase as any)
          .from('course_videos')
          .select('id, title')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        const courseList: CourseInfo[] = (videoData ?? []).map((v: { id: string; title: string }) => ({ id: v.id, name: v.title }))
        setCourses(courseList)
      } catch (err) {
        console.error('[LearningPage] load error:', err)
      } finally {
        setLoading(false)
      }
    }

    void load()

    // 2분마다 자동 새로고침 (관리자용 실시간 반영)
    const interval = setInterval(load, 120_000)
    return () => clearInterval(interval)
  }, [])

  // 선택된 강좌에 맞는 progress 맵 생성
  const progressMap = useMemo(() => {
    const map: Record<string, ProgressRow> = {}
    for (const p of allProgress) {
      if (selectedCourse !== 'all' && p.course_id !== selectedCourse) continue
      // 같은 user_id에 여러 항목이 있으면 가장 높은 진도 사용
      if (!map[p.user_id] || p.progress_percent > map[p.user_id].progress_percent) {
        map[p.user_id] = p
      }
    }
    return map
  }, [allProgress, selectedCourse])

  // 전체 강좌별 유저 진도 (모든 강좌 표시용)
  const userCourseMap = useMemo(() => {
    const map: Record<string, ProgressRow[]> = {}
    for (const p of allProgress) {
      if (!map[p.user_id]) map[p.user_id] = []
      map[p.user_id].push(p)
    }
    return map
  }, [allProgress])

  // 관리자는 전체, 일반 사용자는 본인만
  const filteredRows = useMemo(() => {
    let rows = allProfiles
    if (!isAdmin) {
      rows = rows.filter(p => p.id === profile?.id)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(p =>
        (p.employee_id ?? '').toLowerCase().includes(q) ||
        (p.full_name ?? '').toLowerCase().includes(q) ||
        (p.department ?? '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [allProfiles, isAdmin, profile?.id, search])

  // Flatten: one row per (user, course) combination
  type FlatRow = {
    profile: ProfileRow
    progress: ProgressRow | null
    courseName: string
  }
  const flatRows = useMemo(() => {
    const result: FlatRow[] = []
    for (const row of filteredRows) {
      const userCourses = userCourseMap[row.id] ?? []
      const progressByCourse = new Map(userCourses.map(uc => [uc.course_id, uc]))
      if (selectedCourse === 'all') {
        // Show ALL courses for each user (including unstarted)
        for (const c of courses) {
          const prog = progressByCourse.get(c.id)
          result.push({
            profile: row,
            progress: prog ?? null,
            courseName: c.name,
          })
        }
        // If no courses exist, show a placeholder
        if (courses.length === 0) {
          result.push({ profile: row, progress: null, courseName: '-' })
        }
      } else {
        const matched = progressByCourse.get(selectedCourse)
        result.push({
          profile: row,
          progress: matched ?? null,
          courseName: courses.find(c => c.id === selectedCourse)?.name ?? '-',
        })
      }
    }
    return result
  }, [filteredRows, userCourseMap, selectedCourse, courses])

  // Stats based on flatRows (per user-course pair) for accurate counting
  const completedCount = flatRows.filter(fr => fr.progress?.status === 'completed').length
  const inProgressCount = flatRows.filter(fr => fr.progress?.status === 'in_progress').length
  const notStartedCount = flatRows.filter(fr => !fr.progress || fr.progress.status === 'not_started').length

  // Status filter — admin can sort by 미시작 / 수강중 / 이수완료
  const visibleRows = useMemo(() => {
    if (statusFilter === 'all') return flatRows
    if (statusFilter === 'not_started') return flatRows.filter(fr => !fr.progress || fr.progress.status === 'not_started')
    if (statusFilter === 'in_progress') return flatRows.filter(fr => fr.progress?.status === 'in_progress')
    if (statusFilter === 'completed') return flatRows.filter(fr => fr.progress?.status === 'completed')
    return flatRows
  }, [flatRows, statusFilter])

  function downloadExcel() {
    const rows = flatRows.map(fr => {
      const status = fr.progress?.status ?? 'not_started'
      return {
        '사번': fr.profile.employee_id ?? '-',
        '이름': fr.profile.full_name ?? '-',
        '소속팀': fr.profile.department ?? '-',
        '강좌': fr.courseName,
        '상태': status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작',
        '진도율(%)': fr.progress?.progress_percent ?? 0,
        '최근 업데이트': fr.progress?.updated_at ? new Date(fr.progress.updated_at).toLocaleString('ko-KR') : '-',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '강좌관리')
    ws['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 22 },
    ]
    XLSX.writeFile(wb, `강좌관리_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">Learning<span className="sep" />강좌관리</div>
            <h1>강좌관리. <span className="soft">진도와 이수 현황.</span></h1>
            <p className="lead">
              {isAdmin
                ? '전체 사용자의 진도율, 이수완료 여부, 최근 학습시각을 한 번에 볼 수 있습니다.'
                : '본인의 강좌 진도율과 학습 상태를 확인합니다.'}
            </p>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)' }}>
              <BarChart2 size={14} /> {(isAdmin ? flatRows.length : courses.length).toLocaleString()}건
            </div>
          </div>
        </div>
      </div>

      <div className="pg-body space-y-6">

      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className="rounded-[24px] border bg-white p-5 shadow-sm text-left transition-all cursor-pointer"
          style={{ borderColor: statusFilter === 'all' ? '#3182F6' : 'var(--at-ink-hair)', boxShadow: statusFilter === 'all' ? '0 0 0 3px rgba(49,130,246,0.1)' : 'none' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-50 text-brand-700">
            <Users size={18} />
          </div>
          <p className="mt-4 text-sm text-warm-500">전체 강좌</p>
          <p className="mt-1 text-3xl font-bold text-brand-900">{(isAdmin ? flatRows.length : courses.length).toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className="rounded-[24px] border bg-white p-5 shadow-sm text-left transition-all cursor-pointer"
          style={{ borderColor: statusFilter === 'completed' ? '#10B981' : 'var(--at-ink-hair)', boxShadow: statusFilter === 'completed' ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <p className="mt-4 text-sm text-warm-500">이수완료</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{completedCount.toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className="rounded-[24px] border bg-white p-5 shadow-sm text-left transition-all cursor-pointer"
          style={{ borderColor: statusFilter === 'in_progress' ? '#3182F6' : 'var(--at-ink-hair)', boxShadow: statusFilter === 'in_progress' ? '0 0 0 3px rgba(49,130,246,0.1)' : 'none' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock size={18} />
          </div>
          <p className="mt-4 text-sm text-warm-500">수강중</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{inProgressCount.toLocaleString()}</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('not_started')}
          className="rounded-[24px] border bg-white p-5 shadow-sm text-left transition-all cursor-pointer"
          style={{ borderColor: statusFilter === 'not_started' ? '#6B7280' : 'var(--at-ink-hair)', boxShadow: statusFilter === 'not_started' ? '0 0 0 3px rgba(107,114,128,0.12)' : 'none' }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warm-100 text-warm-500">
            <Users size={18} />
          </div>
          <p className="mt-4 text-sm text-warm-500">미시작</p>
          <p className="mt-1 text-3xl font-bold text-warm-500">{notStartedCount.toLocaleString()}</p>
        </button>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="사번, 이름, 소속팀 검색..."
              className="form-input pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-warm-400" />
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="form-input text-sm py-2 min-w-[180px]"
            >
              <option value="all">전체 강좌</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <span className="text-xs text-warm-400">{filteredRows.length}명 표시</span>
          <button onClick={downloadExcel} className="btn-secondary py-2 text-xs ml-auto">
            <Download size={14} />
            엑셀 다운로드
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-warm-200 bg-white shadow-md">
        <div className="border-b border-warm-100 px-5 py-4">
          <h2 className="text-lg font-bold text-brand-900">강좌관리</h2>
          <p className="mt-1 text-sm text-warm-500">내부회계관리제도 강좌 학습현황</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-warm-400">
            {search ? '검색 결과가 없습니다.' : statusFilter !== 'all' ? `선택한 상태(${statusFilter === 'completed' ? '이수완료' : statusFilter === 'in_progress' ? '수강중' : '미시작'})의 데이터가 없습니다.` : '등록된 사용자가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-warm-50">
                <tr className="text-left text-xs font-semibold text-warm-500">
                  <th className="px-5 py-3">사번</th>
                  <th className="px-5 py-3">이름</th>
                  <th className="px-5 py-3">소속팀</th>
                  <th className="px-5 py-3">강좌</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">진도율</th>
                  <th className="px-5 py-3">최근 업데이트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((fr, idx) => {
                  const status = fr.progress?.status ?? 'not_started'
                  const percent = fr.progress?.progress_percent ?? 0
                  return (
                    <tr key={`${fr.profile.id}-${fr.progress?.course_id ?? idx}`} className="text-sm text-brand-700 hover:bg-warm-50/50">
                      <td className="px-5 py-4 font-mono text-xs text-warm-500">{fr.profile.employee_id ?? '-'}</td>
                      <td className="px-5 py-4 font-semibold text-brand-900">{fr.profile.full_name ?? '-'}</td>
                      <td className="px-5 py-4">{fr.profile.department ?? '-'}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-brand-700 font-medium">{fr.courseName}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={clsx(
                          'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-warm-100 text-warm-500'
                        )}>
                          {status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-warm-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-warm-600">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-warm-500">
                        {fr.progress?.updated_at ? new Date(fr.progress.updated_at).toLocaleString('ko-KR') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !isAdmin && profile && (
          <div className="border-t border-warm-100 bg-warm-50 px-5 py-4">
            <p className="text-sm font-bold text-brand-900">내 학습 데이터</p>
            {(userCourseMap[profile.id] ?? []).length > 0 ? (
              <div className="mt-2 space-y-2">
                {(userCourseMap[profile.id] ?? []).map((uc, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className={clsx(
                      'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      uc.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      uc.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-warm-100 text-warm-500'
                    )}>
                      {uc.status === 'completed' ? '이수완료' : uc.status === 'in_progress' ? '수강중' : '미시작'}
                    </span>
                    <span className="font-medium text-brand-700">{uc.course_name || `강좌 ${idx + 1}`}</span>
                    <span className="text-warm-500">진도율 {uc.progress_percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-warm-600">
                진도율 {progressMap[profile.id]?.progress_percent ?? 0}% /
                상태 {progressMap[profile.id]?.status === 'completed' ? '이수완료' : progressMap[profile.id]?.status === 'in_progress' ? '수강중' : '미시작'}
              </p>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  )
}
