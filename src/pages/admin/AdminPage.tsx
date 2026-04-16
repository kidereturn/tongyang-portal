import { useState } from 'react'
import {
  Award,
  Bell,
  Bot,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  Image,
  Megaphone,
  PlayCircle,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import type { Tab } from './adminShared'

import UserUploadTab from './tabs/UserUploadTab'
import RcmUploadTab from './tabs/RcmUploadTab'
import PopulationUploadTab from './tabs/PopulationUploadTab'
import UsersTab from './tabs/UsersTab'
import ActivitiesTab from './tabs/ActivitiesTab'
import FilesTab from './tabs/FilesTab'
import NotificationsTab from './tabs/NotificationsTab'
import VideosTab from './tabs/VideosTab'
import WebtoonTab from './tabs/WebtoonTab'
import SettingsTab from './tabs/SettingsTab'
import LoginLogsTab from './tabs/LoginLogsTab'
import QuizResultsTab from './tabs/QuizResultsTab'
import NoticesTab from './tabs/NoticesTab'
import PointsTab from './tabs/PointsTab'
import ChatbotDocsTab from './tabs/ChatbotDocsTab'

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
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-brand-900">
          <Shield size={22} className="text-purple-600" />
          관리자
        </h1>
        <p className="mt-0.5 text-sm text-warm-500">
          사용자 초기 세팅, RCM, 모집단 업로드를 여기서 관리합니다.
        </p>
      </div>

      <div className="rounded-lg border border-orange-100 bg-orange-50/70 p-4">
        <p className="text-sm font-semibold text-orange-900">현재 권장 순서</p>
        <p className="mt-1 text-sm text-orange-800">
          1. 사용자 초기 업로드 2. RCM 업로드 3. 모집단 업로드 순서로 진행하면 됩니다.
          로그인 ID와 초기 비밀번호는 모두 사번으로 맞춰집니다.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-warm-100 p-1.5">
        {TABS.map(item => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all',
              tab === item.key ? 'bg-white text-brand-900 shadow-sm' : 'text-warm-500 hover:text-brand-700'
            )}
          >
            <item.icon size={13} />
            {item.label}
          </button>
        ))}
      </div>

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
    </div>
  )
}
