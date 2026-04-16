import { useEffect, useState } from 'react'
import { MessageCircle, Plus, Send, User, X } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type Post = {
  id: string
  author_name: string | null
  author_department: string | null
  is_anonymous: boolean
  category: string
  title: string
  content: string
  created_at: string
  author_id: string
}

const CATEGORIES = [
  { key: 'all', label: '전체', color: 'bg-warm-100 text-warm-600' },
  { key: '응원메시지', label: '응원메시지', color: 'bg-emerald-100 text-emerald-700' },
  { key: '불편사항', label: '불편사항', color: 'bg-red-100 text-red-700' },
  { key: '개선건의', label: '개선건의', color: 'bg-blue-100 text-blue-700' },
  { key: '이것도 해주세요', label: '이것도 해주세요', color: 'bg-warm-100 text-brand-700' },
  { key: '쓴소리', label: '쓴소리', color: 'bg-amber-100 text-amber-700' },
  { key: '기타', label: '기타', color: 'bg-warm-100 text-warm-600' },
]

export default function TellMePage() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState('응원메시지')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formAnonymous, setFormAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('tellme_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      setPosts(data ?? [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim() || !formContent.trim()) return
    setSubmitting(true)
    try {
      await (supabase as any).from('tellme_posts').insert({
        author_id: profile?.id,
        author_name: formAnonymous ? null : (profile?.full_name ?? null),
        author_department: formAnonymous ? null : (profile?.department ?? null),
        is_anonymous: formAnonymous,
        category: formCategory,
        title: formTitle.trim(),
        content: formContent.trim(),
      })
      // Award 30 points for posting
      try {
        await (supabase as any).from('user_points').insert({
          user_id: profile?.id,
          action: 'tellme',
          points: 30,
          description: 'Tell me!! 게시글 작성',
        })
      } catch { /* silent */ }
      setFormTitle('')
      setFormContent('')
      setFormAnonymous(false)
      setShowForm(false)
      fetchPosts()
    } catch {
      alert('게시글 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter)
  const catColor = (cat: string) => CATEGORIES.find(c => c.key === cat)?.color ?? 'bg-warm-100 text-warm-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 px-6 py-8 text-white shadow-md">
        <p className="text-xs font-semibold tracking-[0.24em] text-warm-300">TELL ME!!</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-bold">
          <MessageCircle size={28} className="text-warm-300" />
          Tell me!!
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-warm-300">
          자유롭게 의견을 남겨주세요. 익명 게시도 가능합니다. 모든 사용자가 게시글을 볼 수 있습니다.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary text-sm"
        >
          <Plus size={16} /> 글쓰기
        </button>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                filter === cat.key
                  ? 'bg-brand-800 text-white border-brand-600'
                  : 'bg-white text-warm-600 border-warm-200 hover:bg-warm-50'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Post list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-48 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-warm-400">
          <MessageCircle size={40} className="mb-3 text-warm-200" />
          <p className="font-medium text-warm-500">게시글이 없습니다</p>
          <p className="text-sm mt-1">첫 번째 글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <div key={post.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warm-100 to-warm-100 text-brand-600 shrink-0">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', catColor(post.category))}>
                      {post.category}
                    </span>
                    <span className="text-sm font-bold text-brand-900">{post.title}</span>
                  </div>
                  <p className="text-sm text-warm-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-warm-400">
                    <span>
                      {post.is_anonymous ? '익명' : (post.author_name ?? '알 수 없음')}
                      {!post.is_anonymous && post.author_department ? ` · ${post.author_department}` : ''}
                    </span>
                    <span>{new Date(post.created_at).toLocaleString('ko-KR')}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Write form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg mx-4 rounded-lg bg-white shadow-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-warm-200 bg-warm-50 px-5 py-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-brand-900">
                <MessageCircle size={20} />
                Tell me!! 글쓰기
              </h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-200 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="form-label">카테고리</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setFormCategory(cat.key)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        formCategory === cat.key
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-warm-600 border-warm-200 hover:bg-warm-50'
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="form-label">제목</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="form-input"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="form-label">내용</label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="자유롭게 의견을 남겨주세요..."
                  rows={5}
                  className="form-input resize-none"
                  required
                />
              </div>

              {/* Anonymous toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAnonymous}
                  onChange={e => setFormAnonymous(e.target.checked)}
                  className="rounded border-warm-300 text-brand-600 focus:ring-warm-500"
                />
                <span className="text-sm text-brand-700">익명으로 게시</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !formTitle.trim() || !formContent.trim()}
                className="btn-primary w-full justify-center py-3"
              >
                <Send size={16} />
                {submitting ? '등록 중...' : '게시하기'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
