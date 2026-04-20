import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import TopNav from './TopNav'
import MobileTabBar from './MobileTabBar'

function ScrollToTopButton() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      style={{
        position: 'fixed', bottom: 96, right: 24, zIndex: 50,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: 9999, background: '#3182F6', color: '#fff',
        padding: '10px 14px', fontSize: 12, fontWeight: 700,
        boxShadow: '0 12px 24px -8px rgba(49,130,246,0.45)',
        border: 'none', cursor: 'pointer',
      }}
      title="처음으로"
      className="lg:!bottom-8"
    >
      <ArrowUp size={14} />
      처음으로
    </button>
  )
}

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: '#F2F4F6' }}>
      <TopNav />
      <main style={{ paddingTop: 0, paddingBottom: 80 }} className="lg:!pb-0">
        <Outlet />
      </main>
      <MobileTabBar />
      <ScrollToTopButton />
    </div>
  )
}
