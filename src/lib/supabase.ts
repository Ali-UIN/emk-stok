import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Graceful error — shows a visible message instead of crashing the app
if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  document.body.innerHTML = `
    <div style="
      min-height:100vh; background:#0A0A0A; display:flex; align-items:center;
      justify-content:center; font-family:system-ui,sans-serif; padding:24px;
    ">
      <div style="
        background:#1A1A1A; border:1px solid #2A2A2A; border-radius:16px;
        padding:32px; max-width:480px; width:100%; text-align:center;
      ">
        <div style="
          width:56px; height:56px; background:#C9973A20; border:1px solid #C9973A50;
          border-radius:12px; display:flex; align-items:center; justify-content:center;
          margin:0 auto 16px; font-size:24px; font-weight:bold; color:#C9973A;
        ">em</div>
        <h2 style="color:#fff; margin:0 0 8px; font-size:18px;">Konfigurasi Supabase Diperlukan</h2>
        <p style="color:#666; font-size:14px; margin:0 0 20px;">
          File <code style="background:#242424; padding:2px 6px; border-radius:4px; color:#C9973A">.env</code>
          belum dikonfigurasi. Buat file <code style="background:#242424; padding:2px 6px; border-radius:4px; color:#C9973A">.env</code>
          di root project dengan isi berikut:
        </p>
        <pre style="
          background:#0A0A0A; border:1px solid #2A2A2A; border-radius:8px;
          padding:16px; text-align:left; color:#C9973A; font-size:13px;
          overflow-x:auto; margin:0 0 20px;
        ">VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...</pre>
        <p style="color:#666; font-size:12px; margin:0;">
          Dapatkan kredensial dari
          <a href="https://supabase.com/dashboard" target="_blank"
            style="color:#C9973A; text-decoration:none;">supabase.com/dashboard</a>
          → Settings → API
        </p>
        <p style="color:#666; font-size:11px; margin:12px 0 0;">
          Setelah membuat file .env, restart dev server dengan <code style="color:#A0A0A0">npm run dev</code>
        </p>
      </div>
    </div>
  `
  throw new Error('[emkarin] Missing VITE_SUPABASE_URL. Please create a .env file.')
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  document.body.innerHTML = `
    <div style="
      min-height:100vh; background:#0A0A0A; display:flex; align-items:center;
      justify-content:center; font-family:system-ui,sans-serif; padding:24px;
    ">
      <div style="
        background:#1A1A1A; border:1px solid #2A2A2A; border-radius:16px;
        padding:32px; max-width:480px; width:100%; text-align:center;
      ">
        <h2 style="color:#fff; margin:0 0 8px;">VITE_SUPABASE_ANON_KEY Kosong</h2>
        <p style="color:#666; font-size:14px; margin:0;">
          Pastikan <code style="color:#C9973A">VITE_SUPABASE_ANON_KEY</code> sudah diisi di file .env
        </p>
      </div>
    </div>
  `
  throw new Error('[emkarin] Missing VITE_SUPABASE_ANON_KEY. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          category: string
          sku: string | null
          description: string | null
          sizes: string[]
          colors: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      stock: {
        Row: {
          id: string
          product_id: string
          size: string
          color: string
          quantity: number
          low_stock_threshold: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['stock']['Insert']>
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          stock_id: string
          type: 'in' | 'out'
          quantity: number
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'owner'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
    }
  }
}
