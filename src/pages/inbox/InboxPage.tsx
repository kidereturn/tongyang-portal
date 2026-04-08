import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Clock, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import clsx from 'clsx'

interface RequestItem {
  id: string
  unique_key: string
  control_code: string
  status: string
  owner_comment: string | null
  submitted_at: string
  owner: { full_name: string | null; department: string | null } | null
  activity: { title: string; control_code: string } | null
  upload_count: number
}

const STATUS_UI: Record<string, { label: string; color: string }> = {
  submitted: { label: '결재 대기', color: 'text-yellow-400 bg-yellow-950/50 border-yellow-800' },
  approved:  { label: '승인 완료', color: 'text-green-400 bg-green-950/50 border-green-800' },
  rejected:  { label: '반려',      color: 'text-red-400 bg-red-950/50 border-red-800' },
}

type FilterTab = 'submitted' | 'approved' | 'rejected' | 'all'

export default function InboxPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('submitted')

  useEffect(() => { if (profile) loadInbox() }, [profile, tab])

  async function loadInbox() {
    if (!profile) return
    if (profile.role === 'owner') { setLoading(false); return }
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    let q = db
      .from('approval_requests')
      .select(`
        id, unique_key, control_code, status, owner_comment, submitted_at,
        owner:profiles!approval_requests_owner_id_fkey(full_name, department)
      `)
      .order('submitted_at', { ascending: false })

    // 통제책임자는 본인에게 배정된 것만
    if (profile.role === 'controller') {
      q = q.eq('controller_id', profile.id)
    }

    if (tab !== 'all') q = q.eq('status', tab)

    const { data, error } = await q
    if (error) { console.error(error); setLoading(false); return }

    // 각 요청의 업로드 수 집계
    const enriched: RequestItem[] = []
    for (const r of data ?? []) {
      const { count } = await db
        .from('evidence_uploads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'uploaded')
        .in('population_item_id',
          db.from('population_items').select('id').eq('unique_key', r.unique_key)
        )
      // activity 제목 조회
      const { data: act } = await db
        .from('activities')
        .select('title, control_code')
        .eq('unique_key', r.unique_key)
        .maybeSingle()
      enriched.push({ ...r, upload_count: count ?? 0, activity: act ?? null })
    }
    setItems(enriched)
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
          <button onClick={() => navigate('/evidence')}
            className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
          >
            증빙결재로 이동 →
          </button>
        </div>
      </div>
    )
  }

  const counts = { submitted: 0, approved: 0, rejected: 0, all: items.length }
  items.forEach(i => { if (i.status in counts) counts[i.status as keyof typeof counts]++ })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">결재함</h1>
          <p className="text-slate-400 text-sm mt-1">증빙 결재 요청 목록</p>
        </div>
        {counts.submitted > 0 && (
          <span className="text-xs font-medium bg-yellow-950/50 border border-yellow-800 text-yellow-400 px-3 py-1.5 rounded-full">
            대기 {counts.submitted}건
          </span>
        )}
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 flex-wrap">
        {([
          ['submitted', '결재 대기'],
          ['approved',  '승인 완료'],
          ['rejected',  '반려'],
          ['all',       '전체'],
        ] as [FilterTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={clsx('px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
              tab === key
                ? 'bg-brand-600 border-brand-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
            )}
          >
            {label}
            {counts[key] > 0 && <span className="ml-1.5 text-xs opacity-70">({counts[key]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="text-brand-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <CheckCircle2 size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">해당 결재 건이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const st = STATUS_UI[item.status] ?? STATUS_UI.submitted
            return (
              <button
                key={item.id}
                onClick={() => {
                  // activity ID를 찾아서 work 페이지로 이동
                  navigateToWork(item.unique_key)
                }}
                className="w-full bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl px-4 md:px-5 py-4 flex items-center gap-4 transition-all text-left group"
              >
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  item.status === 'submitted' ? 'bg-yellow-950/50' : item.status === 'approved' ? 'bg-green-950/50' : 'bg-red-950/50'
                )}>
                  <Clock size={20} className={
                    item.status === 'submitted' ? 'text-yellow-400' : item.status === 'approved' ? 'text-green-400' : 'text-red-400'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-brand-400 bg-brand-950/50 border border-brand-900 px-2 py-0.5 rounded shrink-0">
                      {item.control_code}
                    </span>
                    <p className="text-white text-sm font-medium truncate">
                      {item.activity?.title ?? item.control_code}
                    </p>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    제출자: {item.owner?.full_name ?? '-'} · {item.owner?.department ?? ''}
                    {item.upload_count > 0 && ` · 증빙 ${item.upload_count}건`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full border hidden sm:inline', st.color)}>
                    {st.label}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {new Date(item.submitted_at).toLocaleDateString('ko-KR')}
                  </span>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  async function navigateToWork(uniqueKey: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from('activities').select('id').eq('unique_key', uniqueKey).maybeSingle()
    if (data?.id) navigate(`/evidence/work/${data.id}`)
  }
}
