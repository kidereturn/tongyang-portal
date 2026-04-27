import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {PauseCircle, PlayCircle, RotateCcw, CheckCircle2, Circle, MessageSquare, ChevronLeft } from 'lucide-react'
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

  // Preserve max-progress watermark so restarting doesn't lower recorded progress.
  // When user watches again past the previous max, new progress is recorded.
  const maxProgressRef = useRef(0)
  useEffect(() => { if (progress > maxProgressRef.current) maxProgressRef.current = progress }, [progress])

  function handleRestart() {
    if (!playerRef.current) return
    // Remember the highest progress ever reached in this session/DB
    const prevMax = Math.max(maxProgressRef.current, progress)
    maxProgressRef.current = prevMax
    // Seek to 0 but keep the DB max progress; watchLimitRef tracks current pass only
    playerRef.current.seekTo(0, true)
    watchLimitRef.current = 0
    setCurrentTime(0)
    // Do NOT reset progress bar display to 0 — keep the recorded max.
    setProgress(prevMax)
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
    // Do NOT downgrade the DB value — only save when current pass exceeds previous max
    if (pct < maxProgressRef.current) return
    maxProgressRef.current = pct
    // 이수완료(status=completed) 는 영상 95%+퀴즈 통과 둘 다 필요 → CourseQuizModal 에서만 완료 처리
    // 여기서는 최대 in_progress 로만 기록 (사용자 요청: 영상만 보고 완료 처리되던 버그 수정)
    const st = pct > 0 ? 'in_progress' : 'not_started'

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
      // 영상만 보고 completed 로 처리하던 로직 제거 — 퀴즈 통과까지 거쳐야 completed
      const status = pct > 0 ? 'in_progress' : 'not_started'
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
    // Check if user already took quiz for this course OR already completed the course
    ;(async () => {
      try {
        const [quizRes, progRes] = await Promise.all([
          (supabase as any).from('quiz_results').select('id').eq('user_id', profile.id).eq('course_id', selectedVideo.id).limit(1),
          (supabase as any).from('learning_progress').select('status').eq('user_id', profile.id).eq('course_id', selectedVideo.id).maybeSingle(),
        ])
        const alreadyQuizzed = quizRes?.data && quizRes.data.length > 0
        const alreadyCompleted = progRes?.data?.status === 'completed'
        if (alreadyQuizzed || alreadyCompleted) {
          quizTriggeredRef.current.add(selectedVideo.id)
          return // 퀴즈 이미 봤거나 완료된 강좌 → 재방문 시 자동 popup X
        }
        quizTriggeredRef.current.add(selectedVideo.id)
        setQuizOpen(true)
      } catch { /* silent */ }
    })()
  }, [profile?.id, selectedVideo?.id, progress])

  // Rank among all learners (based on progress_percent for this course)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalLearners, setTotalLearners] = useState(0)
  useEffect(() => {
    if (!profile?.id || !selectedVideo?.id) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('learning_progress')
          .select('user_id, progress_percent')
          .eq('course_id', selectedVideo.id)
          .order('progress_percent', { ascending: false })
        const rows = (data ?? []) as Array<{ user_id: string; progress_percent: number }>
        setTotalLearners(rows.length)
        const idx = rows.findIndex(r => r.user_id === profile.id)
        setMyRank(idx >= 0 ? idx + 1 : null)
      } catch { /* silent */ }
    })()
  }, [profile?.id, selectedVideo?.id, progress])

  // Q&A state
  const [qaList, setQaList] = useState<Array<{ id: string; user_id: string; question: string; answer?: string | null; created_at: string; user_name?: string; answered_at?: string | null }>>([])
  const [showAskQ, setShowAskQ] = useState(false)
  const [qAsking, setQAsking] = useState(false)
  const [newQText, setNewQText] = useState('')
  const [qAnonymous, setQAnonymous] = useState(false)
  const [detailQ, setDetailQ] = useState<typeof qaList[number] | null>(null)

  // 익명 마커 (zero-width chars) — DB 스키마 변경 없이 익명 플래그를 안전하게 인코딩
  const ANON_MARK = '​​[익명]​'

  useEffect(() => {
    if (!selectedVideo?.id) return
    ;(async () => {
      try {
        const { data } = await (supabase as any)
          .from('course_qa')
          .select('id, user_id, question, answer, created_at, answered_at, profiles:profiles(full_name)')
          .eq('course_id', selectedVideo.id)
          .order('created_at', { ascending: false })
        const isAdminUser = profile?.role === 'admin'
        const items = (data ?? []).map((r: any) => {
          const rawQ = r.question ?? ''
          const isAnon = typeof rawQ === 'string' && rawQ.startsWith(ANON_MARK)
          const cleanQ = isAnon ? rawQ.slice(ANON_MARK.length) : rawQ
          const realName = r.profiles?.full_name ?? '익명'
          // 관리자는 익명 게시도 [익명: 홍길동] 형태로 신원 확인 (운영 목적)
          const displayName = isAnon
            ? (isAdminUser ? `[익명: ${realName}]` : '익명')
            : realName
          return {
            id: r.id,
            user_id: r.user_id,
            question: cleanQ,
            answer: r.answer,
            answered_at: r.answered_at,
            created_at: r.created_at,
            user_name: displayName,
          }
        })
        setQaList(items)
      } catch { /* silent */ }
    })()
  }, [selectedVideo?.id, profile?.role])

  async function submitQuestion() {
    const text = newQText.trim()
    if (!text || !profile?.id || !selectedVideo?.id) return
    setQAsking(true)
    try {
      const storedQ = qAnonymous ? `${ANON_MARK}${text}` : text
      await (supabase as any).from('course_qa').insert({
        course_id: selectedVideo.id,
        user_id: profile.id,
        question: storedQ,
      })
      // Notify self + admins (관리자에겐 익명이어도 작성자 표시 — 운영 목적)
      const recipients: Array<{ id: string }> = []
      const { data: admins } = await (supabase as any).from('profiles').select('id').eq('role', 'admin').eq('is_active', true)
      recipients.push(...(admins ?? []))
      recipients.push({ id: profile.id })
      const unique = Array.from(new Set(recipients.map(r => r.id)))
      const notes = unique.map(id => ({
        recipient_id: id,
        sender_id: profile.id,
        title: `수강생 질문${qAnonymous ? ' [익명]' : ''} - ${selectedVideo.title}`,
        body: `${profile.full_name ?? ''} (${profile.employee_id ?? ''})${qAnonymous ? ' [공개 표기는 익명]' : ''}\n\n${text}`,
        is_read: false,
      }))
      if (notes.length) await (supabase as any).from('notifications').insert(notes)
      // Refresh list
      const { data } = await (supabase as any)
        .from('course_qa').select('id, user_id, question, answer, created_at, answered_at, profiles:profiles(full_name)')
        .eq('course_id', selectedVideo.id).order('created_at', { ascending: false })
      const isAdminUser = profile?.role === 'admin'
      setQaList((data ?? []).map((r: any) => {
        const rawQ = r.question ?? ''
        const isAnon = typeof rawQ === 'string' && rawQ.startsWith(ANON_MARK)
        const cleanQ = isAnon ? rawQ.slice(ANON_MARK.length) : rawQ
        const realName = r.profiles?.full_name ?? '익명'
        const displayName = isAnon ? (isAdminUser ? `[익명: ${realName}]` : '익명') : realName
        return {
          id: r.id, user_id: r.user_id, question: cleanQ, answer: r.answer, answered_at: r.answered_at, created_at: r.created_at,
          user_name: displayName,
        }
      }))
      alert('질문이 등록되었습니다. 관리자와 본인에게 알림이 전송되었어요.')
      setNewQText(''); setQAnonymous(false); setShowAskQ(false)
    } catch (e: any) {
      alert('등록 실패: ' + (e?.message ?? ''))
    } finally {
      setQAsking(false)
    }
  }

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

  // (prior selectVideo function removed — curriculum sidebar is timeline-based)

  // Auto-close prevention: popup-style detail (opens in new window from list)
  const catLabel = selectedVideo?.category ?? '내부통제'
  const difficulty = selectedVideo?.difficulty ?? '초급'
  const isMust = (selectedVideo?.tag ?? '필수').includes('필수')

  // Hooks that depend on videos — must be called BEFORE any early return
  // Timeline chapters: split the currently-playing video into equal time segments
  // with descriptive titles. Uses duration (seconds) when available.
  const timelineChapters = useMemo(() => {
    // Parse duration string ("15:08") → seconds, fallback to actual player duration
    const parseMMSS = (s: string | null | undefined): number => {
      if (!s) return 0
      const m = s.match(/(\d+):(\d+)/)
      if (!m) return 0
      return Number(m[1]) * 60 + Number(m[2])
    }
    const totalSec = duration > 0 ? duration : parseMMSS(selectedVideo?.duration)
    if (!selectedVideo || totalSec <= 0) return [] as Array<{ startSec: number; lengthSec: number; title: string; startLabel: string; lengthLabel: string }>

    // Split into ~5 chapters with generic titles extracted from video title
    const title = selectedVideo.title ?? ''
    const defaultTitles = [
      '도입 · 학습 목표',
      '핵심 개념 정리',
      '실무 적용 사례',
      '체크리스트 및 QnA',
      '마무리 · 이수 조건',
    ]
    const segCount = 5
    const segLen = totalSec / segCount
    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
    return Array.from({ length: segCount }, (_, i) => {
      const startSec = Math.floor(i * segLen)
      const lengthSec = Math.floor(segLen)
      return {
        startSec,
        lengthSec,
        title: defaultTitles[i] + (i === 0 && title ? ` - ${title.slice(0, 18)}` : ''),
        startLabel: fmt(startSec),
        lengthLabel: fmt(lengthSec),
      }
    })
  }, [selectedVideo, duration])

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

  // Progress stats left in for legacy references (removed from UI)

  return (
    <>
      {pageHeader}
      <div className="pg-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* LEFT: Video player + actions + Q&A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Player with playback-rate overlay on bottom-right */}
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', position: 'relative' }}>
              <div className="aspect-video" style={{ position: 'relative' }} id="yt-player-wrap">
                <div id="youtube-course-player" className="h-full w-full" />
                {playerError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', color: '#fff' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#F87171' }}>{playerError}</p>
                    <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>다른 강좌를 선택하거나 관리자에게 문의하세요</p>
                  </div>
                )}
                {/* Playback rate overlay — bottom-right of video */}
                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  display: 'flex', gap: 4,
                  padding: '6px 8px',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 10,
                  zIndex: 10,
                }}>
                  {PLAYBACK_RATES.map(rate => (
                    <button
                      key={rate}
                      onClick={() => handleRateChange(rate)}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontFamily: 'var(--f-mono)',
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        cursor: 'pointer',
                        background: playbackRate === rate ? '#3182F6' : 'transparent',
                        color: playbackRate === rate ? '#fff' : 'rgba(255,255,255,0.7)',
                        transition: 'all 0.15s',
                      }}
                      title={`${rate}x 배속`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
              {/* Progress bar — directly under video */}
              <div style={{ padding: '10px 14px', background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--f-mono)', marginBottom: 6, color: 'rgba(255,255,255,0.7)' }}>
                  <span>{watchedLabel} / {duration > 0 ? durationLabel : '로딩 중'}</span>
                  <span style={{ color: '#60A5FA', fontWeight: 700 }}>{progress}%</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: 3, background: '#3182F6', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
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
                <div>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>내 진도율</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#3182F6' }}>{progress}<span style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>%</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>수강기한</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{(selectedVideo as any)?.deadline ? new Date((selectedVideo as any).deadline).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) + '까지' : '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>진도율 순위</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{myRank ? `${myRank}/${totalLearners}` : '-'}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ fontSize: 11, color: 'var(--at-ink-mute)' }}>이수 시</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3182F6' }}>+30 P 이수 시</div>
                </div>
              </div>

              {/* Action buttons — no 자료받기 */}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={handlePlayPause} className="btn-compact primary" style={{ padding: '10px 18px' }}>
                  {playing ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  {playing ? '일시정지' : `이어서 시청 · ${watchedLabel}부터`}
                </button>
                {/* '퀴즈 응시' 버튼 제거 — 요청사항 반영 */}
                <button onClick={handleRestart} className="btn-compact" style={{ marginLeft: 'auto' }} title="기존 최대 진도율은 유지됩니다">
                  <RotateCcw size={13} /> 처음부터
                </button>
              </div>

            </div>

            {/* Q&A */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  <MessageSquare size={15} style={{ display: 'inline', marginRight: 6 }} />
                  수강생 질문 · {qaList.length}
                </h3>
                <button className="btn-compact" onClick={() => setShowAskQ(true)}>+ 질문하기</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {qaList.length === 0 ? (
                  <div className="at-card" style={{ padding: 22, textAlign: 'center', color: 'var(--at-ink-mute)', fontSize: 13 }}>
                    첫 번째 질문을 남겨보세요. 강사/관리자가 답변드립니다.
                  </div>
                ) : (
                  qaList.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setDetailQ(q)}
                      className="at-card"
                      style={{ padding: 16, textAlign: 'left', border: '1px solid var(--at-ink-hair)', cursor: 'pointer', background: '#fff', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3182F6' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--at-ink-hair)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EEF4FE', color: '#3182F6', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>
                          {(q.user_name ?? '?').charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{q.user_name}</div>
                          <div style={{ fontSize: 10, color: 'var(--at-ink-mute)' }}>{new Date(q.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        {q.answer ? (
                          <span style={{ padding: '2px 8px', background: '#10B981', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4 }}>답변완료</span>
                        ) : (
                          <span style={{ padding: '2px 8px', background: '#F59E0B', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 4 }}>답변대기</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--at-ink)', lineHeight: 1.55, marginLeft: 36, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.question}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Curriculum — timeline chapters of the currently-playing video */}
          <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
            <div className="at-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--at-ink-hair)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', letterSpacing: '0.12em' }}>CURRICULUM · 현재 강좌 타임라인</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{selectedVideo?.title?.slice(0, 28) ?? '커리큘럼'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: 'var(--at-ink-mute)' }}>진도율</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#3182F6' }}>{progress}%</div>
                </div>
              </div>

              <div style={{ maxHeight: 640, overflowY: 'auto' }}>
                {timelineChapters.map((seg, si) => {
                  const isActive = currentTime >= seg.startSec && currentTime < (seg.startSec + seg.lengthSec)
                  const isDone = currentTime >= (seg.startSec + seg.lengthSec)
                  return (
                    <button
                      key={si}
                      onClick={() => { if (playerRef.current?.seekTo) { playerRef.current.seekTo(seg.startSec, true); setCurrentTime(seg.startSec) } }}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        background: isActive ? '#EEF4FE' : '#fff',
                        border: 'none',
                        borderLeft: isActive ? '3px solid #3182F6' : '3px solid transparent',
                        borderBottom: '1px solid var(--at-ink-hair)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--at-ivory)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff' }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                      ) : (
                        <Circle size={16} style={{ color: isActive ? '#3182F6' : 'var(--at-ink-faint)', flexShrink: 0, marginTop: 2 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', fontFamily: 'var(--f-mono)' }}>
                          CH {String(si + 1).padStart(2, '0')} · {seg.startLabel}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: 'var(--at-ink)', lineHeight: 1.35 }}>
                          {seg.title}
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--at-ink-mute)', fontFamily: 'var(--f-mono)', flexShrink: 0, marginTop: 2 }}>
                        {seg.lengthLabel}
                      </div>
                    </button>
                  )
                })}
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

      {/* Ask a question popup */}
      {showAskQ && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setShowAskQ(false)}
          onKeyDown={e => { if (e.key === 'Escape') setShowAskQ(false) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>ASK</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>강사에게 질문하기</div>
              </div>
              <button onClick={() => setShowAskQ(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, fontSize: 16 }}>✕</button>
            </div>
            <textarea
              value={newQText}
              onChange={e => setNewQText(e.target.value)}
              placeholder="이 강의에 대해 궁금한 점을 자유롭게 적어주세요."
              rows={6}
              style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--at-ink-hair)', borderRadius: 10, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--at-ink-soft)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={qAnonymous}
                onChange={e => setQAnonymous(e.target.checked)}
              />
              익명으로 게시 (다른 수강생에게 이름이 표시되지 않습니다)
            </label>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--at-ink-mute)' }}>등록하면 관리자와 본인에게 알림이 전송됩니다.</div>
            <button
              onClick={submitQuestion}
              disabled={qAsking || !newQText.trim()}
              className="btn-compact primary"
              style={{ width: '100%', padding: '12px 18px', justifyContent: 'center', fontSize: 13, marginTop: 16, opacity: qAsking || !newQText.trim() ? 0.5 : 1 }}
            >
              {qAsking ? '등록 중...' : '질문 등록'}
            </button>
          </div>
        </div>
      )}

      {/* Question detail popup */}
      {detailQ && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 20 }}
          onClick={() => setDetailQ(null)}
          onKeyDown={e => { if (e.key === 'Escape') setDetailQ(null) }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', letterSpacing: '0.12em', fontFamily: 'var(--f-mono)' }}>QUESTION</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{detailQ.user_name}님의 질문</div>
              </div>
              <button onClick={() => setDetailQ(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: 16, background: 'var(--at-ivory)', borderRadius: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'var(--at-ink-mute)', marginBottom: 6 }}>
                {new Date(detailQ.created_at).toLocaleString('ko-KR')}
              </div>
              <p style={{ fontSize: 13, color: 'var(--at-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detailQ.question}</p>
            </div>

            {detailQ.answer ? (
              <div style={{ padding: 16, background: '#EEF4FE', border: '1px solid #DCE8FB', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ padding: '2px 8px', background: '#10B981', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 4 }}>답변</span>
                  {detailQ.answered_at && (
                    <span style={{ color: 'var(--at-ink-mute)', fontWeight: 400 }}>
                      {new Date(detailQ.answered_at).toLocaleString('ko-KR')}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--at-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detailQ.answer}</p>
              </div>
            ) : (
              <div style={{ padding: 16, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, color: '#92400E', fontSize: 12 }}>
                아직 답변이 등록되지 않았습니다. 강사 또는 관리자가 답변할 예정입니다.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
