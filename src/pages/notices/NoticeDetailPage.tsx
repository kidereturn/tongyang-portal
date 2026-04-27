import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Download, Paperclip, Pin } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

async function downloadAttachment(att: Attachment) {
  try {
    const { data, error } = await (supabase as any).storage
      .from('notices')
      .createSignedUrl(att.path, 60, { download: att.name })
    if (error || !data?.signedUrl) {
      alert('다운로드 URL 생성 실패')
      return
    }
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = att.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    alert('다운로드 실패: ' + (e instanceof Error ? e.message : ''))
  }
}

function renderContent(text: string) {
  // Simple markdown-like rendering
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <h2 key={i} className="mt-6 mb-2 text-lg font-bold text-brand-900">{line.slice(3)}</h2>
    if (line.startsWith('### ')) return <h3 key={i} className="mt-4 mb-2 text-base font-bold text-brand-800">{line.slice(4)}</h3>
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm leading-7 text-brand-700">{line.slice(2)}</li>
    if (line.match(/^\d+\.\s/)) return <li key={i} className="ml-4 list-decimal text-sm leading-7 text-brand-700">{line.replace(/^\d+\.\s/, '')}</li>
    if (line.startsWith('|')) return <p key={i} className="font-mono text-xs text-warm-600 leading-6">{line}</p>
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="text-sm leading-7 text-brand-700">{line}</p>
  })
}

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('notices')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        setNotice(data ?? null)
      } catch { /* silent */ } finally { setLoading(false) }
    })()
  }, [id])

  if (loading) return (
    <div className="py-20 text-center text-sm text-warm-400">로딩 중...</div>
  )

  if (!notice) return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:text-brand-800">
        <ArrowLeft size={16} />HOME으로
      </Link>
      <div className="py-20 text-center text-sm text-warm-400">게시글을 찾을 수 없습니다.</div>
    </div>
  )

  const BADGE_BG: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-warm-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-warm-100 text-warm-600',
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:text-brand-800 transition">
        <ArrowLeft size={16} />HOME으로 돌아가기
      </Link>

      <article className="rounded-lg border border-warm-200 bg-white shadow-md overflow-hidden">
        {/* Header */}
        <div className="border-b border-warm-100 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold',
              notice.type === 'notice' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            )}>
              {notice.type === 'notice' ? '공지사항' : '매뉴얼'}
            </span>
            <span className={clsx('rounded-full px-2.5 py-1 text-xs font-bold',
              BADGE_BG[notice.badge_color] ?? BADGE_BG.blue
            )}>
              {notice.badge}
            </span>
            {notice.is_pinned && (
              <span className="flex items-center gap-1 text-xs font-bold text-accent-600">
                <Pin size={12} />고정
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-brand-900 sm:text-2xl">{notice.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-xs text-warm-400">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(notice.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            {notice.author_name && <span>작성자: {notice.author_name}</span>}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="prose-sm">
            {renderContent(notice.content)}
          </div>

          {/* Attachments */}
          {Array.isArray(notice.attachments) && notice.attachments.length > 0 && (
            <div className="mt-8 border-t border-warm-100 pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-900">
                <Paperclip size={14} />첨부파일 ({notice.attachments.length}개)
              </p>
              <div className="space-y-2">
                {notice.attachments.map(att => (
                  <button
                    key={att.path}
                    onClick={() => downloadAttachment(att)}
                    className="flex w-full items-center gap-2 rounded-lg border border-warm-200 bg-warm-50/50 px-3 py-2.5 text-left text-sm hover:border-brand-300 hover:bg-brand-50 transition"
                  >
                    <Paperclip size={14} className="text-warm-500 shrink-0" />
                    <span className="flex-1 truncate font-medium text-brand-800">{att.name}</span>
                    <span className="text-[11px] text-warm-400">{formatFileSize(att.size)}</span>
                    <Download size={13} className="text-brand-600" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
