import { lazy, Suspense, useState } from 'react'
import {
  Award,
  Bell,
  Bot,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  Image,
  Loader2,
  Megaphone,
  PlayCircle,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import type { Tab } from './adminShared'

// 모든 탭을 lazy-load — 기존에는 static import 로 1.1MB 번들. 이제 탭 클릭시에만 로드.
const UserUploadTab = lazy(() => import('./tabs/UserUploadTab'))
const RcmUploadTab = lazy(() => import('./tabs/RcmUploadTab'))
const PopulationUploadTab = lazy(() => import('./tabs/PopulationUploadTab'))
const UsersTab = lazy(() => import('./tabs/UsersTab'))
const ActivitiesTab = lazy(() => import('./tabs/ActivitiesTab'))
const FilesTab = lazy(() => import('./tabs/FilesTab'))
const NotificationsTab = lazy(() => import('./tabs/NotificationsTab'))
const VideosTab = lazy(() => import('./tabs/VideosTab'))
const WebtoonTab = lazy(() => import('./tabs/WebtoonTab'))
const SettingsTab = lazy(() => import('./tabs/SettingsTab'))
const LoginLogsTab = lazy(() => import('./tabs/LoginLogsTab'))
const QuizResultsTab = lazy(() => import('./tabs/QuizResultsTab'))
const NoticesTab = lazy(() => import('./tabs/NoticesTab'))
const PointsTab = lazy(() => import('./tabs/PointsTab'))
const ChatbotDocsTab = lazy(() => import('./tabs/ChatbotDocsTab'))

const TabFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80 }}>
    <Loader2 size={20} className="animate-spin text-brand-500" />
  </div>
)

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'upload-users', label: '사용자 초기 업로드', icon: Users },
  { key: 'upload-rcm', label: 'RCM 업로드', icon: FileSpreadsheet },
  { key: 'upload-population', label: '모집단 업로드', icon: Database },
  { key: 'users', label: '사용자 관리', icon: Users },
  { key: 'activities', label: '통제활동 관리', icon: Shield },
  { key: 'files', label: '증빙 다운로드', icon: Download },
  { key: 'notifications', label: '알림 발송', icon: Bell },
  { key: 'videos', label: '강좌 동영상', icon: PlayCircle },
  { key: 'webtoon', label: '웹툰 관리', icon: Image },
  { key: 'settings', label: '사이트 설정', icon: Settings },
  { key: 'login-logs', label: '로그인 이력', icon: ClipboardList },
  { key: 'quiz-results', label: '강좌/퀴즈 현황', icon: Award },
  { key: 'notices', label: '공지/매뉴얼', icon: Megaphone },
  { key: 'points', label: '포인트 관리', icon: Award },
  { key: 'chatbot-docs', label: 'AI 챗봇 문서', icon: Bot },
]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('upload-users')
  const [refreshKey, setRefreshKey] = useState(0)

  function refresh() {
    setRefreshKey(value => value + 1)
  }

  return (
    <>
      <div className="pg-head">
        <div className="pg-head-row">
          <div>
            <div className="eyebrow">관리자<span className="sep" />Administration Console</div>
            <h1>관리자. <span className="soft">포털 전체 세팅과 운영.</span></h1>
            <p className="lead">사용자 초기 업로드 → RCM 업로드 → 모집단 업로드 순서로 진행하세요. 로그인 ID와 초기 비밀번호는 모두 사번으로 맞춰집니다.</p>
          </div>
          <div className="actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, fontSize: 12, color: '#92400E' }}>
              <Shield size={14} /> 관리자 권한
            </div>
          </div>
        </div>
      </div>

      <div className="pg-body">
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: 6, background: 'var(--at-white)', borderRadius: 14, border: '1px solid var(--at-ink-hair)', marginBottom: 20 }}>
          {TABS.map(item => {
            const Icon = item.icon
            const active = tab === item.key
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: 10,
                  fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: active ? 'var(--at-blue)' : 'transparent',
                  color: active ? '#fff' : 'var(--at-ink-mute)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={13} strokeWidth={1.8} />
                {item.label}
              </button>
            )
          })}
        </div>

        <Suspense fallback={<TabFallback />}>
          {tab === 'upload-users' && <UserUploadTab onDone={refresh} />}
          {tab === 'upload-rcm' && <RcmUploadTab onDone={refresh} />}
          {tab === 'upload-population' && <PopulationUploadTab onDone={refresh} />}
          {tab === 'users' && <UsersTab refreshKey={refreshKey} />}
          {tab === 'activities' && <ActivitiesTab refreshKey={refreshKey} />}
          {tab === 'files' && <FilesTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'videos' && <VideosTab />}
          {tab === 'webtoon' && <WebtoonTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'login-logs' && <LoginLogsTab />}
          {tab === 'quiz-results' && <QuizResultsTab />}
          {tab === 'notices' && <NoticesTab />}
          {tab === 'points' && <PointsTab />}
          {tab === 'chatbot-docs' && <ChatbotDocsTab />}
        </Suspense>
      </div>
    </>
  )
}
