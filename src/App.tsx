import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import { Loader2 } from 'lucide-react'
import Layout from './components/layout/Layout'

const LoginPage       = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage   = lazy(() => import('./pages/dashboard/DashboardPage'))
const EvidenceListPage = lazy(() => import('./pages/evidence/EvidenceListPage'))
const InboxPage       = lazy(() => import('./pages/inbox/InboxPage'))
const AdminPage       = lazy(() => import('./pages/admin/AdminPage'))
const CoursesPage     = lazy(() => import('./pages/extra/CoursesPage'))
const KpiPage         = lazy(() => import('./pages/extra/KpiPage'))
const NewsPage        = lazy(() => import('./pages/extra/NewsPage'))
const MapPage         = lazy(() => import('./pages/extra/MapPage'))
const ChatbotPage     = lazy(() => import('./pages/extra/ChatbotPage'))
const LearningPage    = lazy(() => import('./pages/extra/LearningPage'))
const BingoPage       = lazy(() => import('./pages/extra/BingoPage'))
const WebtoonPage     = lazy(() => import('./pages/extra/WebtoonPage'))

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
          <span className="text-white font-black text-xl">동</span>
        </div>
        <Loader2 size={22} className="text-brand-500 animate-spin" />
        <p className="text-gray-400 text-sm">로딩 중...</p>
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
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />
            <Route path="evidence"   element={<EvidenceListPage />} />
            <Route path="inbox"      element={<InboxPage />} />
            <Route path="courses"    element={<CoursesPage />} />
            <Route path="learning"   element={<LearningPage />} />
            <Route path="map"        element={<MapPage />} />
            <Route path="news"       element={<NewsPage />} />
            <Route path="kpi"        element={<KpiPage />} />
            <Route path="chatbot"    element={<ChatbotPage />} />
            <Route path="bingo"      element={<BingoPage />} />
            <Route path="webtoon"    element={<WebtoonPage />} />
            <Route path="admin/*"    element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
