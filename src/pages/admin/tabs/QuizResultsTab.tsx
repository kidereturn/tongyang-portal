import { useCallback, useEffect, useState } from 'react'
import { Award, Clock, Download, Search, Trophy, User, RotateCcw, Gamepad2 } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'
import * as XLSX from 'xlsx'

type QuizRow = {
  id: string
  user_id: string
  course_id: string
  score: number
  total_questions: number
  time_seconds: number
  created_at: string
  answers: Array<{ question_id: string; selected: string | null; correct: string; is_correct: boolean }>
  user_name: string | null
  user_dept: string | null
  employee_id: string | null
  course_title: string | null
}

type LearningRow = {
  user_id: string
  course_id: string
  watched_seconds: number
  duration_seconds: number
  progress_percent: number
  status: string
  updated_at: string
  user_name: string | null
  user_dept: string | null
  employee_id: string | null
  course_title: string | null
}

export default function QuizResultsTab() {
  const [quizResults, setQuizResults] = useState<QuizRow[]>([])
  const [learningData, setLearningData] = useState<LearningRow[]>([])
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; full_name: string | null; department: string | null; employee_id: string | null }>>([])
  const [courseList, setCourseList] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [view, setView] = useState<'quiz' | 'learning' | 'bingo'>('learning')
  const [bingoRows, setBingoRows] = useState<Array<{ user_id: string; user_name: string | null; user_dept: string | null; employee_id: string | null; lines_this_month: number; total_attempts: number; total_correct: number }>>([])

  async function resetUserData(userId: string, userName: string, type: 'quiz' | 'bingo' | 'all') {
    const label = type === 'quiz' ? '퀴즈 결과' : type === 'bingo' ? '빙고 기록' : '모든 포인트·퀴즈·빙고 기록'
    if (!window.confirm(`${userName}님의 ${label}을(를) 초기화합니다.\n\n복구 불가. 계속할까요?`)) return
    const db = supabase as any
    try {
      if (type === 'quiz' || type === 'all') await db.from('quiz_results').delete().eq('user_id', userId)
      if (type === 'bingo' || type === 'all') await db.from('bingo_achievements').delete().eq('user_id', userId)
      if (type === 'all') await db.from('user_points').delete().eq('user_id', userId)
      window.alert('초기화 완료')
      fetchData()
    } catch (e) {
      window.alert('초기화 실패: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch quiz results
      const { data: qData } = await (supabase as any)
        .from('quiz_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      // Fetch learning progress
      const { data: lData } = await (supabase as any)
        .from('learning_progress')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(500)

      // Fetch ALL user profiles
      const { data: profilesList } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, department, employee_id')
        .order('employee_id', { ascending: true })
      setAllProfiles(profilesList ?? [])

      const userMap: Record<string, { full_name: string | null; department: string | null; employee_id: string | null }> = {}
      for (const p of profilesList ?? []) {
        userMap[p.id] = { full_name: p.full_name, department: p.department, employee_id: p.employee_id }
      }

      // Fetch ALL course videos
      const { data: coursesList } = await (supabase as any)
        .from('course_videos')
        .select('id, title')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      setCourseList(coursesList ?? [])

      const courseMap: Record<string, string> = {}
      for (const c of coursesList ?? []) {
        courseMap[c.id] = c.title
      }

      // Map quiz results
      const mappedQuiz: QuizRow[] = (qData ?? []).map((r: any) => ({
        ...r,
        user_name: userMap[r.user_id]?.full_name ?? null,
        user_dept: userMap[r.user_id]?.department ?? null,
        employee_id: userMap[r.user_id]?.employee_id ?? null,
        course_title: courseMap[r.course_id] ?? null,
      }))

      // Map learning data
      const mappedLearning: LearningRow[] = (lData ?? []).map((r: any) => ({
        ...r,
        user_name: userMap[r.user_id]?.full_name ?? null,
        user_dept: userMap[r.user_id]?.department ?? null,
        employee_id: userMap[r.user_id]?.employee_id ?? null,
        course_title: courseMap[r.course_id] ?? null,
      }))

      setQuizResults(mappedQuiz)
      setLearningData(mappedLearning)

      // Fetch bingo monthly stats — 이달 빙고 1줄 완성 누적 + 참여 정답 수
      const firstDayOfMonth = new Date(); firstDayOfMonth.setDate(1); firstDayOfMonth.setHours(0, 0, 0, 0)
      const { data: bingoAch } = await (supabase as any)
        .from('bingo_achievements')
        .select('user_id, max_lines, created_at')
        .gte('created_at', firstDayOfMonth.toISOString())
      const { data: quizHits } = await (supabase as any)
        .from('quiz_results')
        .select('user_id, score, total_questions')
        .gte('created_at', firstDayOfMonth.toISOString())
      const bingoByUser: Record<string, { lines: number; total: number; correct: number }> = {}
      for (const r of bingoAch ?? []) {
        const u = r.user_id
        if (!bingoByUser[u]) bingoByUser[u] = { lines: 0, total: 0, correct: 0 }
        bingoByUser[u].lines += r.max_lines ?? 0
      }
      for (const r of quizHits ?? []) {
        const u = r.user_id
        if (!bingoByUser[u]) bingoByUser[u] = { lines: 0, total: 0, correct: 0 }
        bingoByUser[u].total += r.total_questions ?? 0
        bingoByUser[u].correct += r.score ?? 0
      }
      const bingoSum = (profilesList ?? []).map((p: any) => ({
        user_id: p.id,
        user_name: p.full_name,
        user_dept: p.department,
        employee_id: p.employee_id,
        lines_this_month: bingoByUser[p.id]?.lines ?? 0,
        total_attempts: bingoByUser[p.id]?.total ?? 0,
        total_correct: bingoByUser[p.id]?.correct ?? 0,
      })).sort((a: any, b: any) => b.lines_this_month - a.lines_this_month)
      setBingoRows(bingoSum)
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function formatTime(seconds: number) {
    if (!seconds || seconds <= 0) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    if (m > 0) return `${m}분 ${s}초`
    return `${s}초`
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleString('ko-KR', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const filteredQuiz = quizResults.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (r.user_name?.toLowerCase().includes(s)) ||
      (r.employee_id?.toLowerCase().includes(s)) ||
      (r.user_dept?.toLowerCase().includes(s)) ||
      (r.course_title?.toLowerCase().includes(s))
  })

  // Build full user-course matrix for "all users" view
  const filteredLearning = (() => {
    // Start with all profiles x selected course(s)
    const result: LearningRow[] = []
    const progressKey = (uid: string, cid: string) => `${uid}__${cid}`
    const progressLookup = new Map<string, LearningRow>()
    for (const r of learningData) progressLookup.set(progressKey(r.user_id, r.course_id), r)

    const coursesToShow = selectedCourse === 'all' ? courseList : courseList.filter(c => c.id === selectedCourse)

    for (const p of allProfiles) {
      for (const c of coursesToShow) {
        const existing = progressLookup.get(progressKey(p.id, c.id))
        result.push(existing ?? {
          user_id: p.id, course_id: c.id, watched_seconds: 0, duration_seconds: 0,
          progress_percent: 0, status: 'not_started', updated_at: '',
          user_name: p.full_name, user_dept: p.department, employee_id: p.employee_id,
          course_title: c.title,
        })
      }
    }

    if (!search) return result
    const s = search.toLowerCase()
    return result.filter(r =>
      (r.user_name?.toLowerCase().includes(s)) ||
      (r.employee_id?.toLowerCase().includes(s)) ||
      (r.user_dept?.toLowerCase().includes(s)) ||
      (r.course_title?.toLowerCase().includes(s))
    )
  })()

  function downloadExcel() {
    if (view === 'learning') {
      const rows = filteredLearning.map(r => ({
        '사번': r.employee_id ?? '',
        '이름': r.user_name ?? '',
        '부서': r.user_dept ?? '',
        '강좌': r.course_title ?? '',
        '시청시간(초)': r.watched_seconds,
        '총길이(초)': r.duration_seconds,
        '진도율(%)': r.progress_percent,
        '상태': r.status === 'completed' ? '수료' : r.status === 'in_progress' ? '진행중' : '미시작',
        '최종수강일': r.updated_at ? new Date(r.updated_at).toLocaleString('ko-KR') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '강좌수강현황')
      XLSX.writeFile(wb, `강좌수강현황_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } else {
      const rows = filteredQuiz.map(r => ({
        '사번': r.employee_id ?? '',
        '이름': r.user_name ?? '',
        '부서': r.user_dept ?? '',
        '강좌': r.course_title ?? '',
        '점수': `${r.score}/${r.total_questions}`,
        '정답률(%)': Math.round((r.score / r.total_questions) * 100),
        '소요시간(초)': r.time_seconds,
        '응시일': r.created_at ? new Date(r.created_at).toLocaleString('ko-KR') : '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '퀴즈결과')
      XLSX.writeFile(wb, `퀴즈결과_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
  }

  // Stats
  const totalLearners = new Set(learningData.map(r => r.user_id)).size
  const completedCount = learningData.filter(r => r.status === 'completed').length
  const avgQuizScore = quizResults.length > 0
    ? Math.round(quizResults.reduce((sum, r) => sum + (r.score / r.total_questions) * 100, 0) / quizResults.length)
    : 0

  return (
    <div className="space-y-5">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
          <User size={20} className="text-brand-500" />
          <p className="mt-2 text-2xl font-bold text-brand-900">{totalLearners}</p>
          <p className="text-xs text-warm-500">수강자 수</p>
        </div>
        <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
          <Trophy size={20} className="text-emerald-500" />
          <p className="mt-2 text-2xl font-bold text-brand-900">{completedCount}</p>
          <p className="text-xs text-warm-500">수료 건수</p>
        </div>
        <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
          <Award size={20} className="text-accent-600" />
          <p className="mt-2 text-2xl font-bold text-brand-900">{quizResults.length}</p>
          <p className="text-xs text-warm-500">퀴즈 응시</p>
        </div>
        <div className="rounded-lg border border-warm-200 bg-white p-4 shadow-sm">
          <Clock size={20} className="text-brand-600" />
          <p className="mt-2 text-2xl font-bold text-brand-900">{avgQuizScore}%</p>
          <p className="text-xs text-warm-500">평균 퀴즈 점수</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-warm-200 bg-white p-1">
          <button
            onClick={() => setView('learning')}
            className={clsx('rounded-lg px-4 py-2 text-sm font-semibold transition',
              view === 'learning' ? 'bg-brand-800 text-white shadow' : 'text-warm-600 hover:bg-warm-50'
            )}
          >
            강좌 수강현황
          </button>
          <button
            onClick={() => setView('quiz')}
            className={clsx('rounded-lg px-4 py-2 text-sm font-semibold transition',
              view === 'quiz' ? 'bg-brand-800 text-white shadow' : 'text-warm-600 hover:bg-warm-50'
            )}
          >
            퀴즈 결과
          </button>
          <button
            onClick={() => setView('bingo')}
            className={clsx('rounded-lg px-4 py-2 text-sm font-semibold transition flex items-center gap-1',
              view === 'bingo' ? 'bg-brand-800 text-white shadow' : 'text-warm-600 hover:bg-warm-50'
            )}
          >
            <Gamepad2 size={14} /> 빙고 현황
          </button>
        </div>

        {view === 'learning' && (
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-xs font-medium text-brand-700 min-w-[160px]"
          >
            <option value="all">전체 강좌</option>
            {courseList.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
          <input
            type="text"
            placeholder="이름, 사번, 부서 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-warm-200 bg-white py-2.5 pl-10 pr-4 text-xs focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <button onClick={downloadExcel} className="btn-secondary">
          <Download size={16} />Excel 다운로드
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-warm-400">데이터를 불러오는 중...</div>
      ) : view === 'bingo' ? (
        /* Bingo Monthly Leaderboard */
        <div className="overflow-x-auto rounded-lg border border-warm-200 bg-white shadow-sm">
          <div className="border-b border-warm-100 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            이번 달 빙고 1줄 완성 누적 (내림차순). 월말 TOP 3 에게 상품 지급: 🥇치킨세트 · 🥈배민 1만원 · 🥉스타벅스 아아
          </div>
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th className="text-center">순위</th>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th className="text-center">이달 완성 줄</th>
                <th className="text-center">이달 참여</th>
                <th className="text-center">이달 정답</th>
                <th className="text-center">초기화</th>
              </tr>
            </thead>
            <tbody>
              {bingoRows.filter(r =>
                !search ||
                (r.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (r.employee_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
                (r.user_dept ?? '').toLowerCase().includes(search.toLowerCase())
              ).slice(0, 200).map((r, idx) => {
                const rank = idx + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
                return (
                  <tr key={r.user_id}>
                    <td className="text-center font-bold">{medal || rank}</td>
                    <td className="font-mono text-xs">{r.employee_id ?? '-'}</td>
                    <td className="font-semibold">{r.user_name ?? '-'}</td>
                    <td>{r.user_dept ?? '-'}</td>
                    <td className="text-center font-bold text-brand-700">{r.lines_this_month}</td>
                    <td className="text-center">{r.total_attempts}</td>
                    <td className="text-center text-emerald-600 font-bold">{r.total_correct}</td>
                    <td className="text-center">
                      <button
                        onClick={() => resetUserData(r.user_id, r.user_name ?? '', 'bingo')}
                        className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-100 text-red-600 text-[11px] px-2 py-1 hover:bg-red-100"
                        title="이 사용자의 빙고 기록 초기화"
                      >
                        <RotateCcw size={10} /> 초기화
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : view === 'learning' ? (
        /* Learning Progress Table */
        <div className="overflow-x-auto rounded-lg border border-warm-200 bg-white shadow-sm">
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th>강좌</th>
                <th className="text-center">시청시간</th>
                <th className="text-center">총길이</th>
                <th className="text-center">진도율</th>
                <th className="text-center">상태</th>
                <th>최종수강일</th>
              </tr>
            </thead>
            <tbody>
              {filteredLearning.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-warm-400">데이터 없음</td></tr>
              ) : (
                filteredLearning.map(r => (
                  <tr key={`${r.user_id}-${r.course_id}`}>
                    <td className="font-mono text-xs">{r.employee_id ?? '-'}</td>
                    <td className="font-semibold">{r.user_name ?? '-'}</td>
                    <td>{r.user_dept ?? '-'}</td>
                    <td className="max-w-[200px] truncate" title={r.course_title ?? ''}>{r.course_title ?? '-'}</td>
                    <td className="text-center">{formatTime(r.watched_seconds)}</td>
                    <td className="text-center">{formatTime(r.duration_seconds)}</td>
                    <td className="text-center">
                      <span className={clsx('font-bold',
                        r.progress_percent >= 95 ? 'text-emerald-600' :
                        r.progress_percent >= 50 ? 'text-blue-600' : 'text-warm-500'
                      )}>
                        {r.progress_percent}%
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={clsx('inline-block rounded-full px-2.5 py-1 text-xs font-bold',
                        r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-warm-100 text-warm-500'
                      )}>
                        {r.status === 'completed' ? '수료' : r.status === 'in_progress' ? '진행중' : '미시작'}
                      </span>
                    </td>
                    <td className="text-xs text-warm-500">{r.updated_at ? formatDate(r.updated_at) : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Quiz Results Table */
        <div className="overflow-x-auto rounded-lg border border-warm-200 bg-white shadow-sm">
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th>사번</th>
                <th>이름</th>
                <th>부서</th>
                <th>강좌</th>
                <th className="text-center">점수</th>
                <th className="text-center">정답률</th>
                <th className="text-center">소요시간</th>
                <th>응시일</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuiz.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-warm-400">퀴즈 응시 데이터 없음</td></tr>
              ) : (
                filteredQuiz.map(r => {
                  const pct = Math.round((r.score / r.total_questions) * 100)
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.employee_id ?? '-'}</td>
                      <td className="font-semibold">{r.user_name ?? '-'}</td>
                      <td>{r.user_dept ?? '-'}</td>
                      <td className="max-w-[200px] truncate" title={r.course_title ?? ''}>{r.course_title ?? '-'}</td>
                      <td className="text-center font-bold">{r.score}/{r.total_questions}</td>
                      <td className="text-center">
                        <span className={clsx('font-bold',
                          pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : 'text-red-500'
                        )}>
                          {pct}%
                        </span>
                      </td>
                      <td className="text-center">{formatTime(r.time_seconds)}</td>
                      <td className="text-xs text-warm-500">{formatDate(r.created_at)}</td>
                      <td className="text-center">
                        <button
                          onClick={() => resetUserData(r.user_id, r.user_name ?? '', 'quiz')}
                          className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-100 text-red-600 text-[11px] px-2 py-1 hover:bg-red-100"
                          title="이 사용자의 모든 퀴즈 기록 초기화"
                        >
                          <RotateCcw size={10} /> 초기화
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
