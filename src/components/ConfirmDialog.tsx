import { useEffect } from 'react'
import { AlertTriangle, LogOut, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  icon?: 'trash' | 'logout'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  icon = 'trash',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Tutup dengan ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'
  const accentColor = isDanger ? '#ef4444' : '#f59e0b'
  const accentBg = isDanger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
  const confirmBg = isDanger
    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
    : 'linear-gradient(135deg, #d97706, #b45309)'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(145deg, #1C1C1C, #141414)',
          border: '1px solid #2A2A2A',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: 'slideUp 0.2s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div style={{ height: '3px', background: confirmBg }} />

        <div style={{ padding: '24px 24px 20px' }}>
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'transparent', border: 'none',
                color: '#555', cursor: 'pointer', padding: '4px',
                borderRadius: '8px', lineHeight: 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Icon */}
          <div
            style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: accentBg,
              border: `1px solid ${accentColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {icon === 'logout'
              ? <LogOut size={22} color={accentColor} />
              : <AlertTriangle size={22} color={accentColor} />
            }
          </div>

          {/* Text */}
          <h3 style={{
            color: '#FFFFFF', fontWeight: 700, fontSize: '16px',
            margin: '0 0 8px 0', letterSpacing: '-0.2px',
          }}>
            {title}
          </h3>
          <p style={{
            color: '#888', fontSize: '13px', lineHeight: 1.6,
            margin: '0 0 24px 0',
          }}>
            {message}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1, padding: '10px 16px',
                background: 'transparent',
                border: '1px solid #2A2A2A',
                borderRadius: '10px',
                color: '#999', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#444'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2A2A2A'
                e.currentTarget.style.color = '#999'
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1, padding: '10px 16px',
                background: confirmBg,
                border: 'none',
                borderRadius: '10px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'opacity 0.15s',
                boxShadow: `0 4px 15px ${accentColor}30`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
