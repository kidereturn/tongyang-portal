import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Search, Send } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'
import { ROLE_LABELS, ROLE_BADGES } from '../adminShared'

type ProfileOption = { id: string; full_name: string | null; employee_id: string | null; role: string }

export default function NotificationsTab() {
  const [recipients, setRecipients] = useState<ProfileOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, employee_id, role')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) setRecipients(data as ProfileOption[])
      })
  }, [])

  const filtered = recipients.filter(p => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (p.full_name ?? '').toLowerCase().includes(q) || (p.employee_id ?? '').includes(q)
    }
    return true
  })

  function toggleAll(checked: boolean) {
    if (checked) setSelectedIds(new Set(filtered.map(p => p.id)))
    else setSelectedIds(new Set())
  }

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!title.trim() || selectedIds.size === 0) return
    setSending(true)
    setSentCount(null)

    const { data: { session } } = await supabase.auth.getSession()
    const senderId = session?.user?.id ?? null

    const rows = Array.from(selectedIds).map(recipientId => ({
      recipient_id: recipientId,
      sender_id: senderId,
      title: title.trim(),
      body: body.trim() || null,
      is_read: false,
    }))

    const { error } = await (supabase as any).from('notifications').insert(rows)
    setSending(false)

    if (!error) {
      setSentCount(rows.length)
      setTitle('')
      setBody('')
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-900">알림 메시지 작성</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">제목 *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="알림 제목을 입력하세요" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">내용</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} className="form-input min-h-[80px]" placeholder="알림 내용 (선택)" />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-900">수신자 선택</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { value: 'all', label: '전체' },
              { value: 'admin', label: '관리자' },
              { value: 'owner', label: '담당자' },
              { value: 'controller', label: '승인자' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setRoleFilter(opt.value)}
                className={clsx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                  roleFilter === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pl-8 text-xs" placeholder="이름 또는 사번 검색" />
          </div>
          <button
            onClick={() => toggleAll(selectedIds.size < filtered.length)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            {selectedIds.size >= filtered.length && filtered.length > 0 ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        <p className="mb-2 text-xs text-gray-500">
          {filtered.length}명 중 <strong className="text-brand-700">{selectedIds.size}명</strong> 선택됨
        </p>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100">
          {filtered.map(p => (
            <label
              key={p.id}
              className={clsx(
                'flex cursor-pointer items-center gap-3 border-b border-gray-50 px-3 py-2 transition hover:bg-gray-50',
                selectedIds.has(p.id) && 'bg-brand-50/40'
              )}
            >
              <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
              <span className="text-sm text-gray-900">{p.full_name ?? '-'}</span>
              <span className="text-xs text-gray-400">{p.employee_id ?? ''}</span>
              <span className={clsx('badge ml-auto text-[10px]', ROLE_BADGES[p.role] ?? 'badge-gray')}>
                {ROLE_LABELS[p.role] ?? p.role}
              </span>
            </label>
          ))}
        </div>
      </div>

      {sentCount !== null && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <CheckCircle2 size={16} /> {sentCount}명에게 알림을 발송했습니다.
          </p>
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !title.trim() || selectedIds.size === 0}
        className="btn-primary flex items-center gap-2 disabled:opacity-50"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {sending ? '발송 중...' : `알림 발송 (${selectedIds.size}명)`}
      </button>
    </div>
  )
}
