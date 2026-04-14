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

        // 3) 고유 강좌 목록 추출
        const courseMap = new Map<string, string>()
        for (const p of progressData ?? []) {
          if (p.course_id && !courseMap.has(p.course_id)) {
            courseMap.set(p.course_id, p.course_name || `강좌 ${courseMap.size + 1}`)
          }
        }
        const courseList: CourseInfo[] = Array.from(courseMap.entries()).map(([id, name]) => ({ id, name }))
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

  const completedCount = filteredRows.filter(r => progressMap[r.id]?.status === 'completed').length
  const inProgressCount = filteredRows.filter(r => progressMap[r.id]?.status === 'in_progress').length
  const notStartedCount = filteredRows.length - completedCount - inProgressCount

  function downloadExcel() {
    const rows = filteredRows.map(row => {
      const progress = progressMap[row.id]
      const status = progress?.status ?? 'not_started'
      const courseName = selectedCourse === 'all' ? '전체' : (courses.find(c => c.id === selectedCourse)?.name ?? '-')
      return {
        '사번': row.employee_id ?? '-',
        '이름': row.full_name ?? '-',
        '소속팀': row.department ?? '-',
        '역할': row.role === 'admin' ? '관리자' : row.role === 'controller' ? '승인자' : '담당자',
        '강좌': courseName,
        '상태': status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작',
        '진도율(%)': progress?.progress_percent ?? 0,
        '최근 업데이트': progress?.updated_at ? new Date(progress.updated_at).toLocaleString('ko-KR') : '-',
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '학습현황')
    ws['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 22 },
    ]
    XLSX.writeFile(wb, `학습현황_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">LEARNING STATUS</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <BarChart2 size={28} className="text-brand-300" />
          학습현황
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          {isAdmin
            ? '전체 사용자의 진도율, 이수완료 여부, 최근 학습시각을 한 번에 볼 수 있습니다.'
            : '본인의 강좌 진도율과 학습 상태를 확인합니다.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Users size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">전체 대상</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{filteredRows.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">이수완료</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{completedCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Clock size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">수강중</p>
          <p className="mt-1 text-3xl font-black text-blue-600">{inProgressCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Users size={18} />
          </div>
          <p className="mt-4 text-sm text-slate-500">미시작</p>
          <p className="mt-1 text-3xl font-black text-slate-500">{notStartedCount}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="사번, 이름, 소속팀 검색..."
              className="form-input pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-slate-400" />
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
          <span className="text-xs text-slate-400">{filteredRows.length}명 표시</span>
          <button onClick={downloadExcel} className="btn-secondary py-2 text-xs ml-auto">
            <Download size={14} />
            엑셀 다운로드
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-900">사번별 학습 대시보드</h2>
          <p className="mt-1 text-sm text-slate-500">내부회계관리제도 강좌</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton h-12 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-slate-400">
            {search ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold text-slate-500">
                  <th className="px-5 py-3">사번</th>
                  <th className="px-5 py-3">이름</th>
                  <th className="px-5 py-3">소속팀</th>
                  <th className="px-5 py-3">역할</th>
                  {selectedCourse === 'all' && courses.length > 0 && <th className="px-5 py-3">강좌</th>}
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">진도율</th>
                  <th className="px-5 py-3">최근 업데이트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => {
                  const progress = progressMap[row.id]
                  const status = progress?.status ?? 'not_started'
                  const percent = progress?.progress_percent ?? 0
                  const userCourses = userCourseMap[row.id] ?? []
                  return (
                    <tr key={row.id} className="text-sm text-slate-700 hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.employee_id ?? '-'}</td>
                      <td className="px-5 py-4 font-semibold text-slate-900">{row.full_name ?? '-'}</td>
                      <td className="px-5 py-4">{row.department ?? '-'}</td>
                      <td className="px-5 py-4">
                        <span className={clsx(
                          'inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          row.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                          row.role === 'controller' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {row.role === 'admin' ? '관리자' : row.role === 'controller' ? '승인자' : '담당자'}
                        </span>
                      </td>
                      {selectedCourse === 'all' && courses.length > 0 && (
                        <td className="px-5 py-4">
                          {userCourses.length > 0 ? (
                            <div className="space-y-1">
                              {userCourses.map((uc, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className={clsx(
                                    'inline-block w-2 h-2 rounded-full',
                                    uc.status === 'completed' ? 'bg-emerald-500' :
                                    uc.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                                  )} />
                                  <span className="text-slate-600 truncate max-w-[140px]" title={uc.course_name || uc.course_id}>
                                    {uc.course_name || `강좌 ${idx + 1}`}
                                  </span>
                                  <span className="font-semibold text-slate-800">{uc.progress_percent}%</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span className={clsx(
                          'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                          status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          {status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{percent}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {progress?.updated_at ? new Date(progress.updated_at).toLocaleString('ko-KR') : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !isAdmin && profile && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
            <p className="text-sm font-bold text-slate-900">내 학습 데이터</p>
            {(userCourseMap[profile.id] ?? []).length > 0 ? (
              <div className="mt-2 space-y-2">
                {(userCourseMap[profile.id] ?? []).map((uc, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className={clsx(
                      'inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      uc.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      uc.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-500'
                    )}>
                      {uc.status === 'completed' ? '이수완료' : uc.status === 'in_progress' ? '수강중' : '미시작'}
                    </span>
                    <span className="font-medium text-slate-700">{uc.course_name || `강좌 ${idx + 1}`}</span>
                    <span className="text-slate-500">진도율 {uc.progress_percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                진도율 {progressMap[profile.id]?.progress_percent ?? 0}% /
                상태 {progressMap[profile.id]?.status === 'completed' ? '이수완료' : progressMap[profile.id]?.status === 'in_progress' ? '수강중' : '미시작'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
