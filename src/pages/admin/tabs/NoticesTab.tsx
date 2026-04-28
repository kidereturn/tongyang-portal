import { useCallback, useEffect, useRef, useState } from 'react'
import { Edit3, Paperclip, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../../lib/supabase'

type Attachment = { name: string; path: string; size: number; uploaded_at: string }

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
  attachments?: Attachment[]
}

const BADGE_COLORS = ['blue', 'red', 'green', 'purple', 'amber', 'slate']

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function sanitizeStorageKey(name: string) {
  // Supabase storage InvalidKey 정책: ASCII 영숫자 + . _ - 만 허용. 한글·공백·특수문자 모두 차단됨.
  // 확장자만 추출해서 보존, 본문은 안전한 hash 로 대체. 원본 이름은 attachments.name 으로 보존.
  const dot = name.lastIndexOf('.')
  let ext = ''
  if (dot >= 0 && dot < name.length - 1) {
    ext = name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, '')
    if (ext.length > 10) ext = ext.slice(0, 10)
  }
  // 8자리 hex hash (충돌 방지) — 빠른 의사난수로 충분 (path 안의 timestamp + random prefix 가 이미 unique)
  const hash = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
  return `${hash}${ext}`
}

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
  const [fAttachments, setFAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setFAttachments([])
  }

  function openEdit(n: Notice) {
    setIsNew(false)
    setEditing(n)
    setFType(n.type as 'notice' | 'manual'); setFTitle(n.title); setFContent(n.content)
    setFBadge(n.badge); setFBadgeColor(n.badge_color); setFPinned(n.is_pinned)
    setFAttachments(Array.isArray(n.attachments) ? n.attachments : [])
  }

  function closeForm() { setEditing(null); setIsNew(false); setFAttachments([]) }

  async function handleFilePick(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    const newAtts: Attachment[] = []
    try {
      for (const file of Array.from(files)) {
        // 50MB 한도
        if (file.size > 50 * 1024 * 1024) {
          alert(`${file.name} 은(는) 50MB 를 초과해 업로드할 수 없습니다.`)
          continue
        }
        const ts = Date.now()
        // 원본 파일명에 한글·공백 등이 있어도 storage 키는 ASCII-safe 로 생성 (Invalid key 회피)
        // 다운로드 시 Content-Disposition 으로 원본 파일명을 복원하므로 사용자에겐 영향 없음
        const safeKey = sanitizeStorageKey(file.name)
        const path = `notice-${ts}-${Math.random().toString(36).slice(2, 8)}/${safeKey}`
        const { error } = await (supabase as any).storage.from('notices').upload(path, file, {
          cacheControl: '3600', upsert: false,
        })
        if (error) {
          console.error('[Notices] upload failed', error)
          alert(`파일 업로드 실패: ${file.name}\n${error.message ?? ''}`)
          continue
        }
        newAtts.push({
          name: file.name,
          path,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        })
      }
      if (newAtts.length > 0) setFAttachments(prev => [...prev, ...newAtts])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAttachment(att: Attachment) {
    if (!confirm(`"${att.name}" 첨부를 삭제하시겠습니까?`)) return
    try {
      await (supabase as any).storage.from('notices').remove([att.path])
    } catch { /* best-effort */ }
    setFAttachments(prev => prev.filter(a => a.path !== att.path))
  }

  async function handleSave() {
    if (!fTitle.trim()) return alert('제목을 입력하세요')
    const payload = {
      type: fType, title: fTitle.trim(), content: fContent.trim(),
      badge: fBadge, badge_color: fBadgeColor, is_pinned: fPinned,
      attachments: fAttachments,
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
    try {
      await (supabase as any).from('notices').delete().eq('id', id)
      fetchNotices()
    } catch (err) {
      console.error('[NoticesTab] handleDelete error:', err)
      alert('삭제 실패')
    }
  }

  const showForm = isNew || editing

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-brand-700">공지사항 / 매뉴얼 관리 ({notices.length}건)</p>
        <button onClick={openNew} className="btn-primary text-xs py-2">
          <Plus size={14} />새 글 작성
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-brand-200 bg-warm-50/30 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-brand-900">{isNew ? '새 글 작성' : '수정'}</p>
            <button onClick={closeForm} className="text-warm-400 hover:text-warm-600"><X size={18} /></button>
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

          {/* 첨부파일 영역 */}
          <div className="rounded-lg border border-warm-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
                <Paperclip size={13} />첨부파일 ({fAttachments.length}개)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50"
              >
                <Upload size={12} />{uploading ? '업로드 중...' : '파일 추가'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={e => handleFilePick(e.target.files)}
                className="hidden"
              />
            </div>
            {fAttachments.length === 0 ? (
              <p className="text-[11px] text-warm-400">첨부된 파일이 없습니다. (PDF·이미지·문서 / 파일당 최대 50MB)</p>
            ) : (
              <div className="space-y-1">
                {fAttachments.map(att => (
                  <div key={att.path} className="flex items-center gap-2 rounded bg-warm-50 px-2 py-1.5 text-xs">
                    <Paperclip size={11} className="text-warm-400 shrink-0" />
                    <span className="flex-1 truncate font-medium text-brand-800">{att.name}</span>
                    <span className="text-[10px] text-warm-400">{formatFileSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att)}
                      className="text-warm-400 hover:text-red-600"
                      title="삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSave} className="btn-primary text-xs py-2"><Save size={14} />저장</button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-warm-400">로딩 중...</div>
      ) : (
        <div className="space-y-2">
          {notices.map(n => (
            <div key={n.id} className="flex items-center gap-3 rounded-xl border border-warm-200 bg-white px-4 py-3">
              <span className={clsx('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                n.type === 'notice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              )}>
                {n.type === 'notice' ? '공지' : '매뉴얼'}
              </span>
              {n.is_pinned && <span className="text-[10px] font-bold text-accent-600">PIN</span>}
              <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold',
                `bg-${n.badge_color}-100 text-${n.badge_color}-700`
              )}>{n.badge}</span>
              <p className="flex-1 truncate text-sm font-medium text-brand-800">{n.title}</p>
              <span className="text-[10px] text-warm-400">{new Date(n.created_at).toLocaleDateString('ko-KR')}</span>
              <button onClick={() => openEdit(n)} className="text-warm-400 hover:text-brand-700"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(n.id)} className="text-warm-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
