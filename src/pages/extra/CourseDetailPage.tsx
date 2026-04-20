import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { BookOpen, PauseCircle, PlayCircle, RotateCcw, CheckCircle2, Circle, Star, FileDown, MessageSquare, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import CourseQuizModal from '../../components/CourseQuizModal'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

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

const PLAYBACK_RATES = [1, 1.25, 1.5, 2]

export default function CourseDetailPage() {
  const { profile } = useAuth()
  const { id: courseId } = useParams<{ id: string }>()
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const playerRef = useRef<any>(null)
  const watchLimitRef = useRef(0)
  const [, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [playerError, setPlayerError] = useState<string | null>(null)

  const watchedLabel = useMemo(() => {
    const m = Math.floor(currentTime / 60)
    const s = Math.floor(currentTime % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }, [currentTime])

  const durationLabel = useMemo(() => {
    const m = Math.floor(duration / 60)
    const s = Math.floor(duration % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }, [duration])

  // Fetch videos from DB (newest first)
  useEffect(() => {
    async function load() {
      try {
        const { data } = await (supabase as any)
          .from('course_videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }) as { data: VideoRow[] | null }
        const list = data ?? []
        setVideos(list)
        // Prefer URL param, fallback to first video
        const target = courseId ? list.find(v => v.id === courseId) : list[0]
        setSelectedVideo(target ?? list[0] ?? null)
      } catch (err) {
        console.error('[CourseDetailPage] fetch error:', err)
        setLoadError('강좌를 불러오는 중 오류가 발생했습니다. 새로고침해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [courseId])

  // Load saved progress from DB when video changes
  useEffect(() => {
    if (!profile?.id || !selectedVideo?.id) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('learning_progress')
          .select('watched_seconds, duration_seconds, progress_percent')
          .eq('user_id', profile.id)
          .eq('course_id', selectedVideo.id)
          .maybeSingle()
        if (data && data.watched_seconds > 0) {
          watchLimitRef.current = data.watched_seconds
          setCurrentTime(data.watched_seconds)
          setProgress(data.progress_percent ?? 0)
          if (data.duration_seconds > 0) setDuration(data.duration_seconds)
        }
      } catch {
        // silent
      }
    })()
  }, [profile?.id, selectedVideo?.id])

  // YouTube player setup
  useEffect(() => {
    if (!selectedVideo?.youtube_id) return

    let intervalId: number | undefined

    function createPlayer() {
      if (!window.YT?.Player) return
      // Destroy existing player — this removes the DOM div, so we must re-create it
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch { /* ignore */ }
        playerRef.current = null
      }
      // Re-create the container div (destroy() removes it from DOM)
      const container = document.getElementById('yt-player-wrap')
      if (container) {
        const existing = document.getElementById('youtube-course-player')
        if (!existing) {
          const div = document.createElement('div')
          div.id = 'youtube-course-player'
          div.className = 'h-full w-full'
          container.appendChild(div)
        }
      }

      playerRef.current = new window.YT.Player('youtube-course-player', {
        videoId: selectedVideo!.youtube_id,
        playerVars: {
          controls: 1,
          disablekb: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          cc_load_policy: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setReady(true)
            setPlayerError(null)
            const d = Number(playerRef.current.getDuration?.() ?? 0)
            setDuration(d)
            if (watchLimitRef.current > 0 && playerRef.current?.seekTo) {
              playerRef.current.seekTo(watchLimitRef.current, true)
            }
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === 1)
          },
          onError: (event: { data: number }) => {
            const errors: Record<number, string> = {
              2: '잘못된 동영상 ID입니다',
              5: '플레이어 오류가 발생했습니다',
              100: '동영상을 찾을 수 없습니다 (삭제/비공개)',
              101: '임베딩이 차단된 동영상입니다',
              150: '임베딩이 차단된 동영상입니다',
            }
            setPlayerError(errors[event.data] ?? `재생 오류 (코드: ${event.data})`)
          },
        },
      })
    }

    // Only reset local UI — watchLimitRef is set by the DB load effect above
    setReady(false)
    setPlaying(false)
    setPlaybackRate(1)
    setPlayerError(null)

    if (!window.YT?.Player) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(script)
      window.onYouTubeIframeAPIReady = createPlayer
    } else {
      createPlayer()
    }

    intervalId = window.setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return
      const now = Number(playerRef.current.getCurrentTime() ?? 0)
      const d = Number(playerRef.current.getDuration?.() ?? 0)
      setDuration(d)

      if (now > watchLimitRef.current + 3) {
        playerRef.current.seekTo(watchLimitRef.current, true)
        return
      }
      watchLimitRef.current = Math.max(watchLimitRef.current, now)
      setCurrentTime(watchLimitRef.current)

      const p = d > 0 ? Math.min(100, Math.round((watchLimitRef.current / d) * 100)) : 0
      setProgress(p)
    }, 1000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [selectedVideo?.id])

  function handlePlayPause() {
    if (!playerRef.current) return
    playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo()
  }

  function handleRestart() {
    if (!playerRef.current) return
    playerRef.current.seekTo(0, true)
    watchLimitRef.current = 0
    setCurrentTime(0)
    setProgress(0)
  }

  function handleRateChange(rate: number) {
    if (!playerRef.current) return
    playerRef.current.setPlaybackRate(rate)
    setPlaybackRate(rate)
  }

  // Save progress helper — reused in interval, unload, and video switch
  const saveProgressRef = useRef<(() => Promise<void>) | null>(null)
  saveProgressRef.current = async () => {
    if (!profile?.id || !selectedVideo?.id || watchLimitRef.current <= 0) return
    const d = duration || (playerRef.current?.getDuration?.() ?? 0)
    const pct = d > 0 ? Math.min(100, Math.round((watchLimitRef.current / d) * 100)) : 0
    const st = pct >= 95 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('upsert_learning_progress', {
        p_user_id: profile.id,
        p_course_id: selectedVideo.id,
        p_watched_seconds: Math.round(watchLimitRef.current),
        p_duration_seconds: Math.round(d),
        p_progress_percent: pct,
        p_status: st,
      })
      if (error) console.error('[CoursesPage] rpc save error:', error.message, error.code)
    } catch (err) {
      console.error('[CoursesPage] save progress exception:', err)
    }
  }

  // Save every 10 seconds + on page unload
  useEffect(() => {
    if (!profile?.id || !selectedVideo?.id) return

    const saveInterval = window.setInterval(() => {
      saveProgressRef.current?.()
    }, 10000)

    function handleBeforeUnload() {
      if (watchLimitRef.current <= 0 || !profile?.id || !selectedVideo?.id) return
      const d = duration || 0
      const pct = d > 0 ? Math.min(100, Math.round((watchLimitRef.current / d) * 100)) : 0
      const status = pct >= 95 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
      try {
        fetch(`${supabaseUrl}/rest/v1/rpc/upsert_learning_progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            p_user_id: profile.id,
            p_course_id: selectedVideo.id,
            p_watched_seconds: Math.round(watchLimitRef.current),
            p_duration_seconds: Math.round(d),
            p_progress_percent: pct,
            p_status: status,
          }),
          keepalive: true,
        })
      } catch { /* best effort on page close */ }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(saveInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Save on cleanup (video switch)
      saveProgressRef.current?.()
    }
  }, [profile?.id, selectedVideo?.id, duration])

  // Quiz modal state
  const [quizOpen, setQuizOpen] = useState(false)
  const quizTriggeredRef = useRef<Set<string>>(new Set())

  // Check if quiz should trigger (progress >= 95%)
  useEffect(() => {
    if (!profile?.id || !selectedVideo?.id || progress < 95) return
    if (quizTriggeredRef.current.has(selectedVideo.id)) return
    // Check if user already took quiz for this course
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('quiz_results')
          .select('id')
          .eq('user_id', profile.id)
          .eq('course_id', selectedVideo.id)
          .limit(1)
        if (data && data.length > 0) {
          quizTriggeredRef.current.add(selectedVideo.id)
          return // Already took quiz
        }
        quizTriggeredRef.current.add(selectedVideo.id)
        setQuizOpen(true)
      } catch { /* silent */ }
    })()
  }, [profile?.id, selectedVideo?.id, progress])

  // Load all video progress for the sidebar list
  const [, setVideoProgress] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!profile?.id || videos.length === 0) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('learning_progress')
          .select('course_id, progress_percent')
          .eq('user_id', profile.id)
        const map: Record<string, number> = {}
        for (const row of data ?? []) {
          map[row.course_id] = row.progress_percent ?? 0
        }
        setVideoProgress(map)
      } catch { /* silent */ }
    })()
  }, [profile?.id, videos])

  function selectVideo(v: VideoRow) {
    // Save current progress before switching
    saveProgressRef.current?.()
    // Reset watchLimit for new video (will be loaded by DB effect)
    watchLimitRef.current = 0
    setCurrentTime(0)
    setProgress(0)
    setDuration(0)
    setSelectedVideo(v)
  }

  // Auto-close prevention: popup-style detail (opens in new window from list)
  const catLabel = selectedVideo?.category ?? '내부통제'
  const difficulty = selectedVideo?.difficulty ?? '초급'
  const isMust = (selectedVideo?.tag ?? '필수').includes('필수')
  const instructor = selectedVideo?.instructor ?? '박지훈 · 김서희 리드'
  const rating = selectedVideo?.rating ?? 4.8
  const ratingCount = selectedVideo?.rating_count ?? 182

  // Hooks that depend on videos — must be called BEFORE any early return
  const chapters = useMemo(() => {
    const list = videos.slice()
    const out: { ch: number; title: string; items: VideoRow[] }[] = []
    for (let i = 0; i < list.length; i += 3) {
      out.push({
        ch: Math.floor(i / 3) + 1,
        title: i === 0 ? '오리엔테이션' : i === 3 ? '내부통제의 정의' : i === 6 ? '통제환경 · CONTROL ENVIRONMENT' : i === 9 ? '위험평가 · RISK ASSESSMENT' : `Chapter ${Math.floor(i / 3) + 1}`,
        items: list.slice(i, i + 3),
      })
    }
    return out
  }, [videos])

  const pageHeader = (
    <div className="pg-head">
      <div className="pg-head-row">
        <div>
          <div className="eyebrow">
            <Link to="/courses" style={{ color: 'var(--at-ink-mute)', textDecoration: 'none' }}>강좌</Link>
            <span className="sep" />
            {catLabel}
            <span className="sep" />
            {selectedVideo?.title ?? ''}
          </div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/courses" style={{ color: 'var(--at-ink-mute)', textDecoration: 'none', fontSize: 20, display: 'inline-flex' }}>
              <ChevronLeft size={22} />
            </Link>
            {selectedVideo?.title ?? '강좌'}
          </h1>
          {selectedVideo?.description && (
            <p className="lead">{selectedVideo.description}</p>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <>
        {pageHeader}
        <div className="pg-body">
          <div className="text-center text-sm text-warm-400 py-20">
            {loadError ?? '강좌를 불러오는 중...'}
          </div>
        </div>
      </>
    )
  }

  if (videos.length === 0) {
    return (
      <>
        {pageHeader}
        <div className="pg-body">
          <div className="text-center text-sm text-warm-400 py-20">등록된 강좌가 없습니다. 관리자가 동영상을 추가하면 여기에 표시됩니다.</div>
        </div>
      </>
    )
  }

  // Sample Q&A data (future: fetch from course_qa table)
  const qaSample = [
    { user: '김서영', date: '2일 전 14:22', content: 'COSO 2013년과 2025년 가장 큰 차이가 뭔가요? 실무에 반영할 때 어디부터 손을 대는 게 좋을지 궁금합니다.', replies: 3, tag: '강사답' },
    { user: '정아영', date: '3일 전 09:50', content: '챕터 3 어떻게서 나온 "고유위험 vs 잔여위험" 설명이 너무 쉽네요. 예시 하나만 더 있었으면 종겠어요!', replies: 1, tag: '기대글' },
  ]

  const currentChapterIdx = chapters.findIndex(ch => ch.items.some(it => it.id === selectedVideo?.id))
  const completedCount = Math.floor((videos.length * 5) / 12)

  return (
    <>
      {pageHeader}
      <div className="pg-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* LEFT: Video player + actions + Q&A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Player */}
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', position: 'relative' }}>
              <div className="aspect-video" style={{ position: 'relative' }} id="yt-player-wrap">
                <div id="youtube-course-player" className="h-full w-full" />
                {playerError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: '#fff' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#F87171' }}>{playerError}</p>
                    <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>다른 강좌를 선택하거나 관리자에게 문의하세요</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tags + Title */}
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {isMust && <span style={{ padding: '3px 8px', background: '#3182F6', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4 }}>필수</span>}
                <span style={{ padding: '3px 8px', background: 'var(--at-ivory)', color: 'var(--at-ink-mute)', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--at-ink-hair)' }}>{catLabel}</span>
                <span style={{ padding: '3px 8px', background: 'var(--at-ivory)', color: 'var(--at-ink-mute)', fontSize: 10, fontWeight: 600, borderRadius: 4, border: '1px solid var(--at-ink-hair)' }}>{difficulty}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--at-ink)', margin: '8px 0' }}>{selectedVideo?.title}</h2>
              {selectedVideo?.description && (
                <p style={{ fontSize: 13, color: 'var(--at-ink-mute)', lineHeight: 1.6 }}>{selectedVideo.description}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--at-ink-hair)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3182F6', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>박</div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>강사</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{instructor}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>수강생</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>284 명</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>평점</div>
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} fill="#F59E0B" stroke="#F59E0B" /> {rating} ({ratingCount}개 리뷰)
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>이수 시</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3182F6' }}>+30 P 이수 시</div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={handlePlayPause} className="btn-compact primary" style={{ padding: '10px 18px' }}>
                  {playing ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  {playing ? '일시정지' : `이어서 시청 · ${watchedLabel}부터`}
                </button>
                <button className="btn-compact">
                  <FileDown size={13} /> 자료 받기 (6)
                </button>
                <button onClick={() => setQuizOpen(true)} className="btn-compact">
                  <BookOpen size={13} /> 퀴즈 응시
                </button>
                <button onClick={handleRestart} className="btn-compact" style={{ marginLeft: 'auto' }}>
                  <RotateCcw size={13} /> 처음부터
                </button>
              </div>

              {/* Progress + rate */}
              <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--at-ivory)', border: '1px solid var(--at-ink-hair)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--f-mono)', marginBottom: 8 }}>
                  <span>{watchedLabel} / {duration > 0 ? durationLabel : '로딩 중'}</span>
                  <span style={{ color: '#3182F6', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--at-ink-hair)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: 4, background: '#3182F6', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {PLAYBACK_RATES.map(rate => (
                    <button
                      key={rate}
                      onClick={() => handleRateChange(rate)}
                      className={clsx('filter-chip', playbackRate === rate && 'active')}
                      style={{ cursor: 'pointer', fontSize: 10 }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Q&A */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  <MessageSquare size={15} style={{ display: 'inline', marginRight: 6 }} />
                  수강생 질문 · {qaSample.length * 12}
                </h3>
                <button className="btn-compact">+ 질문하기</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {qaSample.map((q, i) => (
                  <div key={i} className="at-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EEF4FE', color: '#3182F6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                        {q.user.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{q.user}</div>
                        <div style={{ fontSize: 10, color: 'var(--at-ink-mute)' }}>{q.date}</div>
                      </div>
                      <span style={{ padding: '2px 8px', background: '#10B981', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4 }}>{q.tag}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--at-ink)', lineHeight: 1.55, marginLeft: 36 }}>{q.content}</p>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, marginLeft: 36, fontSize: 11, color: 'var(--at-ink-mute)' }}>
                      <span>👍 {12 + i * 5}</span>
                      <span>💬 답글 {q.replies}</span>
                      <span>📎 자료 첨부</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Curriculum sidebar */}
          <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
            <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--at-ink-hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', letterSpacing: '0.12em' }}>CURRICULUM · 전체 {videos.length}강</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>커리큘럼</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--at-ink-mute)' }}>진행</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3182F6' }}>{completedCount}/{videos.length} · {Math.round((completedCount / videos.length) * 100)}%</div>
                </div>
              </div>

              <div style={{ maxHeight: 640, overflowY: 'auto' }}>
                {chapters.map((ch, chi) => (
                  <div key={chi}>
                    <div style={{ padding: '10px 18px', background: 'var(--at-ivory)', fontSize: 10, fontWeight: 700, color: 'var(--at-ink-mute)', letterSpacing: '0.1em' }}>
                      CH {String(ch.ch).padStart(2, '0')} · {ch.title}
                    </div>
                    {ch.items.map((it, ii) => {
                      const isSel = it.id === selectedVideo?.id
                      const isDone = chi < currentChapterIdx || (chi === currentChapterIdx && ii < 1)
                      return (
                        <button
                          key={it.id}
                          onClick={() => selectVideo(it)}
                          style={{
                            width: '100%',
                            padding: '12px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: isSel ? '#EEF4FE' : '#fff',
                            border: 'none',
                            borderLeft: isSel ? '3px solid #3182F6' : '3px solid transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--at-ivory)' }}
                          onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = '#fff' }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                          ) : (
                            <Circle size={16} style={{ color: isSel ? '#3182F6' : 'var(--at-ink-faint)', flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', fontFamily: 'var(--f-mono)' }}>
                              {ch.ch}-{ii + 1}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: isSel ? 700 : 500, color: 'var(--at-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.title}
                            </div>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                            {it.duration ?? '3:20'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course completion quiz modal */}
      {selectedVideo && (
        <CourseQuizModal
          courseId={selectedVideo.id}
          courseTitle={selectedVideo.title}
          open={quizOpen}
          onClose={() => setQuizOpen(false)}
        />
      )}
    </>
  )
}
