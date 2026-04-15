import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Retry wrapper: on chunk-load failure, retry up to 2 times then hard reload
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  importFn: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
  return lazy(async () => {
    const reloadKey = `chunk_reload_${importFn.toString().slice(0, 60)}`
    try {
      return await importFn()
    } catch (err) {
      // One retry
      try {
        return await importFn()
      } catch {
        // If already reloaded for this chunk, throw to ErrorBoundary
        if (sessionStorage.getItem(reloadKey)) {
          sessionStorage.removeItem(reloadKey)
          throw err
        }
        sessionStorage.setItem(reloadKey, '1')
        window.location.reload()
        // Return a never-resolving promise so React doesn't render before reload
        return new Promise(() => {})
      }
    }
  })
}

const LoginPage       = lazyRetry(() => import('./pages/auth/LoginPage'))
const DashboardPage   = lazyRetry(() => import('./pages/dashboard/DashboardPage'))
const EvidenceListPage = lazyRetry(() => import('./pages/evidence/EvidenceListPage'))
const InboxPage       = lazyRetry(() => import('./pages/inbox/InboxPage'))
const AdminPage       = lazyRetry(() => import('./pages/admin/AdminPage'))
const CoursesPage     = lazyRetry(() => import('./pages/extra/CoursesPage'))
const KpiPage         = lazyRetry(() => import('./pages/extra/KpiPage'))
const NewsPage        = lazyRetry(() => import('./pages/extra/NewsPage'))
const MapPage         = lazyRetry(() => import('./pages/extra/MapPage'))
const ChatbotPage     = lazyRetry(() => import('./pages/extra/ChatbotPage'))
const LearningPage    = lazyRetry(() => import('./pages/extra/LearningPage'))
const BingoPage       = lazyRetry(() => import('./pages/extra/BingoPage'))
const WebtoonPage     = lazyRetry(() => import('./pages/extra/WebtoonPage'))
const ProfilePage     = lazyRetry(() => import('./pages/profile/ProfilePage'))
const TellMePage      = lazyRetry(() => import('./pages/extra/TellMePage'))
const NoticeDetailPage = lazyRetry(() => import('./pages/notices/NoticeDetailPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a1206] to-[#0a0a0a] flex items-center justify-center">
      <style>{`
        @keyframes shieldGlow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(218,165,32,0.3)); }
          50% { filter: drop-shadow(0 0 24px rgba(218,165,32,0.7)); }
        }
        @keyframes roarPulse {
          0% { transform: scale(1); opacity: 0.9; }
          15% { transform: scale(1.08); opacity: 1; }
          30% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes ribbonShine {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shield-container { animation: shieldGlow 2s ease-in-out infinite; }
        .lion-icon { animation: roarPulse 2.5s ease-in-out infinite; }
        .ribbon-shine {
          background: linear-gradient(90deg, #b8860b 0%, #ffd700 40%, #fff8dc 50%, #ffd700 60%, #b8860b 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: ribbonShine 3s linear infinite;
        }
      `}</style>
      <div className="flex flex-col items-center gap-5">
        {/* Shield shape with lion */}
        <div className="shield-container">
          <div className="relative flex h-28 w-24 items-center justify-center">
            {/* Shield background */}
            <svg viewBox="0 0 100 120" className="absolute inset-0 h-full w-full">
              <path d="M50 2 L95 20 L95 70 Q95 100 50 118 Q5 100 5 70 L5 20 Z"
                fill="url(#shieldGrad)" stroke="#daa520" strokeWidth="2" />
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1a1a2e" />
                  <stop offset="50%" stopColor="#16213e" />
                  <stop offset="100%" stopColor="#0f0f23" />
                </linearGradient>
              </defs>
            </svg>
            {/* Lion face */}
            <div className="lion-icon relative z-10 text-4xl select-none" role="img" aria-label="lion">
              🦁
            </div>
          </div>
        </div>

        {/* Company name with golden ribbon effect */}
        <div className="text-center">
          <p className="ribbon-shine text-xl font-black tracking-wider">(주)동양</p>
          <p className="mt-1 text-[11px] font-semibold tracking-[0.3em] text-amber-600/60">
            TONGYANG CORPORATION
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="text-amber-500/70 animate-spin" />
          <p className="text-amber-600/50 text-xs font-medium tracking-wider">LOADING</p>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!profile || profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"  element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="evidence"   element={<ErrorBoundary><EvidenceListPage /></ErrorBoundary>} />
              <Route path="inbox"      element={<ErrorBoundary><InboxPage /></ErrorBoundary>} />
              <Route path="courses"    element={<ErrorBoundary><CoursesPage /></ErrorBoundary>} />
              <Route path="learning"   element={<ErrorBoundary><LearningPage /></ErrorBoundary>} />
              <Route path="map"        element={<ErrorBoundary><MapPage /></ErrorBoundary>} />
              <Route path="news"       element={<ErrorBoundary><NewsPage /></ErrorBoundary>} />
              <Route path="kpi"        element={<ErrorBoundary><KpiPage /></ErrorBoundary>} />
              <Route path="chatbot"    element={<ErrorBoundary><ChatbotPage /></ErrorBoundary>} />
              <Route path="bingo"      element={<ErrorBoundary><BingoPage /></ErrorBoundary>} />
              <Route path="webtoon"    element={<ErrorBoundary><WebtoonPage /></ErrorBoundary>} />
              <Route path="tellme"     element={<ErrorBoundary><TellMePage /></ErrorBoundary>} />
              <Route path="notice/:id" element={<ErrorBoundary><NoticeDetailPage /></ErrorBoundary>} />
              <Route path="profile"    element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
              <Route path="admin/*"    element={<AdminRoute><ErrorBoundary><AdminPage /></ErrorBoundary></AdminRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
