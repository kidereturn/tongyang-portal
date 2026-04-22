import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, Award, ListChecks, Shield, X, Send, Clock } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { safeQuery } from '../../lib/queryWithTimeout'
import { useAuth } from '../../hooks/useAuth'

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

type ProgressMap = Record<string, number> // course_id → progress_percent (0-100)

export default function CoursesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showRegister, setShowRegister] = useState(false)
  const [regCategory, setRegCategory] = useState('재무회계')
  const [regTitle, setRegTitle] = useState('')
  const [regReason, setRegReason] = useState('')
  const [regSaving, setRegSaving] = useState(false)
  const [progressMap, setProgressMap] = useState<ProgressMap>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [vidsRes, progRes] = await Promise.all([
          safeQuery<VideoRow[]>(
            (supabase as any).from('course_videos').select('*').eq('is_active', true).order('created_at', { ascending: false }),
            12_000,
            'courses.videos',
          ),
          profile?.id
            ? safeQuery<Array<{ course_id: string; progress_percent: number; status: string }>>(
                (supabase as any).from('learning_progress').select('course_id, progress_percent, status').eq('user_id', profile.id),
                10_000,
                'courses.progress',
              )
            : Promise.resolve({ data: [], error: null }),
        ])
        if (!cancelled) {
          setVideos(vidsRes.data ?? [])
          const pm: ProgressMap = {}
          for (const row of progRes.data ?? []) {
            // 같은 course 여러 행이면 최고치 채택
            const prev = pm[row.course_id] ?? 0
            pm[row.course_id] = Math.max(prev, Math.round(row.progress_percent ?? 0))
          }
          setProgressMap(pm)
        }
      } catch (e) {
        console.error('[CoursesPage] load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()

    // 탭이 백그라운드로 갔다가 돌아왔을 때 스켈레톤 고착 방지
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loading) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function submitRegistration() {
    if (!regTitle.trim()) { alert('신청할 강좌명을 입력해주세요.'); return }
    if (!profile?.id) return
    setRegSaving(true)
    try {
      await (supabase as any).from('course_registrations').insert({
        user_id: profile.id,
        requested_category: regCategory,
        requested_title: regTitle.trim(),
        reason: regReason.trim() || null,
      })
      // Notify all admins
      const { data: admins } = await (supabase as any).from('profiles').select('id').eq('role', 'admin').eq('is_active', true)
      if (admins?.length) {
        const notes = admins.map((a: { id: string }) => ({
          recipient_id: a.id,
          sender_id: profile.id,
          title: `강좌 신청 - ${profile.full_name ?? ''} (${profile.employee_id ?? ''})`,
          body: `카테고리: ${regCategory}\n강좌명: ${regTitle.trim()}\n사유: ${regReason.trim() || '(없음)'}`,
          is_read: false,
        }))
        await (supabase as any).from('notifications').insert(notes)
      }
      alert('강좌 신청이 접수되었습니다. 관리자에게 알림이 전송되었어요.')
      setRegTitle(''); setRegReason('')
      setShowRegister(false)
    } catch (e: any) {
      alert('신청 실패: ' + (e?.message ?? ''))
    } finally {
      setRegSaving(false)
    }
  }

  // 수강기한 (deadline) — prefer DB-set value, fallback to end of current quarter
  function deadlineFor(v: VideoRow | undefined, _idx: number): string {
    if (v && (v as any).deadline) {
      const d = new Date((v as any).deadline)
      return `${d.getMonth() + 1}/${d.getDate()}까지`
    }
    const now = new Date()
    const q = Math.floor(now.getMonth() / 3)
    const end = new Date(now.getFullYear(), q * 3 + 3, 0)
    return `${end.getMonth() + 1}/${end.getDate()}까지`
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">강좌<span className="sep" />사내 러닝 카탈로그</div>
            <h1>강좌. <span className="soft">한 강좌, 한 걸음.</span></h1>
            <p className="lead">
              내부회계·재무·규제 대응 강좌 {videos.length}개. 필수 강좌는 포인트가 가산됩니다.
            </p>
          </div>
          <div className="actions" style={{ display: 'flex', gap: 8 }}>
            <button className="btn-compact" onClick={() => navigate('/learning')}>
              <Award size={13} /> 내 이수내역
            </button>
            <button className="btn-compact primary" onClick={() => setShowRegister(true)}>
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
            <div style={{ paddingRight: 140 /* 우측 재생 원형 버튼(84px)+여백 확보 */ }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
                FEATURED · 필수 수강 강의
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {featured.title}
              </div>
              {featured.description && (
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 12, lineHeight: 1.6 }}>
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
              const progress = progressMap[v.id] ?? 0
              // 실제 진도율에 따라 태그 결정 — 가짜 값 제거
              let tag: string
              let tagKey: string
              if (progress >= 100) { tag = '이수완료'; tagKey = '추천' }
              else if (progress > 0) { tag = `진행중 ${progress}%`; tagKey = '진행중' }
              else if (v.tag) { tag = v.tag; tagKey = v.tag.replace(/\s+\d+%?/, '') }
              else if ((v.category ?? '') === '필수') { tag = '필수'; tagKey = '필수' }
              else { tag = '신규'; tagKey = 'NEW' }
              const tagStyle = TAG_STYLES[tagKey] ?? TAG_STYLES['추천']
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
                    border: '1px solid var(--at-ink-hair)',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 280,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                    e.currentTarget.style.borderColor = '#3182F6'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
                    e.currentTarget.style.borderColor = 'var(--at-ink-hair)'
                  }}
                >
                  {/* Colored top half with tag only (fixed height so all cards align) */}
                  <div style={{ padding: '20px 20px 26px', position: 'relative', height: 110, flexShrink: 0 }}>
                    {/* 태그는 가로 한 줄로 — whiteSpace:nowrap 과 넉넉한 좌우 패딩 */}
                    <div style={{ position: 'absolute', top: 14, left: 14, padding: '5px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, whiteSpace: 'nowrap', lineHeight: 1.2, ...tagStyle }}>
                      {tag}
                    </div>
                  </div>

                  {/* White bottom half — 100% 폭 고정 흰색 (박스별 폭 차이 제거) */}
                  <div style={{ background: '#FFFFFF', color: 'var(--at-ink)', padding: '18px', borderTop: '1px solid var(--at-ink-hair)', display: 'flex', flexDirection: 'column', height: 170, width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--at-ink)', lineHeight: 1.35, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {v.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', marginTop: 6 }}>
                      강사 {instructor}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#1E40AF', marginTop: 8, padding: '4px 8px', background: '#EEF4FE', border: '1px solid #DCE8FB', borderRadius: 6, alignSelf: 'flex-start' }}>
                      <Clock size={10} />
                      수강기한 {deadlineFor(v, idx)}
                    </div>
                    {/* 별점 제거 — 하단 정보줄만 유지 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--at-ink-hair)' }}>
                      <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>
                        ⏱ {duration} · {difficulty}
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

      {/* 강좌 신청 팝업 */}
      {showRegister && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setShowRegister(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowRegister(false) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>REQUEST</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>강좌 신청</div>
              </div>
              <button onClick={() => setShowRegister(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6 }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-ink-mute)' }}>카테고리</span>
                <select
                  value={regCategory}
                  onChange={e => setRegCategory(e.target.value)}
                  style={{ padding: '10px 12px', border: '1px solid var(--at-ink-hair)', borderRadius: 8, fontSize: 13 }}
                >
                  {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-ink-mute)' }}>신청할 강좌명</span>
                <input
                  type="text"
                  value={regTitle}
                  onChange={e => setRegTitle(e.target.value)}
                  placeholder="예: ESG 회계 실무 심화"
                  style={{ padding: '10px 12px', border: '1px solid var(--at-ink-hair)', borderRadius: 8, fontSize: 13 }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--at-ink-mute)' }}>신청 사유 (선택)</span>
                <textarea
                  value={regReason}
                  onChange={e => setRegReason(e.target.value)}
                  placeholder="왜 이 강좌가 필요한지 간단히 적어주세요."
                  rows={4}
                  style={{ padding: '10px 12px', border: '1px solid var(--at-ink-hair)', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>

              <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', background: 'var(--at-ivory)', padding: '10px 12px', borderRadius: 8 }}>
                신청 내용은 관리자에게 실시간 알림으로 전송됩니다.
              </div>

              <button
                onClick={submitRegistration}
                disabled={regSaving || !regTitle.trim()}
                className="btn-compact primary"
                style={{ width: '100%', padding: '12px 18px', justifyContent: 'center', fontSize: 13, opacity: regSaving || !regTitle.trim() ? 0.5 : 1 }}
              >
                <Send size={14} /> {regSaving ? '신청 중...' : '신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
