import { useEffect, useState } from 'react'
import { ArrowUp, BookOpen, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

type Episode = {
  id: string
  episode_number: number
  title: string
  image_path: string
  created_at: string
}

function getPublicUrl(path: string) {
  const { data } = (supabase.storage as any).from('webtoon').getPublicUrl(path)
  return data?.publicUrl ?? ''
}

export default function WebtoonPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await (supabase as any)
          .from('webtoon_episodes')
          .select('*')
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

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goPrev() {
    setCurrent(prev => Math.max(0, prev - 1))
  }
  function goNext() {
    setCurrent(prev => Math.min(episodes.length - 1, prev + 1))
  }

  const ep = episodes[current]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 opacity-80" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">Webtoon</p>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">내부회계 웹툰</h1>
        </div>
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={24} className="animate-spin mr-2" />
          로딩 중...
        </div>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 text-white shadow-2xl">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 opacity-80" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">Webtoon</p>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">내부회계 웹툰</h1>
        </div>
        <div className="py-20 text-center text-sm text-slate-400">
          등록된 웹툰이 없습니다. 관리자가 에피소드를 업로드하면 여기에 표시됩니다.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-[28px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-6 py-8 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 opacity-80" />
          <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">Webtoon</p>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">내부회계 웹툰</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed opacity-80">
          내부회계관리제도를 쉽고 재미있게 이해할 수 있는 웹툰 콘텐츠입니다.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2">
        {episodes.map((e, idx) => (
          <button
            key={e.id}
            onClick={() => setCurrent(idx)}
            className={clsx(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition',
              idx === current
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            {e.episode_number}화
          </button>
        ))}
        <div className="ml-auto text-xs text-slate-400">
          {current + 1} / {episodes.length}
        </div>
        {current > 0 && (
          <button
            onClick={goPrev}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {current < episodes.length - 1 && (
          <button
            onClick={goNext}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Webtoon Viewer */}
      {ep && (
        <div className="mx-auto max-w-[720px] bg-white">
          <img
            key={ep.id}
            src={getPublicUrl(ep.image_path)}
            alt={ep.title}
            className="w-full"
            loading="eager"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              if (target.parentElement) {
                target.parentElement.innerHTML = `
                  <div class="flex flex-col items-center justify-center py-20 text-slate-400">
                    <p class="text-lg font-bold">이미지를 불러올 수 없습니다</p>
                    <p class="mt-2 text-sm">${ep.title}</p>
                  </div>`
              }
            }}
          />
        </div>
      )}

      {/* Bottom navigation */}
      <div className="mx-auto flex max-w-[720px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <button
          onClick={goPrev}
          disabled={current === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />이전 화
        </button>
        <div className="flex gap-2">
          {episodes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={clsx(
                'h-2.5 rounded-full transition-all',
                idx === current ? 'w-8 bg-brand-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>
        <button
          onClick={goNext}
          disabled={current >= episodes.length - 1}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          다음 화<ChevronRight size={16} />
        </button>
      </div>

      {/* 처음으로 플로팅 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 flex h-12 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-bold text-white shadow-2xl transition-all hover:bg-brand-700 hover:shadow-brand-200 active:scale-95"
        >
          <ArrowUp size={16} />
          처음으로
        </button>
      )}
    </div>
  )
}
