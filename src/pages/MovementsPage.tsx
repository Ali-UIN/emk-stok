import { useState, useEffect, useCallback } from 'react'
import { Search, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/utils'

// Baris dari view stock_movements_detailed (sudah di-flatten di server)
interface MovementRow {
  id: string
  product_id: string
  stock_id: string
  type: 'in' | 'out'
  quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
  product: { name: string; category: string } | null
  stock: { size: string; color: string } | null
}

interface DetailedRow {
  id: string
  product_id: string
  stock_id: string
  type: 'in' | 'out'
  quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
  product_name: string | null
  product_category: string | null
  stock_size: string | null
  stock_color: string | null
}

const PAGE_SIZE = 20

// Escape karakter yang punya makna khusus di filter PostgREST (.or)
function sanitize(term: string): string {
  return term.replace(/[%,()]/g, ' ').trim()
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all')
  const [page, setPage] = useState(0)

  // Debounce input pencarian agar tidak query setiap ketikan
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchMovements = useCallback(async (currentPage: number, q: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('stock_movements_detailed')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter)
      }

      const term = sanitize(q)
      if (term) {
        // Pencarian sisi-server di seluruh data, bukan hanya yang sudah dimuat
        query = query.or(
          `product_name.ilike.%${term}%,stock_size.ilike.%${term}%,stock_color.ilike.%${term}%,notes.ilike.%${term}%`
        )
      }

      const { data, count, error } = await query
      if (error) throw error

      const rows: MovementRow[] = ((data ?? []) as DetailedRow[]).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        stock_id: r.stock_id,
        type: r.type,
        quantity: r.quantity,
        notes: r.notes,
        created_by: r.created_by,
        created_at: r.created_at,
        product: r.product_name ? { name: r.product_name, category: r.product_category ?? '' } : null,
        stock: r.stock_size ? { size: r.stock_size, color: r.stock_color ?? '' } : null,
      }))

      setMovements((prev) => (currentPage === 0 ? rows : [...prev, ...rows]))
      setHasMore((count ?? 0) > (currentPage + 1) * PAGE_SIZE)
    } catch (err) {
      console.error('Error fetching movements:', err)
      toast.error('Gagal memuat pergerakan stok')
    } finally {
      setLoading(false)
    }
  }, [typeFilter])

  // Filter/pencarian berubah → muat ulang dari halaman 0
  useEffect(() => {
    setPage(0)
    fetchMovements(0, debouncedSearch)
  }, [fetchMovements, debouncedSearch])

  // "Muat lebih banyak" → ambil halaman berikutnya & gabungkan
  useEffect(() => {
    if (page > 0) fetchMovements(page, debouncedSearch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const filtered = movements

  const loadMore = () => setPage((p) => p + 1)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-primary font-bold text-xl">Pergerakan Stok</h2>
          <p className="text-text-muted text-sm">Riwayat semua transaksi stok</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari produk, ukuran, warna, catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'in', 'out'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex-1 sm:flex-none ${
                typeFilter === t
                  ? t === 'in'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : t === 'out'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-gold bg-gold/15 text-gold'
                  : 'border-border bg-surface-2 text-text-secondary hover:border-gold/30'
              }`}
            >
              {t === 'all' ? 'Semua' : t === 'in' ? '↑ Masuk' : '↓ Keluar'}
            </button>
          ))}
        </div>
      </div>

      {loading && page === 0 ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Filter size={40} className="text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-text-secondary font-medium">Tidak ada data pergerakan</p>
          {search && (
            <button onClick={() => setSearch('')} className="text-gold text-xs mt-2 hover:underline">
              Hapus pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Waktu</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Produk</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Ukuran</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Warna</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Tipe</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Jumlah</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                      {formatDateTime(m.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{m.product?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.stock?.size ?? '—'}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.stock?.color ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge flex items-center gap-1 w-fit ${m.type === 'in' ? 'badge-green' : 'badge-red'}`}>
                        {m.type === 'in' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {m.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs max-w-xs truncate">
                      {m.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-2">
            {filtered.map((m) => (
              <div key={m.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-text-primary font-semibold truncate">{m.product?.name ?? '—'}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {m.stock?.size ?? '—'} · {m.stock?.color ?? '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg ${m.type === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity}
                    </p>
                    <span className={`badge text-[10px] flex items-center gap-0.5 justify-end ${m.type === 'in' ? 'badge-green' : 'badge-red'}`}>
                      {m.type === 'in' ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                      {m.type === 'in' ? 'Masuk' : 'Keluar'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <p className="text-text-muted text-xs">{formatDateTime(m.created_at)}</p>
                  {m.notes && <p className="text-text-muted text-xs italic truncate max-w-[60%]">{m.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-border border-t-gold rounded-full animate-spin" />
              ) : null}
              {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
