import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { ensureFreshBundle } from './lib/cacheReset'

// 새 번들 배포 시 브라우저 캐시 자동 무효화 (Cache API / SW / sessionStorage)
// 빌드 ID 가 변경되면 하드 리로드하여 최신 번들 강제 다운로드
ensureFreshBundle().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  )
})
