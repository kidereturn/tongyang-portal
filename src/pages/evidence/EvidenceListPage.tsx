import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileCheck2, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

interface ActivityItem {
  id: string
  control_code: string
  title: string
  department: string | null
  unique_key: string | null
  owner_employee_id: string | null
  controller_employee_id: string | null
  // 집계
  total_items: number
  uploaded_items: number
  approval_status: 'none' | 'submitted' | 'approved' | 'rejected'
}

const STATUS_UI = {
  none:      { label: '업로드 필요', color: 'text-slate-400 bg-slate-800 border-slate-700',       icon: Upload },
  submitted: { label: '결재 대기',   color: 'text-yellow-400 bg-yellow-950/50 border-yellow-800', icon: Clock },
  approved:  { label: '승인 완료',   color: 'text-green-400 bg-green-950/50 border-green-800',    icon: CheckCircle2 },
  rejected:  { label: '반려',        color: 'text-red-400 bg-red-950/50 border-red-800',          icon: XCircle },
}

export default function EvidenceListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (profile) loadActivities() }, [profile])

  async function loadActivities() {
    if (!profile) return
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // activities 조회 (owner는 본인 것만, admin/controller는 전체)
    let q = db.from('activities').select('*').eq('active', true).order('control_code')
    if (profile.role === 'owner') {
      q = q.eq('owner_id', profile.id)
    }
    const { data: acts } = await q
    if (!acts?.length) { setActivities([]); setLoading(false); return }

    // 각 activity의 모집단 수 + 업로드 수 + 결재 상태 집계
    const result: ActivityItem[] = []
    for (const a of acts) {
      if (!a.unique_key) {
        result.push({ ...a, total_items: 0, uploaded_items: 0, approval_status: 'none' })
        continue
      }

      const [{ count: total }, { count: uploaded }, { data: req }] = await Promise.all([
        db.from('population_items').select('id', { count: 'exact', head: true }).eq('unique_key', a.unique_key),
        db.from('evidence_uploads').select('id', { count: 'exact', head: true })
          .eq('status', 'uploaded')
          .in('population_item_id',
            db.from('population_items').select('id').eq('unique_key', a.unique_key)
          ),
        db.from('approval_requests')
          .select('status')
          .eq('unique_key', a.unique_key)
          .eq('owner_id', profile.role === 'owner' ? profile.id : a.owner_id ?? profile.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])

      result.push({
        ...a,
        total_items: total ?? 0,
        uploaded_items: uploaded ?? 0,
        approval_status: (req?.[0]?.status as ActivityItem['approval_status']) ?? 'none',
      })
    }
    setActivities(result)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">증빙결재</h1>
        <p className="text-slate-400 text-sm mt-1">
          {profile?.role === 'owner' ? '담당 통제활동의 증빙을 업로드하고 결재를 상신하세요' : '전체 통제활동 증빙 현황'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-brand-500 animate-spin" /></div>
      ) : activities.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <FileCheck2 size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">배정된 통제활동이 없습니다</p>
          <p className="text-slate-600 text-xs mt-2">관리자에게 활동 배정을 요청하세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(a => {
            const st = STATUS_UI[a.approval_status]
            const Icon = st.icon
            const pct = a.total_items > 0 ? Math.round((a.uploaded_items / a.total_items) * 100) : 0
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/evidence/work/${a.id}`)}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-4 md:px-5 py-4 flex items-center gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <FileCheck2 size={20} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-brand-400 bg-brand-950/50 border border-brand-900 px-2 py-0.5 rounded shrink-0">
                      {a.control_code}
                    </span>
                    <p className="text-white text-sm font-medium truncate">{a.title}</p>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{a.department ?? '-'}</p>
                  {a.total_items > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 max-w-[120px]">
                        <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-slate-500 text-xs">{a.uploaded_items}/{a.total_items}건 업로드</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={clsx('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:flex', st.color)}>
                    <Icon size={12} />{st.label}
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
