import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import TopNav from './TopNav'
import MobileTabBar from './MobileTabBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
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
    </div>
  )
}
