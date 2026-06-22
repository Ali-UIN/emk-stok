import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowLeftRight,
  FileBarChart,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Produk' },
  { to: '/stock', icon: Layers, label: 'Stok' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Gerak' },
  { to: '/reports', icon: FileBarChart, label: 'Laporan' },
]

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-0 flex-1 transition-colors ${
                isActive ? 'text-gold' : 'text-text-muted'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
