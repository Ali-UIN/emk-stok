import {
  Package,
  Layers,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'
import { useStats } from '../hooks/useStats'
import { useEffect, useState } from 'react'

interface RecentMovement {
  id: string
  type: 'in' | 'out'
  quantity: number
  created_at: string
  product: { name: string; category: string } | null
  stock: { size: string; color: string } | null
}

export default function DashboardPage() {
  const { stats, loading, refetch } = useStats()
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([])
  const [recentLoading, setRecentLoading] = useState(true)

  const fetchRecent = async () => {
    setRecentLoading(true)
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id, type, quantity, created_at,
          product:products(name, category),
          stock:stock(size, color)
        `)
        .order('created_at', { ascending: false })
        .limit(8)
      if (error) throw error
      setRecentMovements((data ?? []) as unknown as RecentMovement[])
    } catch (err) {
      console.error('Error fetching recent movements:', err)
    } finally {
      setRecentLoading(false)
    }
  }

  useEffect(() => {
    fetchRecent()
  }, [])

  const handleRefresh = () => {
    refetch()
    fetchRecent()
  }

  const statCards = [
    {
      label: 'Total Produk',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-gold',
      bg: 'bg-gold/10',
    },
    {
      label: 'Item Stok',
      value: stats.totalStockItems,
      icon: Layers,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'Stok Menipis',
      value: stats.lowStockCount,
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
    },
    {
      label: 'Pergerakan Hari Ini',
      value: stats.todayMovements,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-bold text-xl">Overview</h2>
          <p className="text-text-muted text-sm mt-0.5">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-text-muted text-xs mb-1">{label}</p>
            <p className="text-text-primary font-bold text-2xl">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-surface-2 rounded animate-pulse" />
              ) : (
                value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Today Summary */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs">Masuk Hari Ini</p>
            <p className="text-green-400 font-bold text-xl">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-surface-2 rounded animate-pulse" />
              ) : (
                `+${stats.todayIn}`
              )}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <ArrowDownRight size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs">Keluar Hari Ini</p>
            <p className="text-red-400 font-bold text-xl">
              {loading ? (
                <span className="inline-block w-8 h-6 bg-surface-2 rounded animate-pulse" />
              ) : (
                `-${stats.todayOut}`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-text-primary font-semibold">Pergerakan Terbaru</h3>
          <TrendingDown size={16} className="text-text-muted" />
        </div>

        {recentLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-surface-2 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : recentMovements.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            Belum ada pergerakan stok
          </div>
        ) : (
          <div className="space-y-2">
            {recentMovements.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 hover:bg-border transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    m.type === 'in' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  {m.type === 'in' ? (
                    <ArrowUpRight size={14} className="text-green-400" />
                  ) : (
                    <ArrowDownRight size={14} className="text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">
                    {m.product?.name ?? 'Produk'}
                  </p>
                  <p className="text-text-muted text-xs">
                    {m.stock?.size ?? '—'} · {m.stock?.color ?? '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold ${
                      m.type === 'in' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {m.type === 'in' ? '+' : '-'}
                    {m.quantity}
                  </p>
                  <p className="text-text-muted text-xs">{formatDateTime(m.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
