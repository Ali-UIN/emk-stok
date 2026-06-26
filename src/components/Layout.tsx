import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import TopBar from './TopBar'
import PWAInstallBanner from './PWAInstallBanner'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <TopBar />
        <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  )
}
