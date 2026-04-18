import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthProvider.tsx'
import { ToastProvider } from './components/Toast.tsx'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ToastProvider>
)
