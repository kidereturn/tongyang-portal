import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileCheck2, Clock, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

type Status = 'all' | 'draft' | 'submitted' | 'approved' | 'rejected'

interface EvidenceRow {
  id: string
  status: string
  notes: string | null
  file_name: string | null
  submitted_at: string | null
  created_at: string
  activities: { control_code: string; title: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: '임시저장', color: 'text-slate-400 bg-slate-800 border-slate-700',        icon: FileCheck2 },
  submitted: { label: '검토중',   color: 'text-yellow-400 bg-yellow-950/50 border-yellow-800',  icon: Clock },
  approved:  { label: '승인완료', color: 'text-green-400 bg-green-950/50 border-green-800',     icon: CheckCircle2 },
  rejected:  { label: '반려',     color: 'text-red-400 bg-red-950/50 border-red-800',           icon: XCircle },
}

const FILTERS: { key: Status; label: string }[] = [
  { key: 'all',       label: '전체' },
  { key: 'draft',     label: '임시저장' },
  { key: 'submitted', label: '검토중' },
  { key: 'approved',  label: '승인완료' },
  { key: 'rejected',  label: '반려' },
]

export default function EvidenceListPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [rows,    setRows]    = useState<EvidenceRow[]>([])
  const [filter,  setFilter]  = useState<Status>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [profile, filter])

  async function fetchData() {
    if (!profile) return
    setLoading(true)

    let query = supabase
      .from('evidence_records')
      .select('id, status, notes, file_name, submitted_at, created_at, activities(control_code, title)')
      .order('created_at', { ascending: false })

    // 관리자/통제책임자는 전체, owner는 본인 것만
    if (profile.role === 'owner') {
      query = query.eq('owner_id', profile.id)
    }
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    if (error) console.error(error)
    setRows((data as EvidenceRow[]) ?? [])
    setLoading(false)
  }

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">증빙결재</h1>
          <p className="text-slate-400 text-sm mt-1">증빙 업로드 및 결재 상신</p>
        </div>
        {(profile?.role === 'owner' || profile?.role === 'admin') && (
          <button
            onClick={() => navigate('/evidence/new')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-brand-900/30"
          >
            <Plus size={16} />
            새 증빙 등록
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
              filter === f.key
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            )}
          >
            {f.label}
            {f.key !== 'all' && counts[f.key] ? (
              <span className="ml-1.5 text-xs opacity-70">({counts[f.key]})</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-brand-500 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <FileCheck2 size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">등록된 증빙이 없습니다</p>
          {profile?.role === 'owner' && (
            <button
              onClick={() => navigate('/evidence/new')}
              className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              첫 번째 증빙 등록하기 →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(row => {
            const st = STATUS_LABELS[row.status] ?? STATUS_LABELS.draft
            const Icon = st.icon
            return (
              <button
                key={row.id}
                onClick={() => navigate(`/evidence/${row.id}`)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-5 py-4 flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <FileCheck2 size={20} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {row.activities?.title ?? '활동 미지정'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">
                    {row.activities?.control_code && (
                      <span className="text-slate-600 mr-2">[{row.activities.control_code}]</span>
                    )}
                    {row.notes ?? '설명 없음'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={clsx('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', st.color)}>
                    <Icon size={12} />
                    {st.label}
                  </span>
                  <span className="text-slate-600 text-xs">
                    {new Date(row.submitted_at ?? row.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
