// Utility: merge class names safely
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatMonthYear(month: number, year: number): string {
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function getMonthName(month: number): string {
  const date = new Date(2024, month - 1, 1)
  return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length) + '...'
}

export function generateSKU(category: string, name: string): string {
  const catCode = category.substring(0, 3).toUpperCase()
  const nameCode = name.replace(/\s+/g, '').substring(0, 4).toUpperCase()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${catCode}-${nameCode}-${random}`
}

export function getStartOfMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toISOString()
}

export function getEndOfMonth(year: number, month: number): string {
  return new Date(year, month, 0, 23, 59, 59).toISOString()
}

export function getStartOfDay(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function getEndOfDay(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function isLowStock(quantity: number, threshold: number): boolean {
  return quantity <= threshold
}

export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}
