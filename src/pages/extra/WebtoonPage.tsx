import { useEffect, useState, useCallback } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, Loader2, MessageSquare, Send, Edit2, Trash2, Check, X as XIcon } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

type Episode = {
  id: string
  episode_number: number
  title: string
  image_path: string   // 단일 경로 또는 "part1.jpg,part2.jpg,..." 쉼표 구분
  created_at: string
  updated_at?: string
}

/** image_path를 파싱하여 개별 경로 배열로 반환 */
function parsePaths(imagePath: string): string[] {
  return imagePath.split(',').map(p => p.trim()).filter(Boolean)
}

function getPublicUrl(path: string, bustCache?: string) {
  const { data } = (supabase.storage as any).from('webtoon').getPublicUrl(path)
  const url = data?.publicUrl ?? ''
  if (!url) return url
  const ts = bustCache ? encodeURIComponent(bustCache) : Date.now()
  return `${url}?t=${ts}`
}

export default function WebtoonPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  useEffect(() => {
    async function load() {
      try {
        const { data } = await (supabase as any)
          .from('webtoon_episodes')
          .select('id, episode_number, title, image_path, created_at, updated_at')
          .order('episode_number') as { data: Episode[] | null }
        setEpisodes(data ?? [])
      } catch (err) {
        console.error('[WebtoonPage] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goPrev() {
    setCurrent(prev => Math.max(0, prev - 1))
    scrollToTop()
  }
  function goNext() {
    setCurrent(prev => Math.min(episodes.length - 1, prev + 1))
    scrollToTop()
  }

  const ep = episodes[current]

  const header = (
    <div className="pg-head">
      <div className="pg-head-row">
        <div>
          <div className="eyebrow">교육 콘텐츠<span className="sep" />Webtoon</div>
          <h1>내부회계 웹툰. <span className="soft">보면서 배웁니다.</span></h1>
          <p className="lead">어려운 내부회계관리제도 이야기를 한 장씩 풀어드립니다.</p>
        </div>
        <div className="actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 12, color: 'var(--at-ink-mute)' }}>
            <BookOpen size={14} /> {episodes.length}화 연재중
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <>
        {header}
        <div className="pg-body">
          <div className="flex items-center justify-center py-20 text-warm-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            로딩 중...
          </div>
        </div>
      </>
    )
  }

  if (episodes.length === 0) {
    return (
      <>
        {header}
        <div className="pg-body">
          <div className="py-20 text-center text-sm text-warm-400">
            등록된 웹툰이 없습니다. 관리자가 에피소드를 업로드하면 여기에 표시됩니다.
          </div>
        </div>
      </>
    )
  }

  const cacheKey = ep?.updated_at ?? ep?.created_at
  const imagePaths = ep ? parsePaths(ep.image_path) : []

  return (
    <>
      {header}
      <div className="pg-body space-y-6">

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {episodes.map((e, idx) => (
          <button
            key={e.id}
            onClick={() => { setCurrent(idx); scrollToTop() }}
            className={clsx(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition',
              idx === current
                ? 'bg-brand-800 text-white shadow-md'
                : 'bg-white text-warm-500 border border-warm-200 hover:bg-warm-50 hover:text-brand-900'
            )}
          >
            {e.episode_number}화
          </button>
        ))}
        <div className="ml-auto text-xs text-warm-400">
          {current + 1} / {episodes.length}
        </div>
        {current > 0 && (
          <button
            onClick={goPrev}
            className="rounded-lg border border-warm-200 bg-white p-2 text-warm-500 hover:bg-warm-50"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {current < episodes.length - 1 && (
          <button
            onClick={goNext}
            className="rounded-lg border border-warm-200 bg-white p-2 text-warm-500 hover:bg-warm-50"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Webtoon Viewer - 분할된 이미지를 이어서 표시 */}
      {ep && (
        <div className="mx-auto max-w-[960px] bg-white rounded-lg overflow-hidden shadow-sm">
          {imagePaths.map((path, idx) => (
            <img
              key={`${ep.id}-${idx}`}
              src={getPublicUrl(path, cacheKey)}
              alt={`${ep.title} ${imagePaths.length > 1 ? `(${idx + 1}/${imagePaths.length})` : ''}`}
              className="w-full block"
              loading={idx === 0 ? 'eager' : 'lazy'}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ))}
        </div>
      )}

      {/* Bottom navigation */}
      <div className="mx-auto flex max-w-[960px] items-center justify-between rounded-lg border border-warm-200 bg-white px-5 py-4">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-warm-600 transition hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />이전 화
        </button>
        <div className="flex gap-2">
          {episodes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setCurrent(idx); scrollToTop() }}
              className={clsx(
                'h-2.5 rounded-full transition-all',
                idx === current ? 'w-8 bg-brand-800' : 'w-2.5 bg-warm-300 hover:bg-warm-400'
              )}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          disabled={current >= episodes.length - 1}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-warm-600 transition hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음 화<ChevronRight size={16} />
        </button>
      </div>

      {/* 댓글 섹션 */}
      {ep && <WebtoonComments webtoonId={ep.id} episodeTitle={ep.title} />}

      {/* 자체 "처음으로" 버튼 제거 — 전역 ScrollToTopButton 사용 */}
      </div>
    </>
  )
}

type Comment = {
  id: string
  webtoon_id: string
  user_id: string
  user_name: string | null
  user_dept: string | null
  body: string
  created_at: string
  updated_at: string
}

function WebtoonComments({ webtoonId, episodeTitle }: { webtoonId: string; episodeTitle: string }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('webtoon_comments')
        .select('*')
        .eq('webtoon_id', webtoonId)
        .order('created_at', { ascending: false })
      setComments(data ?? [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [webtoonId])

  useEffect(() => { void load() }, [load])

  async function postComment() {
    if (!text.trim() || !profile?.id) return
    setSending(true)
    try {
      const { error } = await (supabase as any).from('webtoon_comments').insert({
        webtoon_id: webtoonId,
        user_id: profile.id,
        user_name: profile.full_name ?? null,
        user_dept: profile.department ?? null,
        body: text.trim(),
      })
      if (error) throw error
      // 댓글 작성 포인트 +5P
      try {
        await (supabase as any).from('user_points').insert({
          user_id: profile.id,
          action: 'comment_post',
          points: 5,
          description: `웹툰 댓글 (${episodeTitle})`,
        })
      } catch { /* silent */ }
      setText('')
      await load()
    } catch (e) {
      alert('댓글 등록 실패: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSending(false)
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return
    try {
      await (supabase as any).from('webtoon_comments').update({
        body: editText.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      setEditingId(null)
      setEditText('')
      await load()
    } catch (e) {
      alert('수정 실패: ' + (e instanceof Error ? e.message : ''))
    }
  }

  async function deleteComment(id: string) {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) return
    try {
      await (supabase as any).from('webtoon_comments').delete().eq('id', id)
      await load()
    } catch (e) {
      alert('삭제 실패: ' + (e instanceof Error ? e.message : ''))
    }
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="mx-auto max-w-[960px] bg-white rounded-lg border border-warm-100 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-brand-700" />
        <h3 className="text-sm font-bold text-brand-900">댓글 {comments.length}</h3>
      </div>

      {/* 작성 폼 */}
      <div className="mb-5 flex gap-2 items-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          {profile?.full_name?.slice(0, 1) ?? '?'}
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="댓글을 입력하세요..."
          rows={2}
          className="flex-1 rounded-lg border border-warm-200 px-3 py-2 text-sm resize-none focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={postComment}
          disabled={sending || !text.trim()}
          className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900 disabled:opacity-40 flex items-center gap-1.5 self-stretch"
        >
          <Send size={13} />등록
        </button>
      </div>

      {/* 댓글 목록 */}
      {loading ? (
        <div className="py-8 text-center text-xs text-warm-400">불러오는 중...</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-xs text-warm-400">첫 댓글을 남겨보세요!</div>
      ) : (
        <div className="space-y-3">
          {comments.map(c => {
            const mine = c.user_id === profile?.id
            const canEdit = mine || isAdmin
            const canDelete = mine || isAdmin
            const editing = editingId === c.id
            return (
              <div key={c.id} className="flex gap-3 rounded-lg border border-warm-100 bg-warm-50 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {c.user_name?.slice(0, 1) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-brand-900">{c.user_name ?? '익명'}</span>
                    {c.user_dept && <span className="text-[10px] text-warm-400">{c.user_dept}</span>}
                    <span className="text-[10px] text-warm-400">
                      {new Date(c.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {c.updated_at !== c.created_at && ' · 수정됨'}
                    </span>
                  </div>
                  {editing ? (
                    <div className="flex gap-2 items-start">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        rows={2}
                        className="flex-1 rounded border border-warm-200 px-2 py-1.5 text-sm resize-none"
                      />
                      <button onClick={() => saveEdit(c.id)} className="text-brand-700 hover:text-brand-900 p-1.5" title="저장"><Check size={14} /></button>
                      <button onClick={() => { setEditingId(null); setEditText('') }} className="text-warm-500 hover:text-warm-700 p-1.5" title="취소"><XIcon size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-sm text-brand-900 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                  )}
                </div>
                {!editing && (
                  <div className="flex items-start gap-1 shrink-0">
                    {canEdit && (
                      <button onClick={() => { setEditingId(c.id); setEditText(c.body) }} className="text-[11px] text-brand-600 hover:text-brand-900 px-1.5 py-1 flex items-center gap-1" title="수정"><Edit2 size={11} /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => deleteComment(c.id)} className="text-[11px] text-red-500 hover:text-red-700 px-1.5 py-1 flex items-center gap-1" title="삭제"><Trash2 size={11} /></button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
