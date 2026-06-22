# emkarin.id — Stock Management PWA

Aplikasi manajemen stok untuk toko fashion **emkarin.id** berbasis Progressive Web App (PWA).

## Fitur
- Manajemen produk (Abaya, Gamis, Hijab, RTW)
- Tracking stok per ukuran & warna
- Riwayat pergerakan stok (masuk/keluar)
- Laporan bulanan dengan export PDF & Excel
- Role: Admin & Owner
- Installable sebagai PWA di mobile dan desktop
- Responsive — mobile-first

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **PWA**: vite-plugin-pwa + Workbox
- **Export**: jsPDF (PDF) + ExcelJS (Excel berstyle)
- **Hosting**: Vercel

---

## Setup

### 1. Clone & Install

```bash
npm install
```

### 2. Konfigurasi Environment

Salin `.env.example` menjadi `.env` dan isi dengan credentials Supabase kamu:

```bash
copy .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ File `.env` **tidak boleh** di-commit ke Git (sudah ada di `.gitignore`)

### 3. Setup Database Supabase

1. Buka [supabase.com](https://supabase.com) → pilih project kamu
2. Buka **SQL Editor**
3. Salin dan jalankan isi file `supabase/schema.sql`

### 4. Buat User (Admin & Owner)

Di Supabase Dashboard:
1. Pergi ke **Authentication → Users → Invite user**
2. Untuk Owner, set metadata: `{"role": "owner"}`
3. Untuk Admin, set metadata: `{"role": "admin"}` (atau biarkan default)

> ⚠️ **Penting:** Akses ditegakkan di server lewat Row Level Security (RLS),
> bukan hanya disembunyikan di UI. Pastikan **signup publik dimatikan**
> (Authentication → Providers / Sign In) sehingga hanya user yang di-*invite*
> yang bisa masuk.

#### Model Peran

| Aksi | Admin | Owner |
|------|:-----:|:-----:|
| Lihat semua data | ✅ | ✅ |
| Tambah / edit produk | ✅ | ✅ |
| **Hapus produk** | ❌ | ✅ |
| Tambah / update stok & pergerakan | ✅ | ✅ |

Semua mutasi stok dijalankan lewat fungsi database atomik
(`apply_stock_movement`, `create_stock_item`) sehingga aman dari race
condition dan stok keluar tidak bisa melebihi stok tersedia.

> Sudah punya database lama? Cukup **jalankan ulang `supabase/schema.sql`** —
> script-nya idempoten dan akan mengganti kebijakan RLS permisif lama,
> menambahkan fungsi RPC, view, serta laporan bulanan yang akurat historis.

### 5. Jalankan Development Server

```bash
npm run dev
```

---

## Deploy ke Vercel

1. Push project ke GitHub
2. Import repo di [vercel.com](https://vercel.com)
3. Tambahkan environment variables di Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

---

## Struktur Project

```
src/
├── components/       # Layout, Sidebar, Navigation
├── contexts/         # AuthContext (Supabase auth)
├── hooks/            # Custom hooks
├── lib/              # Supabase client, utils
├── pages/            # Dashboard, Products, Stock, Movements, Reports
└── types/            # TypeScript types
supabase/
└── schema.sql        # Database schema
```

---

## File yang JANGAN di-commit

- `.env` — berisi credentials Supabase
- `node_modules/` — dependencies
- `dist/` — build output
- File PWA generated (`sw.js`, `workbox-*.js`)

Semua sudah tercakup di `.gitignore`.

---

## Catatan Keamanan

- **`VITE_SUPABASE_ANON_KEY` memang publik** (ter-bundle di frontend). Keamanan
  data bergantung pada **RLS** + signup yang dimatikan, bukan pada kerahasiaan key.
- **Export Excel** memakai **ExcelJS** dan aplikasi ini **hanya menulis** file
  `.xlsx` (tidak pernah mem-*parse* file dari pengguna). Jika ke depan menambah
  fitur *import* Excel, validasi/sanitasi isi file sebelum diproses.
