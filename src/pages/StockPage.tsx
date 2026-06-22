import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Layers, X, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES, SIZES, type Stock, type Product } from '../types'

interface StockWithProduct extends Stock {
  product: Product
}

export default function StockPage() {
  const { isAdmin } = useAuth()
  const [stockItems, setStockItems] = useState<StockWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<StockWithProduct | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [threshold, setThreshold] = useState(5)
  const [movementType, setMovementType] = useState<'in' | 'out'>('in')
  const [notes, setNotes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stockRes, prodRes] = await Promise.all([
        supabase
          .from('stock')
          .select('*, product:products(*)')
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
      ])
      if (stockRes.error) throw stockRes.error
      if (prodRes.error) throw prodRes.error
      setStockItems(stockRes.data as unknown as StockWithProduct[])
      setProducts(prodRes.data as Product[])
    } catch (err) {
      console.error('Error fetching stock data:', err)
      toast.error('Gagal memuat data stok')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openAdd = () => {
    setEditItem(null)
    setSelectedProduct('')
    setSelectedSize('')
    setSelectedColor('')
    setQuantity(0)
    setThreshold(5)
    setMovementType('in')
    setNotes('')
    setShowModal(true)
  }

  const openEdit = (item: StockWithProduct) => {
    setEditItem(item)
    setSelectedProduct(item.product_id)
    setSelectedSize(item.size)
    setSelectedColor(item.color)
    setQuantity(0)
    setThreshold(item.low_stock_threshold)
    setMovementType('in')
    setNotes('')
    setShowModal(true)
  }

  const currentProduct = products.find((p) => p.id === selectedProduct)
  const availableColors = currentProduct?.colors ?? []

  const handleSave = async () => {
    if (!selectedProduct) { toast.error('Pilih produk'); return }
    if (!selectedSize) { toast.error('Pilih ukuran'); return }
    if (!selectedColor) { toast.error('Pilih warna'); return }
    if (quantity < 0) { toast.error('Jumlah tidak boleh negatif'); return }

    setSaving(true)
    try {
      if (editItem) {
        // --- EDIT MODE ---
        if (quantity > 0) {
          // Pergerakan stok + perubahan quantity dilakukan atomik di server
          // (satu transaksi, dengan row lock + validasi stok keluar).
          const { error } = await supabase.rpc('apply_stock_movement', {
            p_stock_id: editItem.id,
            p_type: movementType,
            p_quantity: quantity,
            p_notes: notes || null,
            p_low_stock_threshold: threshold,
          })
          if (error) throw error
          toast.success('Stok diperbarui!')
        } else {
          // Tidak ada pergerakan — hanya perbarui batas alert
          const { error: threshErr } = await supabase
            .from('stock')
            .update({ low_stock_threshold: threshold })
            .eq('id', editItem.id)
          if (threshErr) throw threshErr
          toast.success('Batas stok diperbarui!')
        }
        setShowModal(false)
        fetchData()
      } else {
        // --- ADD MODE: buat entri stok + (opsional) stok awal, atomik di server ---
        const { error } = await supabase.rpc('create_stock_item', {
          p_product_id: selectedProduct,
          p_size: selectedSize,
          p_color: selectedColor,
          p_quantity: quantity,
          p_low_stock_threshold: threshold,
          p_notes: notes || null,
        })
        if (error) throw error

        toast.success('Stok ditambahkan!')
        setShowModal(false)
        fetchData()
      }
    } catch (err) {
      console.error('handleSave error:', err)
      const message = err instanceof Error ? err.message : ''
      toast.error(message || 'Terjadi kesalahan, silakan coba lagi')
    } finally {
      setSaving(false)
    }
  }


  const filtered = stockItems.filter((s) => {
    const matchSearch =
      s.product.name.toLowerCase().includes(search.toLowerCase()) ||
      s.size.toLowerCase().includes(search.toLowerCase()) ||
      s.color.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || s.product.category === catFilter
    return matchSearch && matchCat
  })

  const isOut = (item: StockWithProduct) => item.quantity === 0
  const isLow = (item: StockWithProduct) => item.quantity > 0 && item.quantity <= item.low_stock_threshold

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Stok</h2>
          <p className="text-text-muted text-xs">{stockItems.length} item stok</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            <span>Tambah Stok</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari produk, ukuran, warna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="input-field text-sm sm:w-40"
        >
          <option value="all">Semua Kategori</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Layers size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Tidak ada data stok</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Produk</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Kategori</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Ukuran</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Warna</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Stok</th>
                  <th className="text-right px-4 py-3 text-text-muted font-medium">Min. Alert</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Status</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{s.product.name}</td>
                    <td className="px-4 py-3"><span className="badge-gold">{s.product.category}</span></td>
                    <td className="px-4 py-3 text-text-secondary">{s.size}</td>
                    <td className="px-4 py-3 text-text-secondary">{s.color}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isOut(s) ? 'text-red-400' : isLow(s) ? 'text-yellow-400' : 'text-text-primary'}`}>
                      {s.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted">{s.low_stock_threshold}</td>
                    <td className="px-4 py-3">
                      {isOut(s) ? (
                        <span className="badge-red flex items-center gap-1 w-fit">
                          <AlertTriangle size={10} /> Habis
                        </span>
                      ) : isLow(s) ? (
                        <span className="badge-yellow flex items-center gap-1 w-fit">
                          <AlertTriangle size={10} /> Menipis
                        </span>
                      ) : (
                        <span className="badge-green">Normal</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg hover:bg-gold/10 hover:text-gold text-text-muted transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((s) => (
              <div key={s.id} className={`card ${isOut(s) ? 'border-red-500/30' : isLow(s) ? 'border-yellow-500/30' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-text-primary font-semibold truncate">{s.product.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {s.size} · {s.color}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg ${isOut(s) ? 'text-red-400' : isLow(s) ? 'text-yellow-400' : 'text-text-primary'}`}>
                      {s.quantity}
                    </p>
                    {isOut(s) ? (
                      <span className="badge-red text-[10px] flex items-center gap-0.5">
                        <AlertTriangle size={9} /> Habis
                      </span>
                    ) : isLow(s) ? (
                      <span className="badge-yellow text-[10px] flex items-center gap-0.5">
                        <AlertTriangle size={9} /> Menipis
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="badge-gold">{s.product.category}</span>
                  {isAdmin && (
                    <button onClick={() => openEdit(s)} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1">
                      <Edit2 size={12} /> Update Stok
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
              <h3 className="font-semibold text-text-primary">
                {editItem ? `Update Stok — ${editItem.product.name}` : 'Tambah Stok Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {!editItem && (
                <>
                  <div>
                    <label className="block text-text-secondary text-sm font-medium mb-1">Produk *</label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => { setSelectedProduct(e.target.value); setSelectedColor('') }}
                      className="input-field"
                    >
                      <option value="">Pilih produk...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-text-secondary text-sm font-medium mb-1">Ukuran *</label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="input-field"
                        disabled={!currentProduct}
                      >
                        <option value="">Pilih ukuran</option>
                        {(currentProduct?.sizes ?? SIZES).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-text-secondary text-sm font-medium mb-1">Warna *</label>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="input-field"
                        disabled={!currentProduct}
                      >
                        <option value="">Pilih warna</option>
                        {availableColors.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {editItem && (
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1">Tipe Pergerakan</label>
                  <div className="flex gap-2">
                    {(['in', 'out'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMovementType(t)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          movementType === t
                            ? t === 'in'
                              ? 'border-green-500 bg-green-500/10 text-green-400'
                              : 'border-red-500 bg-red-500/10 text-red-400'
                            : 'border-border bg-surface-2 text-text-secondary'
                        }`}
                      >
                        {t === 'in' ? '+ Stok Masuk' : '- Stok Keluar'}
                      </button>
                    ))}
                  </div>
                  <p className="text-text-muted text-xs mt-1">Stok saat ini: <span className="text-text-primary font-bold">{editItem.quantity}</span></p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1">
                    {editItem ? 'Jumlah Perubahan' : 'Stok Awal'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editItem && movementType === 'out' ? editItem.quantity : undefined}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                  {editItem && movementType === 'out' && quantity > editItem.quantity && (
                    <p className="text-red-400 text-xs mt-1">Melebihi stok tersedia ({editItem.quantity})</p>
                  )}
                </div>
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1">Min. Alert</label>
                  <input
                    type="number"
                    min={0}
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opsional..."
                  className="input-field"
                />
              </div>
            </div>

            <div className="p-4 pt-0 flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
