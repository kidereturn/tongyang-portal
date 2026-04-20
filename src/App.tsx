import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import NetworkGuard from './components/NetworkGuard'
import IntroGate from './components/IntroGate'
// LoginPage is NOT lazy so it's ready the instant the intro video finishes.
import LoginPage from './pages/auth/LoginPage'

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

const DashboardPage   = lazyRetry(() => import('./pages/dashboard/DashboardPage'))
const EvidenceListPage = lazyRetry(() => import('./pages/evidence/EvidenceListPage'))
const InboxPage       = lazyRetry(() => import('./pages/inbox/InboxPage'))
const AdminPage       = lazyRetry(() => import('./pages/admin/AdminPage'))
const CoursesPage       = lazyRetry(() => import('./pages/extra/CoursesPage'))
const CourseDetailPage  = lazyRetry(() => import('./pages/extra/CourseDetailPage'))
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

// Silent loader — plain dark background, no branding, no lion.
// Used while auth state is being checked or a lazy chunk is loading.
function SilentLoader() {
  return <div className="min-h-screen bg-black" />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <SilentLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <SilentLoader />
  if (!profile || profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <SilentLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <NetworkGuard />
      <ErrorBoundary>
        <Suspense fallback={<SilentLoader />}>
          <Routes>
            <Route
              path="/login"
              element={
                // IntroGate is OUTSIDE PublicRoute so the video starts immediately
                // without waiting for auth check. PublicRoute runs after the video ends.
                <IntroGate>
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                </IntroGate>
              }
            />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"  element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="evidence"   element={<ErrorBoundary><EvidenceListPage /></ErrorBoundary>} />
              <Route path="inbox"      element={<ErrorBoundary><InboxPage /></ErrorBoundary>} />
              <Route path="courses"     element={<ErrorBoundary><CoursesPage /></ErrorBoundary>} />
              <Route path="courses/:id" element={<ErrorBoundary><CourseDetailPage /></ErrorBoundary>} />
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
