import { useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const WEBTOON_PAGES = [
  { id: 1, src: '/webtoon-1.jpg', alt: '내부회계 웹툰 1화' },
  { id: 2, src: '/webtoon-2.jpg', alt: '내부회계 웹툰 2화' },
]

export default function WebtoonPage() {
  const [current, setCurrent] = useState(0)

  function goPrev() {
    setCurrent(prev => Math.max(0, prev - 1))
  }
  function goNext() {
    setCurrent(prev => Math.min(WEBTOON_PAGES.length - 1, prev + 1))
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

      {/* Viewer */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-5 py-3">
          {WEBTOON_PAGES.map((page, idx) => (
            <button
              key={page.id}
              onClick={() => setCurrent(idx)}
              className={clsx(
                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                idx === current
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              {idx + 1}화
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-400">
            {current + 1} / {WEBTOON_PAGES.length}
          </div>
        </div>

        {/* Image */}
        <div className="relative flex items-center justify-center bg-slate-50">
          <img
            src={WEBTOON_PAGES[current].src}
            alt={WEBTOON_PAGES[current].alt}
            className="max-h-[80vh] w-full object-contain"
          />

          {/* Navigation arrows */}
          {current > 0 && (
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {current < WEBTOON_PAGES.length - 1 && (
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur transition hover:bg-black/60"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-5 py-3">
          {WEBTOON_PAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={clsx(
                'h-2 rounded-full transition-all',
                idx === current ? 'w-6 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
