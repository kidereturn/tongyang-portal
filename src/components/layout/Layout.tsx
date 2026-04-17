import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import Footer from './Footer'
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
      className="fixed bottom-24 lg:bottom-8 right-4 z-50 flex items-center gap-1.5 rounded-full bg-brand-800 px-3 py-2 text-[11px] font-bold text-white shadow-lg hover:bg-brand-900 transition-all"
      title="처음으로"
    >
      <ArrowUp size={14} />
      처음으로
    </button>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-warm-50">
      <TopNav />
      <main className="pt-14 sm:pt-16 pb-20 lg:pb-0">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
      <MobileTabBar />
      <ScrollToTopButton />
    </div>
  )
}
