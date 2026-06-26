import { useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Manajemen Produk',
  '/stock': 'Manajemen Stok',
  '/movements': 'Pergerakan Stok',
  '/reports': 'Laporan',
}

export default function TopBar() {
  const location = useLocation()
  const { user, role, signOut } = useAuth()
  const title = pageTitles[location.pathname] ?? 'emkarin.id'

  return (
    <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-border px-4 md:px-6 py-3 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-text-primary font-semibold text-base md:text-lg">{title}</h1>
        <p className="text-text-muted text-xs hidden sm:block">emkarin.id Stock Management</p>
      </div>

      {/* Desktop user info */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="text-right">
          <p className="text-text-primary text-xs font-medium">{user?.email}</p>
          <span className="badge-gold capitalize text-[10px]">{role}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Keluar"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Mobile: badge role + logout button */}
      <div className="lg:hidden flex items-center gap-2">
        <span className="badge-gold capitalize text-xs">{role}</span>
        <button
          onClick={signOut}
          className="p-2 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Keluar"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
