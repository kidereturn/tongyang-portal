import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Play, Star, Award, ListChecks, Shield } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'

type VideoRow = {
  id: string
  title: string
  description: string | null
  youtube_url: string
  youtube_id: string
  thumbnail_url: string | null
  duration: string | null
  has_subtitles: boolean
  is_active: boolean
  created_at: string
  category?: string | null
  difficulty?: string | null
  instructor?: string | null
  rating?: number | null
  rating_count?: number | null
  tag?: string | null
}

// Course categories (filter chips)
const CATEGORIES = [
  { key: 'all',        label: '전체',     count: 0 },
  { key: '필수',       label: '필수',     count: 0 },
  { key: '재무회계',   label: '재무회계', count: 0 },
  { key: '내부통제',   label: '내부통제', count: 0 },
  { key: '규제대응',   label: '규제대응', count: 0 },
  { key: '리더십',     label: '리더십',   count: 0 },
  { key: 'IT·보안',    label: 'IT·보안',  count: 0 },
]

// Fallback palette for cards (rotates when course doesn't have one set)
const CARD_SKINS = [
  { bg: 'linear-gradient(135deg, #3182F6 0%, #4B93F7 100%)', ink: '#FFFFFF' }, // Toss blue
  { bg: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', ink: '#FFFFFF' }, // dark navy
  { bg: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', ink: '#FFFFFF' }, // emerald
  { bg: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)', ink: '#FFFFFF' }, // gray
  { bg: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', ink: '#FFFFFF' }, // blue
  { bg: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)', ink: '#FFFFFF' }, // red
]

const TAG_STYLES: Record<string, React.CSSProperties> = {
  필수:   { background: '#3182F6', color: '#FFFFFF' },
  인기:   { background: '#F59E0B', color: '#FFFFFF' },
  추천:   { background: '#10B981', color: '#FFFFFF' },
  신규:   { background: '#8B5CF6', color: '#FFFFFF' },
  NEW:    { background: '#3182F6', color: '#FFFFFF' },
  진행중: { background: '#10B981', color: '#FFFFFF' },
}

// Icons per course (random emoji per card)
const ICONS = ['📘', '🧭', '⚖️', '🛡️', '💰', '🔐', '📊', '🎯', '🧩', '🏛️']

export default function CoursesPage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await (supabase as any)
          .from('course_videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }) as { data: VideoRow[] | null }
        setVideos(data ?? [])
      } catch (e) {
        console.error('[CoursesPage] load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: videos.length }
    for (const v of videos) {
      const c = v.category ?? '내부통제'
      base[c] = (base[c] ?? 0) + 1
    }
    return base
  }, [videos])

  const filtered = useMemo(() => {
    if (filter === 'all') return videos
    return videos.filter(v => (v.category ?? '내부통제') === filter)
  }, [videos, filter])

  const featured = videos[0]

  function openDetail(id: string) {
    const url = `${window.location.origin}/courses/${id}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">강좌<span className="sep" />사내 러닝 카탈로그</div>
            <h1>강좌. <span className="soft">한 강좌, 한 걸음.</span></h1>
            <p className="lead">
              내부회계·재무·규제 대응 강좌 {videos.length}개. 필수 강좌는 포인트 가산, 이수증은 LinkedIn에 공유할 수 있습니다.
            </p>
          </div>
          <div className="actions" style={{ display: 'flex', gap: 8 }}>
            <button className="btn-compact">
              <Award size={13} /> 내 이수내역
            </button>
            <button className="btn-compact primary">
              <ListChecks size={13} /> 강좌 신청
            </button>
          </div>
        </div>
      </div>

      <div className="pg-body">
        {/* Featured hero card */}
        {featured && (
          <button
            onClick={() => openDetail(featured.id)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E40AF 60%, #3B82F6 100%)',
              borderRadius: 16,
              padding: 40,
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 28,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                FEATURED · 이번 달 추천
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, maxWidth: 700 }}>
                {featured.title}
              </div>
              {featured.description && (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 12, maxWidth: 700, lineHeight: 1.6 }}>
                  {featured.description.slice(0, 90)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>
              <span>{filtered.length} LESSONS</span>
              <span>·</span>
              <span>{featured.duration ?? '6h 40m'}</span>
              <span>·</span>
              <span>필수</span>
            </div>
            <div style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', width: 84, height: 84, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center' }}>
              <Play size={32} fill="white" />
            </div>
          </button>
        )}

        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {CATEGORIES.map(cat => {
            const n = counts[cat.key] ?? 0
            return (
              <button
                key={cat.key}
                onClick={() => setFilter(cat.key)}
                className={clsx('filter-chip', filter === cat.key && 'active')}
                style={{ cursor: 'pointer' }}
              >
                {cat.label} <span style={{ opacity: 0.6, marginLeft: 4, fontFamily: 'var(--f-mono)', fontSize: 10 }}>{n}</span>
              </button>
            )
          })}
        </div>

        {/* Course grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="at-card skeleton" style={{ height: 260 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="at-card" style={{ textAlign: 'center', padding: 60, color: 'var(--at-ink-mute)' }}>
            <BookOpen size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>등록된 강좌가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {filtered.map((v, idx) => {
              const skin = CARD_SKINS[idx % CARD_SKINS.length]
              const emoji = ICONS[idx % ICONS.length]
              const tag = v.tag ?? (idx === 0 ? '진행중 42%' : idx % 3 === 0 ? '필수' : idx % 4 === 0 ? 'NEW' : idx % 5 === 0 ? '인기' : '추천')
              const tagKey = tag.replace(/\s+\d+%?/, '')
              const tagStyle = TAG_STYLES[tagKey] ?? TAG_STYLES['추천']
              const rating = v.rating ?? (4.5 + Math.random() * 0.5).toFixed(1)
              const ratingCount = v.rating_count ?? Math.floor(100 + Math.random() * 400)
              const instructor = v.instructor ?? '박지훈'
              const duration = v.duration ?? '4h 20m'
              const difficulty = v.difficulty ?? (idx % 3 === 0 ? '초급' : idx % 3 === 1 ? '중급' : '고급')

              return (
                <button
                  key={v.id}
                  onClick={() => openDetail(v.id)}
                  style={{
                    background: skin.bg,
                    color: skin.ink,
                    borderRadius: 14,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Colored top half with icon + tag */}
                  <div style={{ padding: '20px 20px 26px', position: 'relative', minHeight: 140 }}>
                    <div style={{ position: 'absolute', top: 14, left: 14, padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 999, ...tagStyle }}>
                      {tag}
                    </div>
                    <div style={{ fontSize: 48, textAlign: 'center', marginTop: 30, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
                      {emoji}
                    </div>
                  </div>

                  {/* White bottom half with title/info */}
                  <div style={{ background: '#FFFFFF', color: 'var(--at-ink)', padding: '18px 18px 18px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--at-ink)', lineHeight: 1.35, minHeight: 38 }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', marginTop: 6 }}>
                      강사 {instructor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--at-ink-hair)' }}>
                      <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>
                        ⏱ {duration} · {difficulty}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--at-ink)' }}>
                        <Star size={10} fill="#F59E0B" stroke="#F59E0B" />
                        <span style={{ fontWeight: 600 }}>{rating}</span>
                        <span style={{ color: 'var(--at-ink-mute)' }}>({ratingCount})</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Hint footer */}
        <div style={{ marginTop: 24, padding: 16, background: '#EEF4FE', border: '1px solid #DCE8FB', borderRadius: 10, fontSize: 12, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={14} />
          강좌 카드를 클릭하면 새 창에서 영상이 재생됩니다. 배속은 최대 2배까지, 임의 건너뛰기는 제한됩니다.
        </div>
      </div>
    </>
  )
}
