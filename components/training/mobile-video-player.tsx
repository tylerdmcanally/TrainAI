'use client'

import { useState, useRef, useEffect } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { Maximize2, Minimize2, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileVideoPlayerProps {
  playbackId: string
  title?: string
  poster?: string
  onTimeUpdate?: (currentTime: number) => void
  onPause?: () => void
  onPlay?: () => void
  onLoadedData?: (duration: number) => void
  onEnded?: () => void
  showChatToggle?: boolean
  isChatOpen?: boolean
  onChatToggle?: () => void
  className?: string
}

export function MobileVideoPlayer({
  playbackId,
  title,
  poster,
  onTimeUpdate,
  onPause,
  onPlay,
  onLoadedData,
  onEnded,
  showChatToggle = false,
  isChatOpen = false,
  onChatToggle,
  className
}: MobileVideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const playerRef = useRef<any>(null)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerRef.current) return

    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    } else {
      if (playerRef.current.requestFullscreen) {
        playerRef.current.requestFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  return (
    <div className={cn('relative bg-black rounded-lg overflow-hidden', className)}>
      {/* Video Player */}
      <MuxPlayer
        ref={playerRef}
        streamType="on-demand"
        playbackId={playbackId}
        metadata={{
          video_title: title || 'Training Video',
        }}
        poster={poster}
        onTimeUpdate={(e) => onTimeUpdate?.(e.detail.currentTime)}
        onPause={() => onPause?.()}
        onPlay={() => onPlay?.()}
        onLoadedData={(e) => onLoadedData?.(e.detail.duration)}
        onEnded={() => onEnded?.()}
        className={cn(
          'w-full h-full',
          isMobile ? 'aspect-video' : 'aspect-video lg:aspect-[16/9]'
        )}
        accentColor="#2563eb"
        // Mobile-specific props
        playsInline
        preload="metadata"
        controls
        // Custom controls for mobile
        style={{
          '--controls-backdrop': 'rgba(0, 0, 0, 0.7)',
          '--seek-bar-color': '#3b82f6',
          '--seek-bar-buffer-color': 'rgba(255, 255, 255, 0.3)',
        } as React.CSSProperties}
      />

      {/* Mobile Controls Overlay */}
      {isMobile && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
            <div className="flex items-center gap-2">
              {showChatToggle && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onChatToggle}
                  className={cn(
                    'h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0',
                    isChatOpen && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Bottom Controls - Seek Indicators */}
          <div className="absolute bottom-16 left-4 right-4 pointer-events-auto">
            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={() => {
                  if (playerRef.current) {
                    const currentTime = playerRef.current.currentTime || 0
                    playerRef.current.currentTime = Math.max(0, currentTime - 10)
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs ml-1">10s</span>
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={() => {
                  if (playerRef.current) {
                    const currentTime = playerRef.current.currentTime || 0
                    const duration = playerRef.current.duration || 0
                    playerRef.current.currentTime = Math.min(duration, currentTime + 10)
                  }
                }}
              >
                <span className="text-xs mr-1">10s</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Title Overlay (Mobile) */}
      {isMobile && title && (
        <div className="absolute top-16 left-4 right-4 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            <h3 className="text-white text-sm font-medium truncate">{title}</h3>
          </div>
        </div>
      )}
    </div>
  )
}
