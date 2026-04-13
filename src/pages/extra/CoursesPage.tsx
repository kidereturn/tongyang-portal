import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, PauseCircle, PlayCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2]

export default function CoursesPage() {
  const { profile } = useAuth()
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
        if (list.length > 0) setSelectedVideo(list[0])
      } catch (err) {
        console.error('[CoursesPage] fetch error:', err)
        setLoadError('강좌를 불러오는 중 오류가 발생했습니다. 새로고침해 주세요.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // YouTube player setup
  useEffect(() => {
    if (!selectedVideo?.youtube_id) return

    let intervalId: number | undefined

    function createPlayer() {
      if (!window.YT?.Player) return
      // Destroy existing player if any
      if (playerRef.current?.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }

      playerRef.current = new window.YT.Player('youtube-course-player', {
        videoId: selectedVideo!.youtube_id,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          cc_load_policy: 1, // auto-show subtitles
        },
        events: {
          onReady: () => {
            setReady(true)
            const d = Number(playerRef.current.getDuration?.() ?? 0)
            setDuration(d)
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === 1)
          },
        },
      })
    }

    // Reset state
    watchLimitRef.current = 0
    setReady(false)
    setPlaying(false)
    setDuration(0)
    setCurrentTime(0)
    setProgress(0)
    setPlaybackRate(1)

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

  // Save progress to learning_progress table every 10 seconds
  useEffect(() => {
    if (!profile?.id || !selectedVideo?.id) return

    const saveInterval = window.setInterval(async () => {
      if (watchLimitRef.current <= 0) return
      const d = duration
      const pct = d > 0 ? Math.min(100, Math.round((watchLimitRef.current / d) * 100)) : 0
      const status = pct >= 95 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'

      try {
        await (supabase as any).from('learning_progress').upsert({
          user_id: profile.id,
          course_id: selectedVideo.id,
          watched_seconds: Math.round(watchLimitRef.current),
          duration_seconds: Math.round(d),
          progress_percent: pct,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' })
      } catch {
        // silent — don't interrupt playback
      }
    }, 10000)

    return () => clearInterval(saveInterval)
  }, [profile?.id, selectedVideo?.id, duration])

  function selectVideo(v: VideoRow) {
    setSelectedVideo(v)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
          <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">COURSE PLAYER</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
            <BookOpen size={28} className="text-brand-300" />내 강좌
          </h1>
        </div>
        <div className="text-center text-sm text-gray-400 py-20">
          {loadError ?? '강좌를 불러오는 중...'}
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
          <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">COURSE PLAYER</p>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
            <BookOpen size={28} className="text-brand-300" />내 강좌
          </h1>
        </div>
        <div className="text-center text-sm text-gray-400 py-20">등록된 강좌가 없습니다. 관리자가 동영상을 추가하면 여기에 표시됩니다.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">COURSE PLAYER</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <BookOpen size={28} className="text-brand-300" />내 강좌
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          강의 동영상을 재생하고 학습 진도를 관리합니다. 배속은 2배속까지, 건너뛰기는 제한됩니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Player */}
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-black text-slate-900">{selectedVideo?.title}</h2>
            {selectedVideo?.description && (
              <p className="mt-2 text-sm leading-6 text-slate-500">{selectedVideo.description}</p>
            )}
          </div>

          <div className="aspect-video bg-black">
            <div id="youtube-course-player" className="h-full w-full" />
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handlePlayPause} className="btn-primary py-2">
                {playing ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                {playing ? '일시정지' : '재생'}
              </button>
              <button onClick={handleRestart} className="btn-secondary py-2">
                <RotateCcw size={16} />처음부터
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {PLAYBACK_RATES.map(rate => (
                  <button
                    key={rate}
                    onClick={() => handleRateChange(rate)}
                    className={clsx(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      playbackRate === rate
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-100'
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">
                  {watchedLabel} / {duration > 0 ? durationLabel : '로딩 중'}
                </span>
                <span className="font-black text-brand-700">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* Video list */}
        <section className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3">
              <p className="text-sm font-bold text-slate-900">강좌 목록 ({videos.length}개) — 최신순</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {videos.map(v => (
                <button
                  key={v.id}
                  onClick={() => selectVideo(v)}
                  className={clsx(
                    'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
                    selectedVideo?.id === v.id && 'bg-brand-50 border-l-4 border-brand-500'
                  )}
                >
                  <img
                    src={v.thumbnail_url ?? `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                    alt={v.title}
                    className="h-12 w-20 shrink-0 rounded-lg object-cover bg-gray-200"
                    onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={clsx('text-sm font-bold truncate', selectedVideo?.id === v.id ? 'text-brand-700' : 'text-slate-900')}>
                      {v.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(v.created_at).toLocaleDateString('ko-KR')}
                      {selectedVideo?.id === v.id && <span className="ml-2 text-brand-600 font-semibold">▶ 재생 중</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-bold text-slate-900">안내</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">재생 제한</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  배속은 최대 2배속까지 허용, 임의 건너뛰기 방지
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">자막</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  YouTube에서 자막이 설정된 영상은 자동으로 표시됩니다
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
