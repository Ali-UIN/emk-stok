import { useState, useEffect } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { usePWAInstall } from '../hooks/usePWAInstall'

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Cek apakah user sudah dismiss sebelumnya
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed')
    if (wasDismissed) {
      setDismissed(true)
      return
    }

    // Delay sedikit agar tidak langsung muncul saat login
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    // Simpan dismiss selama 3 hari
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString())
    setTimeout(() => {
      localStorage.removeItem('pwa-banner-dismissed')
    }, 3 * 24 * 60 * 60 * 1000)
  }

  const handleInstall = async () => {
    await triggerInstall()
    setVisible(false)
  }

  if (!visible || dismissed || isInstalled) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 lg:w-96 z-50"
      style={{ animation: 'slideUp 0.4s ease-out' }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: 'linear-gradient(135deg, #1A1A1A 0%, #111111 100%)',
          border: '1px solid #2A2A2A',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,151,58,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #C9973A, #A67C2E)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Smartphone size={24} color="#000" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '14px', margin: 0 }}>
            Install Aplikasi
          </p>
          <p style={{ color: '#888', fontSize: '12px', margin: '2px 0 0 0', lineHeight: 1.4 }}>
            Akses emkarin.id lebih cepat dari home screen
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleInstall}
            style={{
              background: 'linear-gradient(135deg, #C9973A, #A67C2E)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={14} />
            Install
          </button>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              color: '#666',
              border: '1px solid #2A2A2A',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
