import { useEffect, useState, useCallback } from 'react'
import {
  FileCheck2, Upload, CheckCircle2, Clock,
  Search, RefreshCw, Download, Filter,
  AlertCircle, ChevronRight
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'
import EvidenceUploadModal from './EvidenceUploadModal'

interface Activity {
  id: string
  control_code: string
  owner_name: string | null
  department: string | null
  title: string | null
  description: string | null
  controller_name: string | null
  kpi_score: number | null
  submission_status: string
  unique_key: string | null
  owner_id: string | null
  controller_id: string | null
  owner_email: string | null
  controller_email: string | null
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  '미완료': { label: '미완료', cls: 'badge-yellow' },
  '완료':   { label: '상신완료', cls: 'badge-blue' },
  '승인':   { label: '승인완료', cls: 'badge-green' },
  '반려':   { label: '반려',     cls: 'badge-red' },
}

export default function EvidenceListPage() {
  const { profile } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [filtered,   setFiltered]   = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [evidenceCounts, setEvidenceCounts] = useState<Record<string, number>>({})
  const [approvalStatuses, setApprovalStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (loadError) {
      console.warn(loadError)
    }
  }, [loadError])

  const fetchActivities = useCallback(async () => {
    if (!profile) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    try {
      let q = db.from('activities').select('id, control_code, owner_name, department, title, description, controller_name, kpi_score, submission_status, unique_key, owner_id, controller_id, owner_email, controller_email, owner_employee_id, controller_employee_id').eq('active', true)
      if (profile.role === 'owner') {
        if (profile.employee_id) q = q.eq('owner_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('owner_name', profile.full_name)
        else q = q.eq('owner_id', profile.id)
      } else if (profile.role === 'controller') {
        if (profile.employee_id) q = q.eq('controller_employee_id', profile.employee_id)
        else if (profile.full_name) q = q.eq('controller_name', profile.full_name)
        else q = q.eq('controller_id', profile.id)
      }
      q = q.order('control_code').order('department')

      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('evidence_timeout')), 15000)
      })

      const { data } = await Promise.race([q, timeout]) as { data: Activity[] | null }
      const rows = data ?? []
      setActivities(rows)
      setFiltered(rows)

      // Load evidence counts and approval statuses in parallel
      const activityIds = rows.map((r: Activity) => r.id)
      if (activityIds.length > 0) {
        const [uploadsRes, approvalsRes] = await Promise.all([
          db.from('evidence_uploads').select('activity_id').in('activity_id', activityIds),
          db.from('approval_requests').select('activity_id, status').in('activity_id', activityIds),
        ])
        const counts: Record<string, number> = {}
        for (const u of uploadsRes.data ?? []) {
          counts[u.activity_id] = (counts[u.activity_id] ?? 0) + 1
        }
        setEvidenceCounts(counts)

        const statuses: Record<string, string> = {}
        for (const a of approvalsRes.data ?? []) {
          statuses[a.activity_id] = a.status
        }
        setApprovalStatuses(statuses)
      }
    } catch {
      setActivities([])
      setFiltered([])
      setLoadError('증빙 목록 조회가 지연되어 빈 상태로 전환했습니다. 새로 고침으로 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role, profile?.employee_id, profile?.full_name])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  useEffect(() => {
    let r = activities
    if (search) {
      const s = search.toLowerCase()
      r = r.filter(a =>
        a.control_code?.toLowerCase().includes(s) ||
        a.title?.toLowerCase().includes(s) ||
        a.department?.toLowerCase().includes(s) ||
        a.owner_name?.toLowerCase().includes(s)
      )
    }
    if (statusFilter !== 'all') r = r.filter(a => a.submission_status === statusFilter)
    setFiltered(r)
  }, [search, statusFilter, activities])

  const stats = {
    total:    activities.length,
    pending:  activities.filter(a => a.submission_status === '미완료').length,
    complete: activities.filter(a => a.submission_status === '완료').length,
    approved: activities.filter(a => a.submission_status === '승인').length,
    rejected: activities.filter(a => a.submission_status === '반려').length,
  }
  const rate = stats.total > 0 ? Math.round((stats.complete + stats.approved) / stats.total * 100) : 0

  function openUploadModal(act: Activity) { setSelectedActivity(act); setModalOpen(true) }
  function handleClose(refresh?: boolean) { setModalOpen(false); setSelectedActivity(null); if (refresh) fetchActivities() }

  function downloadExcel() {
    const rows = filtered.map((a, i) => ({
      '번호': i + 1,
      '통제번호': a.control_code ?? '',
      '담당자': a.owner_name ?? '',
      '관련부서': a.department ?? '',
      '통제활동명': a.title ?? '',
      '제출증빙설명': a.description ?? '',
      '승인자': a.controller_name ?? '',
      'KPI점수': a.kpi_score ?? '',
      '상신여부': a.submission_status ?? '',
      '증빙수': evidenceCounts[a.id] ?? 0,
      '승인상태': approvalStatuses[a.id] === 'approved' ? '승인완료' : approvalStatuses[a.id] === 'rejected' ? '반려' : approvalStatuses[a.id] === 'submitted' ? '승인대기' : '-',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 5 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 40 },
      { wch: 36 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '증빙관리')
    XLSX.writeFile(wb, `증빙관리_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (loading) return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="skeleton h-6 w-24 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="skeleton h-8 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-6 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="p-4 border-b border-gray-50 flex items-center gap-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-4 w-20 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-5 pb-mobile-tab lg:pb-0">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <FileCheck2 size={22} className="text-brand-600" />
            증빙관리
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {profile?.role === 'owner'
              ? '담당 통제활동의 증빙을 업로드하고 결재상신합니다'
              : profile?.role === 'controller'
              ? '담당 통제활동의 증빙 제출 현황'
              : `전체 증빙관리 현황`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchActivities} className="btn-ghost text-xs px-3 py-2">
            <RefreshCw size={14} />새로고침
          </button>
          <button onClick={downloadExcel} className="btn-secondary text-xs px-3 py-2">
            <Download size={14} />엑셀 다운로드
          </button>
        </div>
      </div>

      {/* KPI 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: FileCheck2,   color: 'brand', label: '전체',   value: stats.total,    unit: '건' },
          { icon: Clock,        color: 'amber', label: '미완료',  value: stats.pending,  unit: '건' },
          { icon: Upload,       color: 'blue',  label: '상신완료', value: stats.complete, unit: '건' },
          { icon: CheckCircle2, color: 'green', label: '승인완료', value: stats.approved, unit: '건' },
          { icon: AlertCircle,  color: 'red',   label: '반려',    value: stats.rejected, unit: '건' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center mb-2',
              s.color === 'brand' ? 'bg-brand-50 text-brand-600' :
              s.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              s.color === 'blue'  ? 'bg-blue-50 text-blue-600' :
              s.color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            )}>
              <s.icon size={16} />
            </div>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-black text-gray-900">{s.value}<span className="text-xs text-gray-400 font-normal ml-0.5">{s.unit}</span></p>
          </div>
        ))}
      </div>

      {/* 완료율 바 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">전체 완료율</p>
          <p className="text-sm font-black text-brand-600">{rate}%</p>
        </div>
        <div className="bg-gray-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-brand-500 to-emerald-500 h-2 rounded-full transition-all duration-700"
            style={{ width: `${rate}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          완료 {stats.complete + stats.approved}건 / 전체 {stats.total}건
        </p>
      </div>

      {/* 오류 메시지 */}
      {loadError && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 border-amber-100">
          {loadError}
        </div>
      )}

      {/* 검색/필터 */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="통제번호, 담당자, 통제활동명 검색..."
              className="form-input pl-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={14} className="text-gray-400" />
            {[
              { key: 'all', label: '전체' },
              { key: '미완료', label: '미완료' },
              { key: '완료', label: '상신완료' },
              { key: '승인', label: '승인완료' },
              { key: '반려', label: '반려' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                  statusFilter === f.key
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertCircle size={32} className="mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">데이터가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th className="text-center w-8">#</th>
                  <th>통제번호</th>
                  {profile?.role !== 'owner' && <th>담당자</th>}
                  <th>관련부서</th>
                  <th className="min-w-[180px]">통제활동명</th>
                  <th className="min-w-[160px]">제출 증빙 설명</th>
                  <th className="text-center min-w-[120px]">증빙 Upload</th>
                  <th className="text-center min-w-[80px]">증빙수</th>
                  {profile?.role === 'admin' && <th>승인자</th>}
                  <th className="text-center min-w-[90px]">KPI점수</th>
                  <th className="text-center min-w-[100px]">상신여부</th>
                  <th className="text-center min-w-[100px]">승인상태</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((act, i) => {
                  const si = STATUS_MAP[act.submission_status] ?? STATUS_MAP['미완료']
                  const canUpload = profile?.role === 'owner' && act.submission_status !== '승인'
                  const isView = profile?.role === 'controller' || (profile?.role === 'admin')
                  return (
                    <tr key={act.id} className="group">
                      <td className="text-center text-sm text-gray-400 py-3">{i + 1}</td>
                      <td className="py-3">
                        <code className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded font-semibold">
                          {act.control_code}
                        </code>
                      </td>
                      {profile?.role !== 'owner' && (
                        <td className="font-semibold text-sm text-gray-800 py-3">{act.owner_name ?? '-'}</td>
                      )}
                      <td className="text-sm text-gray-600 py-3">{act.department ?? '-'}</td>
                      <td className="py-3">
                        <span className="text-sm font-medium text-gray-700 cursor-help" title={act.title ?? ''}>
                          {act.title && act.title.length > 36 ? act.title.slice(0, 36) + '…' : (act.title ?? '-')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-600 cursor-help" title={act.description ?? ''}>
                          {act.description && act.description.length > 40 ? act.description.slice(0, 40) + '…' : (act.description ?? '-')}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        {canUpload ? (
                          <button
                            onClick={() => openUploadModal(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 border border-brand-100 rounded-lg text-sm font-semibold hover:bg-brand-100 transition-all"
                          >
                            <Upload size={13} />증빙 Upload
                          </button>
                        ) : isView ? (
                          <button
                            onClick={() => openUploadModal(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-all"
                          >
                            <FileCheck2 size={13} />증빙확인
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3">
                        <span className={clsx('text-sm font-bold', (evidenceCounts[act.id] ?? 0) > 0 ? 'text-brand-700' : 'text-gray-300')}>
                          {evidenceCounts[act.id] ?? 0}
                        </span>
                      </td>
                      {profile?.role === 'admin' && (
                        <td className="text-sm text-gray-600 py-3">{act.controller_name ?? '-'}</td>
                      )}
                      <td className="text-center text-sm font-semibold text-gray-700 py-3">
                        {act.kpi_score != null ? act.kpi_score.toFixed(1) : '-'}
                      </td>
                      <td className="text-center py-3">
                        <span className={si.cls}>{si.label}</span>
                      </td>
                      <td className="text-center py-3">
                        {approvalStatuses[act.id] === 'approved' ? (
                          <span className="badge-green">승인완료</span>
                        ) : approvalStatuses[act.id] === 'rejected' ? (
                          <span className="badge-red">반려</span>
                        ) : approvalStatuses[act.id] === 'submitted' ? (
                          <span className="badge-yellow">승인대기</span>
                        ) : (
                          <span className="text-sm text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-2.5 border-t border-gray-50 flex justify-between text-xs text-gray-400">
          <span>총 <b className="text-gray-600">{filtered.length}</b>건{filtered.length !== activities.length ? ` (전체 ${activities.length}건 중)` : ''}</span>
          <span>페이지 로드 시 자동 새로고침</span>
        </div>
      </div>

      {/* 업로드 모달 */}
      {modalOpen && selectedActivity && (
        <EvidenceUploadModal
          activity={selectedActivity}
          onClose={handleClose}
          viewOnly={profile?.role === 'controller'}
        />
      )}
    </div>
  )
}
