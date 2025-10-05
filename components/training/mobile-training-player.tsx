'use client'

import { useState, useEffect, useRef } from 'react'
import { MobileVideoPlayer } from './mobile-video-player'
import { AITutorChat } from './ai-tutor-chat'
import { CheckpointOverlay } from './checkpoint-overlay'
import { CompletionOverlay } from './completion-overlay'
import { Button } from '@/components/ui/button'
import { CheckCircle2, MessageCircle, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileTrainingPlayerProps {
  training: any
}

export function MobileTrainingPlayer({ training }: MobileTrainingPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [activeCheckpoint, setActiveCheckpoint] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(new Set())
  const [hasReachedEnd, setHasReachedEnd] = useState(false)
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false)
  const [videoDuration, setVideoDuration] = useState(training.video_duration || 0)
  const [checkpointQuestion, setCheckpointQuestion] = useState<any>(null)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const playerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(Date.now())
  const lastSaveTimeRef = useRef<number>(Date.now())
  const totalTimeSpentRef = useRef<number>(0)
  const completedCheckpointsRef = useRef<Set<number>>(new Set())

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get duration from video player when it loads
  useEffect(() => {
    if (playerRef.current) {
      const checkDuration = setInterval(() => {
        const duration = playerRef.current?.duration
        if (duration && duration > 0) {
          console.log('📹 Got video duration from player:', duration, 'seconds')
          setVideoDuration(duration)
          clearInterval(checkDuration)
        }
      }, 100)

      setTimeout(() => {
        if (training.chapters && training.chapters.length > 0 && (!videoDuration || videoDuration === 0)) {
          const maxEndTime = Math.max(...training.chapters.map((ch: any) => ch.end_time || 0))
          if (maxEndTime > 0) {
            console.log('⚠️ Using chapter end_time as fallback duration:', maxEndTime)
            setVideoDuration(maxEndTime)
            clearInterval(checkDuration)
          }
        }
      }, 5000)

      return () => clearInterval(checkDuration)
    }
  }, [training.chapters, videoDuration])

  // Checkpoint detection
  const checkpoints = training.chapters || []
  
  useEffect(() => {
    if (checkpoints.length === 0) return

    const currentCheckpoint = checkpoints.findIndex((chapter: any, index: number) => {
      const nextChapter = checkpoints[index + 1]
      return currentTime >= chapter.start_time && (!nextChapter || currentTime < nextChapter.start_time)
    })

    if (currentCheckpoint !== -1 && !completedCheckpoints.has(currentCheckpoint)) {
      setActiveCheckpoint(currentCheckpoint)
    }
  }, [currentTime, checkpoints, completedCheckpoints])

  // Progress tracking
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSpent = now - startTimeRef.current
      totalTimeSpentRef.current = timeSpent
      setTotalTimeSpent(timeSpent)

      // Save progress every 30 seconds
      if (now - lastSaveTimeRef.current > 30000) {
        saveProgress()
        lastSaveTimeRef.current = now
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused])

  const saveProgress = async () => {
    try {
      const response = await fetch(`/api/training/${training.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTime,
          totalTimeSpent: totalTimeSpentRef.current,
          completedCheckpoints: Array.from(completedCheckpointsRef.current),
        }),
      })

      if (!response.ok) {
        console.error('Failed to save progress')
      }
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const handleVideoEnd = () => {
    setHasReachedEnd(true)
    if (completedCheckpoints.size === checkpoints.length) {
      setShowCompletionOverlay(true)
    }
  }

  const handleAnswerSubmitted = async (answer: string) => {
    if (activeCheckpoint === null) return

    setIsLoadingQuestion(true)
    try {
      const response = await fetch('/api/training/evaluate-checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId: training.id,
          checkpointIndex: activeCheckpoint,
          answer,
        }),
      })

      const result = await response.json()
      
      if (result.isCorrect) {
        setCompletedCheckpoints(prev => {
          const newSet = new Set(prev)
          newSet.add(activeCheckpoint)
          completedCheckpointsRef.current = newSet
          return newSet
        })
        setActiveCheckpoint(null)
      } else {
        // Show feedback
        console.log('Incorrect answer:', result.feedback)
      }
    } catch (error) {
      console.error('Error evaluating checkpoint:', error)
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m ${seconds % 60}s`
  }

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Mobile Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 truncate">{training.title}</h1>
              {training.description && (
                <p className="text-sm text-gray-600 truncate mt-1">{training.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="text-center">
                <div className="text-xs text-gray-500">Progress</div>
                <div className="text-sm font-bold text-blue-600">
                  {videoDuration > 0 ? Math.round((currentTime / videoDuration) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Player */}
          <div className="flex-shrink-0 bg-black">
            <MobileVideoPlayer
              ref={playerRef}
              playbackId={training.mux_playback_id}
              title={training.title}
              onTimeUpdate={setCurrentTime}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
              onLoadedData={(duration) => {
                setIsLoading(false)
                setVideoDuration(duration)
              }}
              onEnded={handleVideoEnd}
              showChatToggle={true}
              isChatOpen={isChatOpen}
              onChatToggle={() => setIsChatOpen(!isChatOpen)}
              className="w-full"
            />
          </div>

          {/* Mobile Bottom Panel */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Toggle between Chapters and Chat */}
            <div className="flex border-b border-gray-200">
              <button
                className={cn(
                  'flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors',
                  !isChatOpen
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
                onClick={() => setIsChatOpen(false)}
              >
                Chapters
              </button>
              <button
                className={cn(
                  'flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors',
                  isChatOpen
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
                onClick={() => setIsChatOpen(true)}
              >
                AI Tutor
              </button>
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto">
              {!isChatOpen ? (
                /* Chapters Panel */
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    {training.chapters?.map((chapter: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors touch-manipulation',
                          completedCheckpoints.has(index)
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 hover:bg-gray-100'
                        )}
                        onClick={() => {
                          if (playerRef.current) {
                            playerRef.current.currentTime = chapter.start_time
                          }
                        }}
                      >
                        <div className="flex-shrink-0">
                          {completedCheckpoints.has(index) ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{chapter.title}</div>
                          <div className="text-xs text-gray-500">{formatTime(chapter.start_time)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Key Points */}
                  {training.key_points && training.key_points.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Points</h3>
                      <div className="space-y-2">
                        {training.key_points.map((point: string, index: number) => (
                          <div key={index} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            • {point}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Chat Panel */
                <div className="h-full">
                  <AITutorChat
                    trainingId={training.id}
                    trainingTitle={training.title}
                    sop={training.sop}
                    keyPoints={training.key_points}
                    transcript={training.transcript}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Checkpoint Overlay */}
        {activeCheckpoint !== null && training.chapters?.[activeCheckpoint] && (
          <CheckpointOverlay
            chapter={training.chapters[activeCheckpoint]}
            onClose={() => setActiveCheckpoint(null)}
            onAnswerSubmitted={handleAnswerSubmitted}
            checkpointQuestion={checkpointQuestion}
            isLoadingQuestion={isLoadingQuestion}
          />
        )}

        {/* Completion Overlay */}
        {showCompletionOverlay && (
          <CompletionOverlay
            trainingTitle={training.title}
            onClose={() => setShowCompletionOverlay(false)}
          />
        )}
      </div>
    )
  }

  // Desktop fallback - use original layout
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Desktop implementation would go here */}
      <div className="p-8 text-center text-gray-500">
        Desktop training player - use original EmployeeTrainingPlayer component
      </div>
    </div>
  )
}
