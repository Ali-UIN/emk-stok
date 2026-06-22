import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { DashboardStats } from '../types'
import { getStartOfDay, getEndOfDay } from '../lib/utils'

export function useStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStockItems: 0,
    lowStockCount: 0,
    todayMovements: 0,
    todayIn: 0,
    todayOut: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date()
      const start = getStartOfDay(today)
      const end = getEndOfDay(today)

      const [productsRes, stockRes, movementsRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        // Fetch quantity + threshold to compute low-stock on client (Supabase cannot compare two columns via .filter)
        supabase.from('stock').select('id, quantity, low_stock_threshold'),
        supabase
          .from('stock_movements')
          .select('type, quantity')
          .gte('created_at', start)
          .lte('created_at', end),
      ])

      if (productsRes.error) throw productsRes.error
      if (stockRes.error) throw stockRes.error
      if (movementsRes.error) throw movementsRes.error

      const allStock = stockRes.data ?? []
      const lowStockCount = allStock.filter(
        (s) => s.quantity <= s.low_stock_threshold
      ).length

      const movements = movementsRes.data ?? []
      const todayIn = movements
        .filter((m) => m.type === 'in')
        .reduce((sum, m) => sum + m.quantity, 0)
      const todayOut = movements
        .filter((m) => m.type === 'out')
        .reduce((sum, m) => sum + m.quantity, 0)

      setStats({
        totalProducts: productsRes.count ?? 0,
        totalStockItems: allStock.length,
        lowStockCount,
        todayMovements: movements.length,
        todayIn,
        todayOut,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Gagal memuat statistik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error, refetch: fetchStats }
}
