import { useCallback, useEffect, useState } from 'react'
import { Edit3, Plus, Save, Trash2, X } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'

type Notice = {
  id: string
  type: string
  title: string
  content: string
  badge: string
  badge_color: string
  is_pinned: boolean
  author_name: string | null
  created_at: string
}

const BADGE_COLORS = ['blue', 'red', 'green', 'purple', 'amber', 'slate']

export default function NoticesTab() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [isNew, setIsNew] = useState(false)

  // Form state
  const [fType, setFType] = useState<'notice' | 'manual'>('notice')
  const [fTitle, setFTitle] = useState('')
  const [fContent, setFContent] = useState('')
  const [fBadge, setFBadge] = useState('공지')
  const [fBadgeColor, setFBadgeColor] = useState('blue')
  const [fPinned, setFPinned] = useState(false)

  const fetchNotices = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      setNotices(data ?? [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotices() }, [fetchNotices])

  function openNew() {
    setIsNew(true)
    setEditing(null)
    setFType('notice'); setFTitle(''); setFContent(''); setFBadge('공지'); setFBadgeColor('blue'); setFPinned(false)
  }

  function openEdit(n: Notice) {
    setIsNew(false)
    setEditing(n)
    setFType(n.type as 'notice' | 'manual'); setFTitle(n.title); setFContent(n.content)
    setFBadge(n.badge); setFBadgeColor(n.badge_color); setFPinned(n.is_pinned)
  }

  function closeForm() { setEditing(null); setIsNew(false) }

  async function handleSave() {
    if (!fTitle.trim()) return alert('제목을 입력하세요')
    const payload = {
      type: fType, title: fTitle.trim(), content: fContent.trim(),
      badge: fBadge, badge_color: fBadgeColor, is_pinned: fPinned,
      updated_at: new Date().toISOString(),
    }
    try {
      if (isNew) {
        await (supabase as any).from('notices').insert(payload)
      } else if (editing) {
        await (supabase as any).from('notices').update(payload).eq('id', editing.id)
      }
      closeForm()
      fetchNotices()
    } catch { alert('저장 실패') }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await (supabase as any).from('notices').delete().eq('id', id)
    fetchNotices()
  }

  const showForm = isNew || editing

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">공지사항 / 매뉴얼 관리 ({notices.length}건)</p>
        <button onClick={openNew} className="btn-primary text-xs py-2">
          <Plus size={14} />새 글 작성
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">{isNew ? '새 글 작성' : '수정'}</p>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select value={fType} onChange={e => setFType(e.target.value as 'notice'|'manual')} className="input text-xs">
              <option value="notice">공지사항</option>
              <option value="manual">매뉴얼</option>
            </select>
            <input value={fBadge} onChange={e => setFBadge(e.target.value)} placeholder="뱃지 텍스트" className="input text-xs" />
            <select value={fBadgeColor} onChange={e => setFBadgeColor(e.target.value)} className="input text-xs">
              {BADGE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={fPinned} onChange={e => setFPinned(e.target.checked)} />
              상단 고정
            </label>
          </div>
          <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="제목" className="input w-full text-sm" />
          <textarea value={fContent} onChange={e => setFContent(e.target.value)} placeholder="내용 (마크다운 지원)" rows={8} className="input w-full text-sm" />
          <button onClick={handleSave} className="btn-primary text-xs py-2"><Save size={14} />저장</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {notices.map(n => (
            <div key={n.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                n.type === 'notice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              )}>
                {n.type === 'notice' ? '공지' : '매뉴얼'}
              </span>
              {n.is_pinned && <span className="text-[10px] font-bold text-amber-500">PIN</span>}
              <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold',
                `bg-${n.badge_color}-100 text-${n.badge_color}-700`
              )}>{n.badge}</span>
              <p className="flex-1 truncate text-sm font-medium text-slate-800">{n.title}</p>
              <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
              <button onClick={() => openEdit(n)} className="text-slate-400 hover:text-brand-600"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(n.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
