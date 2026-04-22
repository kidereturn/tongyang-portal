import { useEffect, useState } from 'react'
import { MessageCircle, Plus, Send, User, X, Trash2, EyeOff, Eye, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { safeQuery } from '../../lib/queryWithTimeout'
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
  is_hidden?: boolean
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
      let query = (supabase as any)
        .from('tellme_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      // Non-admin users don't see hidden posts
      if (profile?.role !== 'admin') {
        query = query.eq('is_hidden', false)
      }
      const { data } = await safeQuery<Post[]>(query, 10_000, 'tellme.posts')
      setPosts(data ?? [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(postId: string) {
    if (!window.confirm('이 글을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.')) return
    try {
      await (supabase as any).from('tellme_posts').delete().eq('id', postId)
      await fetchPosts()
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  async function handleToggleHide(post: Post) {
    const next = !post.is_hidden
    try {
      await (supabase as any).from('tellme_posts').update({ is_hidden: next }).eq('id', post.id)
      await fetchPosts()
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  // In-page detail modal state (replaces new-window approach — new window was
  // getting blocked by popup blockers)
  const [detailPost, setDetailPost] = useState<Post | null>(null)

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
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">커뮤니티<span className="sep" />Tell me!!</div>
            <h1>Tell me!! <span className="soft">자유롭게 이야기하세요.</span></h1>
            <p className="lead">응원·불편·개선·건의·쓴소리까지 익명으로 남길 수 있습니다. 모든 사용자가 볼 수 있어요.</p>
          </div>
          <div className="actions">
            <button onClick={() => setShowForm(true)} className="btn-compact primary">
              <Plus size={13} /> 글쓰기
            </button>
          </div>
        </div>
      </div>

      <div className="pg-body">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={clsx('filter-chip', filter === cat.key && 'active')}
              style={{ cursor: 'pointer' }}
            >
              {cat.label}
            </button>
          ))}
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
            <div
              key={post.id}
              className={clsx(
                'card p-5 hover:shadow-md transition-shadow group relative',
                post.is_hidden && 'opacity-60 border-dashed border-warm-300'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warm-100 to-warm-100 text-brand-600 shrink-0">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold', catColor(post.category))}>
                      {post.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailPost(post)}
                      className="text-left text-sm font-bold text-brand-900 hover:text-brand-600 transition-colors inline-flex items-center gap-1 group/title"
                      title="클릭해서 전체 내용 보기"
                    >
                      {post.title}
                      <ExternalLink size={12} className="text-warm-400 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                    </button>
                    {post.is_hidden && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-warm-100 text-warm-500 border border-warm-200">가림</span>
                    )}
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

                {/* Admin actions (hide/delete) */}
                {profile?.role === 'admin' && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleHide(post)}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition',
                        post.is_hidden
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-warm-200 bg-warm-50 text-warm-600 hover:bg-warm-100'
                      )}
                      title={post.is_hidden ? '일반 사용자에게 다시 보이게 하기' : '일반 사용자에게 가리기'}
                    >
                      {post.is_hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                      {post.is_hidden ? '표시' : '가리기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-100"
                      title="이 글을 완전히 삭제"
                    >
                      <Trash2 size={12} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal — in-page popup (기존에는 새창으로 열렸는데 팝업 차단됐었음) */}
      {detailPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          onClick={() => setDetailPost(null)}
          onKeyDown={e => { if (e.key === 'Escape') setDetailPost(null) }}
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-2xl rounded-lg bg-white shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-4 border-b border-warm-100 bg-warm-50 px-6 py-4">
              <div className="min-w-0 flex-1">
                <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold inline-block mb-2', catColor(detailPost.category))}>
                  {detailPost.category}
                </span>
                <h2 className="text-lg font-bold text-brand-900 break-words">{detailPost.title}</h2>
                <p className="mt-1 text-xs text-warm-500">
                  {detailPost.is_anonymous ? '익명' : (detailPost.author_name ?? '알 수 없음')}
                  {!detailPost.is_anonymous && detailPost.author_department ? ` · ${detailPost.author_department}` : ''}
                  {' · '}
                  {new Date(detailPost.created_at).toLocaleString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => setDetailPost(null)}
                className="shrink-0 rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-600 transition"
                title="닫기 (ESC)"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-brand-800 leading-relaxed whitespace-pre-wrap">{detailPost.content}</p>
            </div>
          </div>
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
    </>
  )
}
