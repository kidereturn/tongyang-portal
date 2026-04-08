import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Clock, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface InboxItem {
  id: string
  status: string
  notes: string | null
  file_name: string | null
  submitted_at: string | null
  activities: { control_code: string; title: string } | null
  owner: { full_name: string | null; department: string | null } | null
}

export default function InboxPage() {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [items,   setItems]   = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchInbox() }, [profile])

  async function fetchInbox() {
    if (!profile) return
    if (profile.role === 'owner') {
      // owner는 결재함 없음
      setLoading(false)
      return
    }
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data, error } = await db
      .from('evidence_records')
      .select(`
        id, status, notes, file_name, submitted_at,
        activities(control_code, title),
        owner:profiles!evidence_records_owner_id_fkey(full_name, department)
      `)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: true })

    if (error) console.error(error)
    setItems(data ?? [])
    setLoading(false)
  }

  if (profile?.role === 'owner') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">결재함</h1>
          <p className="text-slate-400 text-sm mt-1">승인 대기 중인 결재 요청</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <Inbox size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">증빙담당자는 결재함을 사용하지 않습니다</p>
          <button
            onClick={() => navigate('/evidence')}
            className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
          >
            증빙결재로 이동 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">결재함</h1>
          <p className="text-slate-400 text-sm mt-1">승인 대기 중인 결재 요청</p>
        </div>
        {!loading && (
          <span className="text-xs font-medium bg-yellow-950/50 border border-yellow-800 text-yellow-400 px-3 py-1.5 rounded-full">
            대기 {items.length}건
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="text-brand-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <CheckCircle2 size={36} className="text-green-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">대기 중인 결재가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/evidence/${item.id}`)}
              className="w-full bg-slate-900 border border-yellow-900/50 hover:border-yellow-700 rounded-xl px-5 py-4 flex items-center gap-4 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-yellow-950/50 rounded-lg flex items-center justify-center shrink-0">
                <Clock size={20} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {item.activities?.title ?? '활동 미지정'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  <span className="text-slate-600 mr-2">[{item.activities?.control_code}]</span>
                  제출자: {item.owner?.full_name ?? '-'} · {item.owner?.department ?? ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-slate-500 text-xs">
                  {item.submitted_at
                    ? new Date(item.submitted_at).toLocaleDateString('ko-KR')
                    : '-'}
                </span>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
