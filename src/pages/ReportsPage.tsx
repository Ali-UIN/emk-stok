import { useState, useCallback } from 'react'
import { FileDown, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatMonthYear } from '../lib/utils'
import type { ReportRow } from '../types'

export default function ReportsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  const generateReport = useCallback(async () => {
    setLoading(true)
    setGenerated(false)

    try {
      // Perhitungan stok awal/akhir dilakukan di server (RPC) agar akurat
      // secara historis — quantity sekarang dikoreksi mundur dengan semua
      // pergerakan setelah bulan terpilih.
      const { data, error } = await supabase.rpc('monthly_stock_report', {
        p_year: year,
        p_month: month,
      })
      if (error) throw error

      const reportRows: ReportRow[] = (data ?? []).map((r: ReportRow) => ({
        product_name: r.product_name ?? '',
        category: r.category ?? '',
        sku: r.sku ?? null,
        size: r.size,
        color: r.color,
        opening_stock: r.opening_stock,
        total_in: r.total_in,
        total_out: r.total_out,
        closing_stock: r.closing_stock,
      }))

      setRows(reportRows)
      setGenerated(true)
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat laporan')
    } finally {
      setLoading(false)
    }
  }, [month, year])

  const exportExcel = async () => {
    if (!rows.length) { toast.error('Generate laporan dulu'); return }
    const { default: ExcelJS } = await import('exceljs')

    // Palet warna selaras dengan brand & PDF
    const GOLD = 'FFC9973A'
    const DARK = 'FF0A0A0A'
    const GREEN = 'FF16A34A'
    const RED = 'FFEF4444'
    const ZEBRA = 'FFF5F5F5'
    const BORDER = 'FFD9D9D9'

    const wb = new ExcelJS.Workbook()
    wb.creator = 'emkarin.id'
    wb.created = new Date()
    const ws = wb.addWorksheet('Laporan Stok', {
      views: [{ state: 'frozen', ySplit: 5 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    })

    const COLS = 9 // jumlah kolom data
    const lastCol = String.fromCharCode(64 + COLS) // 'I'
    const thin = { style: 'thin' as const, color: { argb: BORDER } }
    const allBorders = { top: thin, left: thin, bottom: thin, right: thin }

    // ── Blok judul ────────────────────────────────────────────
    ws.mergeCells(`A1:${lastCol}1`)
    const titleCell = ws.getCell('A1')
    titleCell.value = 'emkarin.id'
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: GOLD } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } }
    ws.getRow(1).height = 28

    ws.mergeCells(`A2:${lastCol}2`)
    const subCell = ws.getCell('A2')
    subCell.value = `Laporan Stok — ${formatMonthYear(month, year)}`
    subCell.font = { name: 'Calibri', size: 11, color: { argb: 'FFA0A0A0' } }
    subCell.alignment = { vertical: 'middle', horizontal: 'left' }
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK } }
    ws.getRow(2).height = 18

    ws.mergeCells(`A3:${lastCol}3`)
    const metaCell = ws.getCell('A3')
    metaCell.value = `Dicetak ${new Date().toLocaleDateString('id-ID')} · ${rows.length} item`
    metaCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF888888' } }
    ws.getRow(4).height = 6 // baris pemisah tipis

    // ── Header tabel (baris 5) ────────────────────────────────
    const headers = ['Nama Produk', 'Kategori', 'SKU', 'Ukuran', 'Warna', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir']
    const headerRow = ws.getRow(5)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: DARK } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } }
      cell.alignment = { vertical: 'middle', horizontal: i >= 5 ? 'right' : 'left' }
      cell.border = allBorders
    })
    headerRow.height = 20

    // ── Baris data ────────────────────────────────────────────
    rows.forEach((r, idx) => {
      const row = ws.addRow([
        r.product_name,
        r.category,
        r.sku ?? '—',
        r.size,
        r.color,
        r.opening_stock,
        r.total_in,
        r.total_out,
        r.closing_stock,
      ])
      const zebra = idx % 2 === 1
      row.eachCell((cell, col) => {
        cell.border = allBorders
        cell.font = { name: 'Calibri', size: 10, color: { argb: DARK } }
        if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
        if (col >= 6) {
          cell.alignment = { horizontal: 'right' }
          cell.numFmt = '#,##0'
        } else {
          cell.alignment = { horizontal: 'left' }
        }
      })
      // Warna untuk Masuk / Keluar / Stok Akhir
      row.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: GREEN } }
      row.getCell(8).font = { name: 'Calibri', size: 10, color: { argb: RED } }
      row.getCell(9).font = { name: 'Calibri', size: 10, bold: true, color: { argb: DARK } }
    })

    // ── Baris TOTAL ───────────────────────────────────────────
    const totals = rows.reduce(
      (acc, r) => {
        acc.opening += r.opening_stock
        acc.in += r.total_in
        acc.out += r.total_out
        acc.closing += r.closing_stock
        return acc
      },
      { opening: 0, in: 0, out: 0, closing: 0 }
    )
    const totalRow = ws.addRow(['TOTAL', '', '', '', '', totals.opening, totals.in, totals.out, totals.closing])
    ws.mergeCells(`A${totalRow.number}:E${totalRow.number}`)
    totalRow.eachCell((cell, col) => {
      cell.border = allBorders
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: DARK } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFE3C8' } }
      if (col >= 6) {
        cell.alignment = { horizontal: 'right' }
        cell.numFmt = '#,##0'
      }
    })
    totalRow.getCell(1).alignment = { horizontal: 'left' }
    totalRow.height = 18

    // ── Lebar kolom (auto berdasarkan konten, dengan batas) ───
    const widths = [26, 12, 16, 10, 14, 11, 9, 9, 12]
    headers.forEach((h, i) => {
      let max = Math.max(h.length, widths[i])
      rows.forEach((r) => {
        const vals = [r.product_name, r.category, r.sku ?? '—', r.size, r.color]
        if (i < vals.length) max = Math.max(max, String(vals[i]).length + 2)
      })
      ws.getColumn(i + 1).width = Math.min(max, 40)
    })

    // ── Unduh ─────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-stok-emkarin-${year}-${String(month).padStart(2, '0')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Excel berhasil diunduh!')
  }

  const exportPDF = async () => {
    if (!rows.length) { toast.error('Generate laporan dulu'); return }
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })

    // Header
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, doc.internal.pageSize.width, 28, 'F')
    doc.setTextColor(201, 151, 58)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('emkarin.id', 14, 12)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text('Laporan Stok — ' + formatMonthYear(month, year), 14, 22)

    autoTable(doc, {
      startY: 34,
      head: [['Nama Produk', 'Kategori', 'SKU', 'Ukuran', 'Warna', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir']],
      body: rows.map((r) => [
        r.product_name,
        r.category,
        r.sku ?? '',
        r.size,
        r.color,
        r.opening_stock,
        r.total_in,
        r.total_out,
        r.closing_stock,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [201, 151, 58],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right', textColor: [34, 197, 94] },
        7: { halign: 'right', textColor: [239, 68, 68] },
        8: { halign: 'right', fontStyle: 'bold' },
      },
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Halaman ${i} dari ${pageCount} — Dicetak ${new Date().toLocaleDateString('id-ID')}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: 'center' }
      )
    }

    doc.save(`laporan-stok-emkarin-${year}-${String(month).padStart(2, '0')}.pdf`)
    toast.success('PDF berhasil diunduh!')
  }

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i, 1).toLocaleDateString('id-ID', { month: 'long' }),
  }))

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="text-text-primary font-bold text-lg">Laporan Bulanan</h2>
        <p className="text-text-muted text-xs">Generate dan export laporan stok per bulan</p>
      </div>

      {/* Filter & Generate */}
      <div className="card">
        <h3 className="text-text-primary font-semibold mb-4 text-sm">Pilih Periode</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="input-field sm:w-48"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input-field sm:w-32"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={generateReport}
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 sm:w-auto"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Memproses...' : 'Generate Laporan'}
          </button>
        </div>
      </div>

      {/* Export buttons */}
      {generated && rows.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="card flex-1 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <FileSpreadsheet size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-text-primary font-medium text-sm">Export Excel</p>
                <p className="text-text-muted text-xs">.xlsx — {rows.length} baris</p>
              </div>
            </div>
            <button onClick={exportExcel} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
              <FileDown size={14} /> Unduh
            </button>
          </div>

          <div className="card flex-1 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <FileText size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-text-primary font-medium text-sm">Export PDF</p>
                <p className="text-text-muted text-xs">Landscape · {rows.length} baris</p>
              </div>
            </div>
            <button onClick={exportPDF} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
              <FileDown size={14} /> Unduh
            </button>
          </div>
        </div>
      )}

      {/* Preview table */}
      {generated && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-text-primary font-semibold text-sm">
              Preview — {formatMonthYear(month, year)}
            </h3>
            <span className="badge-gray">{rows.length} item</span>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-8 text-text-muted text-sm">
              Tidak ada data untuk periode ini
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto -mx-4 px-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Produk</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Kategori</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">SKU</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Ukuran</th>
                      <th className="text-left py-2 px-2 text-text-muted font-medium">Warna</th>
                      <th className="text-right py-2 px-2 text-text-muted font-medium">Stok Awal</th>
                      <th className="text-right py-2 px-2 text-green-400 font-medium">Masuk</th>
                      <th className="text-right py-2 px-2 text-red-400 font-medium">Keluar</th>
                      <th className="text-right py-2 px-2 text-gold font-medium">Stok Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-surface-2 transition-colors">
                        <td className="py-2 px-2 font-medium text-text-primary">{r.product_name}</td>
                        <td className="py-2 px-2"><span className="badge-gold">{r.category}</span></td>
                        <td className="py-2 px-2 text-text-muted font-mono">{r.sku ?? '—'}</td>
                        <td className="py-2 px-2 text-text-secondary">{r.size}</td>
                        <td className="py-2 px-2 text-text-secondary">{r.color}</td>
                        <td className="py-2 px-2 text-right text-text-secondary">{r.opening_stock}</td>
                        <td className="py-2 px-2 text-right text-green-400 font-medium">+{r.total_in}</td>
                        <td className="py-2 px-2 text-right text-red-400 font-medium">-{r.total_out}</td>
                        <td className="py-2 px-2 text-right text-gold font-bold">{r.closing_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="card-2 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-text-primary font-medium text-sm">{r.product_name}</p>
                        <p className="text-text-muted text-xs">{r.size} · {r.color}</p>
                      </div>
                      <span className="badge-gold">{r.category}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3 text-center">
                      <div>
                        <p className="text-text-muted text-[10px]">Awal</p>
                        <p className="text-text-secondary text-sm font-bold">{r.opening_stock}</p>
                      </div>
                      <div>
                        <p className="text-green-400 text-[10px]">Masuk</p>
                        <p className="text-green-400 text-sm font-bold">+{r.total_in}</p>
                      </div>
                      <div>
                        <p className="text-red-400 text-[10px]">Keluar</p>
                        <p className="text-red-400 text-sm font-bold">-{r.total_out}</p>
                      </div>
                      <div>
                        <p className="text-gold text-[10px]">Akhir</p>
                        <p className="text-gold text-sm font-bold">{r.closing_stock}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
