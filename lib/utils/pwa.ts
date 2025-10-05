// PWA Service Worker Management
export class PWAService {
  private static instance: PWAService
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false

  private constructor() {}

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService()
    }
    return PWAService.instance
  }

  // Register service worker
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined') return null

    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return null
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered:', this.registration)

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.updateAvailable = true
              this.showUpdateNotification()
            }
          })
        }
      })

      // Handle controller change (new service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateAvailable) {
          window.location.reload()
        }
      })

      return this.registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  // Unregister service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) return false

    try {
      const result = await this.registration.unregister()
      console.log('Service Worker unregistered:', result)
      return result
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
      return false
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission
    }

    return Notification.permission
  }

  // Show notification
  async showNotification(title: string, options: NotificationOptions): Promise<void> {
    if (!this.registration) {
      console.log('Service Worker not registered')
      return
    }

    const permission = await this.requestNotificationPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return
    }

    await this.registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    })
  }

  // Install prompt
  async showInstallPrompt(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return false
    }

    // Check if install prompt is available
    const deferredPrompt = (window as unknown as { deferredPrompt?: { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> } }).deferredPrompt
    if (!deferredPrompt) return false

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('PWA installed')
        return true
      } else {
        console.log('PWA install declined')
        return false
      }
    } catch (error) {
      console.error('PWA install prompt failed:', error)
      return false
    }
  }

  // Check if app is installed
  isInstalled(): boolean {
    if (typeof window === 'undefined') return false
    
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
  }

  // Check if app is running in PWA mode
  isPWAMode(): boolean {
    return this.isInstalled()
  }

  // Get app version
  async getVersion(): Promise<string> {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve('1.0.0')
        return
      }

      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || '1.0.0')
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      )

      // Timeout after 1 second
      setTimeout(() => resolve('1.0.0'), 1000)
    })
  }

  // Show update notification
  private showUpdateNotification(): void {
    if (typeof window === 'undefined') return

    const updateNotification = document.createElement('div')
    updateNotification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm'
    updateNotification.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">Update Available</p>
          <p class="text-xs opacity-90">A new version of TrainAI is ready</p>
        </div>
        <button class="flex-shrink-0 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded text-xs font-medium transition-colors">
          Update
        </button>
      </div>
    `

    const updateButton = updateNotification.querySelector('button')
    updateButton?.addEventListener('click', () => {
      this.registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
      updateNotification.remove()
    })

    document.body.appendChild(updateNotification)

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (updateNotification.parentNode) {
        updateNotification.remove()
      }
    }, 10000)
  }

  // Setup install prompt listeners
  setupInstallPrompt(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      ;(window as unknown as { deferredPrompt: unknown }).deferredPrompt = e
      console.log('PWA install prompt ready')
    })

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed')
      ;(window as unknown as { deferredPrompt: unknown }).deferredPrompt = null
    })
  }

  // Setup connection status listeners
  setupConnectionListeners(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('Connection restored')
      this.showNotification('Connection Restored', {
        body: 'TrainAI is back online',
        icon: '/icon-192.png'
      })
    })

    window.addEventListener('offline', () => {
      console.log('Connection lost')
      this.showNotification('You\'re Offline', {
        body: 'Some features may be limited',
        icon: '/icon-192.png'
      })
    })
  }

  // Initialize PWA
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return

    console.log('Initializing PWA...')
    
    await this.register()
    this.setupInstallPrompt()
    this.setupConnectionListeners()
    
    console.log('PWA initialized')
  }
}

// Export singleton instance
export const pwaService = PWAService.getInstance()
