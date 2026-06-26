export type Category = 'Abaya' | 'Gamis' | 'Hijab' | 'RTW' | 'Grandest' | 'Celana'
export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'All Size'
export type MovementType = 'in' | 'out'
export type UserRole = 'admin' | 'owner'

export const CATEGORIES: Category[] = ['Abaya', 'Gamis', 'Hijab', 'RTW', 'Grandest', 'Celana']
export const SIZES: Size[] = ['S', 'M', 'L', 'XL', 'XXL', 'All Size']

export interface Product {
  id: string
  name: string
  category: Category
  sku: string | null
  description: string | null
  sizes: string[]
  colors: string[]
  created_at: string
  updated_at: string
}

export interface Stock {
  id: string
  product_id: string
  size: string
  color: string
  quantity: number
  low_stock_threshold: number
  created_at: string
  updated_at: string
  product?: Product
}

export interface StockMovement {
  id: string
  product_id: string
  stock_id: string
  type: MovementType
  quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
  product?: Product
  stock?: Stock
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

export interface DashboardStats {
  totalProducts: number
  totalStockItems: number
  lowStockCount: number
  todayMovements: number
  todayIn: number
  todayOut: number
}

export interface ReportRow {
  product_name: string
  category: string
  sku: string | null
  size: string
  color: string
  opening_stock: number
  total_in: number
  total_out: number
  closing_stock: number
}

export interface ProductFormData {
  name: string
  category: Category
  sku: string
  description: string
  sizes: string[]
  colors: string[]
  initialStock?: {
    size: string
    color: string
    quantity: number
    low_stock_threshold: number
  }[]
}

export interface StockFormData {
  product_id: string
  stock_id: string
  type: MovementType
  quantity: number
  notes: string
}
