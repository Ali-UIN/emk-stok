import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { CATEGORIES, SIZES, type Product, type ProductFormData, type Category } from '../types'
import { generateSKU, formatDate } from '../lib/utils'
import ConfirmDialog from '../components/ConfirmDialog'

const DEFAULT_FORM: ProductFormData = {
  name: '',
  category: 'Abaya',
  sku: '',
  description: '',
  sizes: [],
  colors: [],
}

export default function ProductsPage() {
  const { isAdmin, isOwner } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [colorInput, setColorInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data as Product[])
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openAdd = () => {
    setEditing(null)
    setForm(DEFAULT_FORM)
    setColorInput('')
    setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category as Category,
      sku: p.sku ?? '',
      description: p.description ?? '',
      sizes: p.sizes,
      colors: p.colors,
    })
    setColorInput('')
    setShowModal(true)
  }

  const toggleSize = (size: string) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter((s) => s !== size) : [...f.sizes, size],
    }))
  }

  const addColor = () => {
    const color = colorInput.trim()
    if (!color) return
    if (form.colors.includes(color)) {
      toast.error('Warna sudah ditambahkan')
      return
    }
    setForm((f) => ({ ...f, colors: [...f.colors, color] }))
    setColorInput('')
  }

  const removeColor = (color: string) => {
    setForm((f) => ({ ...f, colors: f.colors.filter((c) => c !== color) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nama produk wajib diisi'); return }
    if (form.sizes.length === 0) { toast.error('Pilih minimal satu ukuran'); return }
    if (form.colors.length === 0) { toast.error('Tambahkan minimal satu warna'); return }

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      sku: form.sku.trim() || generateSKU(form.category, form.name),
      description: form.description.trim() || null,
      sizes: form.sizes,
      colors: form.colors,
    }

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { toast.error('Gagal menyimpan produk'); }
      else { toast.success('Produk diperbarui!'); setShowModal(false); fetchProducts() }
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) { toast.error('Gagal menambah produk'); }
      else { toast.success('Produk ditambahkan!'); setShowModal(false); fetchProducts() }
    }
    setSaving(false)
  }

  const handleDelete = async (p: Product) => {
    setDeleteTarget(p)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id)
    if (error) toast.error('Gagal menghapus')
    else { toast.success('Produk dihapus'); fetchProducts() }
    setDeleteTarget(null)
  }

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Produk</h2>
          <p className="text-text-muted text-xs">{products.length} produk terdaftar</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            <span>Tambah</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari nama atau SKU..."
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

      {/* Table / Cards */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Package size={40} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">Tidak ada produk</p>
          <p className="text-text-muted text-sm mt-1">
            {search ? 'Coba kata kunci lain' : 'Tambahkan produk pertama kamu'}
          </p>
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
                  <th className="text-left px-4 py-3 text-text-muted font-medium">SKU</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Ukuran</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Warna</th>
                  <th className="text-left px-4 py-3 text-text-muted font-medium">Tgl Tambah</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className="badge-gold">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.sizes.map((s) => (
                          <span key={s} className="badge-gray">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.colors.slice(0, 3).map((c) => (
                          <span key={c} className="badge-gray">{c}</span>
                        ))}
                        {p.colors.length > 3 && (
                          <span className="badge-gray">+{p.colors.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">{formatDate(p.created_at)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-gold/10 hover:text-gold text-text-muted transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-muted transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-text-primary font-semibold truncate">{p.name}</p>
                    <p className="text-text-muted text-xs font-mono mt-0.5">{p.sku}</p>
                  </div>
                  <span className="badge-gold flex-shrink-0">{p.category}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.sizes.map((s) => <span key={s} className="badge-gray">{s}</span>)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.colors.map((c) => <span key={c} className="badge-gray">{c}</span>)}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button onClick={() => openEdit(p)} className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-1.5">
                      <Edit2 size={12} /> Edit
                    </button>
                    {isOwner && (
                      <button onClick={() => handleDelete(p)} className="btn-danger flex-1 flex items-center justify-center gap-1 text-xs py-1.5">
                        <Trash2 size={12} /> Hapus
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70">
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface">
              <h3 className="font-semibold text-text-primary">
                {editing ? 'Edit Produk' : 'Tambah Produk'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="cth: Abaya Butterscotch"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1">Kategori *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                    className="input-field"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-text-secondary text-sm font-medium mb-1">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    placeholder="Auto generate"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Ukuran *</label>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.sizes.includes(s)
                          ? 'border-gold bg-gold/15 text-gold'
                          : 'border-border bg-surface-2 text-text-secondary hover:border-gold/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">Warna *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor() } }}
                    placeholder="cth: Hitam, Navy..."
                    className="input-field text-sm"
                  />
                  <button type="button" onClick={addColor} className="btn-secondary px-3 flex-shrink-0">
                    <Plus size={16} />
                  </button>
                </div>
                {form.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.colors.map((c) => (
                      <span
                        key={c}
                        className="badge-gray flex items-center gap-1 cursor-pointer hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        onClick={() => removeColor(c)}
                      >
                        {c} <X size={10} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opsional..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="p-4 pt-0 flex gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : null}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog — Hapus Produk */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Produk?"
        message={`Produk "${deleteTarget?.name}" dan semua data stok terkait akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        icon="trash"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
