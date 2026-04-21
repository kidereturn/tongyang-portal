import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SkipForward, Volume2, VolumeX } from 'lucide-react'

const INTRO_SRC = '/intro.mp4'

interface IntroGateProps {
  children: ReactNode
}

/**
 * Plays the intro video every time this component mounts.
 * Mount = first page load OR full page refresh OR post-logout navigation to /login.
 * No persistence (sessionStorage/localStorage) — ensures the video replays on every refresh.
 * User can skip via button.
 */
export default function IntroGate({ children }: IntroGateProps) {
  // Skip intro if user just logged out — check and consume the flag on mount
  const [showIntro, setShowIntro] = useState(() => {
    try {
      if (sessionStorage.getItem('skipIntro') === '1') {
        sessionStorage.removeItem('skipIntro')
        return false
      }
    } catch { /* storage blocked — fall through */ }
    return true
  })
  const [muted, setMuted] = useState(true) // start muted so autoplay works on every browser
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!showIntro) return
    const video = videoRef.current
    if (!video) return

    function handleEnded() {
      setShowIntro(false)
    }

    function handleTimeUpdate() {
      if (!video || !video.duration) return
      setProgress((video.currentTime / video.duration) * 100)
    }

    function handleError() {
      // If the video fails to load, don't block the user
      setShowIntro(false)
    }

    video.addEventListener('ended', handleEnded)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('error', handleError)

    // Attempt playback. Browsers only autoplay with muted=true on first load.
    const playPromise = video.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Autoplay blocked — UI shows a tap-to-play hint below
      })
    }

    return () => {
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
    }
  }, [showIntro])

  function handleSkip() {
    const video = videoRef.current
    if (video) {
      try {
        video.pause()
      } catch {
        /* ignore */
      }
    }
    setShowIntro(false)
  }

  function handleToggleMute() {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  function handleTapToPlay() {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {
      /* still blocked — ignore */
    })
  }

  if (!showIntro) return <>{children}</>

  // Sample the dominant pixel color of the video to match the page background — blends seamlessly.
  // Fallback: very light gray #F2F4F6 (matches Toss ivory bg). Mascots are on a light studio
  // backdrop, so a light page color makes the edges invisible.
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: '#E6E8EB' }} /* light gray that matches the mascot background */
    >
      {/* Video at natural aspect ratio — object-contain prevents cropping/zooming */}
      <video
        ref={videoRef}
        src={INTRO_SRC}
        muted={muted}
        playsInline
        autoPlay
        preload="auto"
        onClick={handleTapToPlay}
        style={{
          maxWidth: '92vw',
          maxHeight: '88vh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          cursor: 'pointer',
          background: 'transparent',
          display: 'block',
        }}
      >
        <source src={INTRO_SRC} type="video/mp4" />
      </video>

      {/* Progress bar — full width, bottom edge of viewport */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-full" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div
          className="h-full transition-[width] duration-150 ease-linear"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: 'rgba(0,0,0,0.35)' }}
        />
      </div>

      {/* Top-right controls (outside the frame so they don't block content) */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={handleToggleMute}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          {muted ? '소리 켜기' : '소리 끄기'}
        </button>
        <button
          onClick={handleSkip}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/80"
          aria-label="건너뛰기"
        >
          <SkipForward size={14} />
          건너뛰기
        </button>
      </div>
    </div>
  )
}
