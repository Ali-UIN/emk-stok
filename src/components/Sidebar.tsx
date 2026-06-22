import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowLeftRight,
  FileBarChart,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Produk' },
  { to: '/stock', icon: Layers, label: 'Stok' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Pergerakan' },
  { to: '/reports', icon: FileBarChart, label: 'Laporan' },
]

export default function Sidebar() {
  const { user, role, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border z-30">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center border border-gold/30">
          <span className="text-gold font-bold text-sm">em</span>
        </div>
        <div>
          <p className="text-text-primary font-semibold text-sm leading-none">emkarin.id</p>
          <p className="text-text-muted text-xs mt-0.5">Stock Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-gold/15 text-gold'
                  : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
            <span className="text-gold text-xs font-bold uppercase">
              {user?.email?.[0] ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-text-primary text-xs font-medium truncate">{user?.email}</p>
            <span className="badge-gold text-[10px] mt-0.5 capitalize">{role}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-text-secondary hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
