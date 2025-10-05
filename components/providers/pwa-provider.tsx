'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, X, RefreshCw } from 'lucide-react'

interface PWAProviderProps {
  children: React.ReactNode
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isPWAMode, setIsPWAMode] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Ensure we're running client-side only
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    // Initialize PWA features safely
    const initializePWA = async () => {
      try {
        // Register service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('Service Worker registered:', registration)
        }

        // Check if app is installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        setIsInstalled(isStandalone)
        setIsPWAMode(isStandalone)
      } catch (error) {
        console.error('PWA initialization failed:', error)
      }
    }

    initializePWA()

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setIsInstalled(true)
      setIsPWAMode(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    try {
      // Check if install prompt is available
      if (typeof window !== 'undefined' && (window as any).deferredPrompt) {
        const deferredPrompt = (window as any).deferredPrompt
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('PWA installed')
          setShowInstallPrompt(false)
          setIsInstalled(true)
        }
      }
    } catch (error) {
      console.error('PWA install failed:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
  }

  return (
    <>
      {children}
      
      {/* PWA Install Banner */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 md:left-auto md:right-4 md:w-96">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚀</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                Install TrainAI
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Get quick access to your training platform with our app
              </p>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="flex-1 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Install
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Update Banner */}
      <UpdateNotification />
    </>
  )
}

// Update notification component
function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUpdateFound = () => {
      setShowUpdate(true)
    }

    navigator.serviceWorker?.addEventListener('updatefound', handleUpdateFound)

    return () => {
      navigator.serviceWorker?.removeEventListener('updatefound', handleUpdateFound)
    }
  }, [])

  const handleUpdate = () => {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdate(false)
  }

  const handleDismiss = () => {
    setShowUpdate(false)
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Update Available</p>
          <p className="text-xs opacity-90">A new version is ready</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUpdate}
            className="text-xs bg-blue-700 hover:bg-blue-800 text-white"
          >
            Update
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs text-white hover:bg-blue-700"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
