import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, PauseCircle, PlayCircle, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { COURSE_CATALOG } from '../../data/courseCatalog'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

type LearningResponse = {
  ok: boolean
  me: {
    courses?: Record<string, {
      watchedSeconds: number
      durationSeconds: number
      progressPercent: number
      status: 'not_started' | 'in_progress' | 'completed'
    }>
  } | null
}

const COURSE = COURSE_CATALOG[0]
const PLAYBACK_RATES = [1, 1.25, 1.5, 2]

export default function CoursesPage() {
  const playerRef = useRef<any>(null)
  const watchLimitRef = useRef(0)
  const syncAtRef = useRef(0)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [progress, setProgress] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started')

  const watchedLabel = useMemo(() => {
    const minutes = Math.floor(currentTime / 60)
    const seconds = Math.floor(currentTime % 60)
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [currentTime])

  const durationLabel = useMemo(() => {
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [duration])

  useEffect(() => {
    let intervalId: number | undefined

    async function loadProgress() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/learning-progress', {
        headers: {
          authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      })

      const payload = (await response.json()) as LearningResponse
      const record = payload.me?.courses?.[COURSE.id]
      if (record) {
        watchLimitRef.current = record.watchedSeconds
        setCurrentTime(record.watchedSeconds)
        setProgress(record.progressPercent)
        setStatus(record.status)
      }
    }

    function createPlayer() {
      if (!window.YT?.Player || playerRef.current) return

      playerRef.current = new window.YT.Player('youtube-course-player', {
        videoId: COURSE.youtubeId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setReady(true)
            const playerDuration = Number(playerRef.current.getDuration?.() ?? 0)
            setDuration(playerDuration)
            if (watchLimitRef.current > 0) {
              playerRef.current.seekTo(watchLimitRef.current, true)
            }
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === 1)
          },
        },
      })
    }

    async function boot() {
      await loadProgress()

      if (!window.YT?.Player) {
        const script = document.createElement('script')
        script.src = 'https://www.youtube.com/iframe_api'
        document.body.appendChild(script)
        window.onYouTubeIframeAPIReady = createPlayer
      } else {
        createPlayer()
      }

      intervalId = window.setInterval(() => {
        if (!playerRef.current || !ready) return

        const now = Number(playerRef.current.getCurrentTime?.() ?? 0)
        const playerDuration = Number(playerRef.current.getDuration?.() ?? 0)
        setDuration(playerDuration)

        if (now > watchLimitRef.current + 3) {
          playerRef.current.seekTo(watchLimitRef.current, true)
          return
        }

        watchLimitRef.current = Math.max(watchLimitRef.current, now)
        setCurrentTime(watchLimitRef.current)

        const nextProgress = playerDuration > 0 ? Math.min(100, Math.round((watchLimitRef.current / playerDuration) * 100)) : 0
        setProgress(nextProgress)
        setStatus(nextProgress >= 99 ? 'completed' : nextProgress > 0 ? 'in_progress' : 'not_started')

        const nowMs = Date.now()
        if (nowMs - syncAtRef.current < 5000) return
        syncAtRef.current = nowMs

        void syncProgress(watchLimitRef.current, playerDuration, nextProgress)
      }, 1000)
    }

    void boot()
    return () => {
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [ready])

  async function syncProgress(watchedSeconds: number, durationSeconds: number, progressPercent: number) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    await fetch('/api/learning-progress', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({
        courseId: COURSE.id,
        courseTitle: COURSE.title,
        watchedSeconds,
        durationSeconds,
        progressPercent,
      }),
    })
  }

  function handlePlayPause() {
    if (!playerRef.current) return
    if (playing) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  function handleRestart() {
    if (!playerRef.current) return
    playerRef.current.seekTo(0, true)
    watchLimitRef.current = 0
    setCurrentTime(0)
    setProgress(0)
    setStatus('not_started')
    void syncProgress(0, duration, 0)
  }

  function handleRateChange(rate: number) {
    if (!playerRef.current) return
    playerRef.current.setPlaybackRate(rate)
    setPlaybackRate(rate)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-6 py-8 text-white shadow-2xl">
        <p className="text-xs font-semibold tracking-[0.24em] text-slate-400">COURSE PLAYER</p>
        <h1 className="mt-2 flex items-center gap-2 text-3xl font-black">
          <BookOpen size={28} className="text-brand-300" />
          내 강좌
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          유튜브 강의를 같은 화면에서 재생하고, 진도율을 사번 기준으로 저장합니다. 배속은 2배속까지 허용하고
          임의 건너뛰기는 막아 두었습니다.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-xl font-black text-slate-900">{COURSE.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{COURSE.description}</p>
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
                <RotateCcw size={16} />
                처음부터
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

        <section className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-sm font-bold text-slate-900">현재 상태</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">수강 상태</p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {status === 'completed' ? '이수완료' : status === 'in_progress' ? '수강중' : '미시작'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">재생 제한</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  배속은 최대 2배속까지 허용하고, 이미 본 구간보다 앞으로 점프하면 자동으로 이전 허용 지점으로 되돌립니다.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400">강의 자료</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">https://youtu.be/{COURSE.youtubeId}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
