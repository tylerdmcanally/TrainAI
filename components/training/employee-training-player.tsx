'use client'

import { useState, useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { AITutorChat } from './ai-tutor-chat'
import { CheckpointOverlay } from './checkpoint-overlay'
import { CompletionOverlay } from './completion-overlay'

interface EmployeeTrainingPlayerProps {
  training: any
}

export function EmployeeTrainingPlayer({ training }: EmployeeTrainingPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [activeCheckpoint, setActiveCheckpoint] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [totalTimeSpent, setTotalTimeSpent] = useState(0)
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<number>>(new Set())
  const [isPlayingIntro, setIsPlayingIntro] = useState(false)
  const [hasReachedEnd, setHasReachedEnd] = useState(false)
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false)
  const [videoDuration, setVideoDuration] = useState(training.video_duration || 0)
  const playerRef = useRef<any>(null)
  const startTimeRef = useRef<number>(Date.now())
  const lastSaveTimeRef = useRef<number>(Date.now())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const totalTimeSpentRef = useRef<number>(0)
  const completedCheckpointsRef = useRef<Set<number>>(new Set())

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

      // Timeout after 5 seconds - fallback to chapters' max end_time if available
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
  }, [])

  // Calculate checkpoints - trigger before each new chapter starts
  // Place checkpoint 3 seconds before chapter ends (before next chapter)
  const checkpoints = training.chapters
    ?.map((chapter: any, index: number) => {
      const isLastChapter = index === training.chapters.length - 1

      // For last chapter, trigger 3 seconds before video end
      // For other chapters, trigger 3 seconds before chapter end
      const triggerTime = isLastChapter
        ? Math.max(0, videoDuration - 3)
        : Math.max(0, chapter.end_time - 3)

      return {
        time: triggerTime,
        chapterIndex: index,
        chapterTitle: chapter.title,
        isLast: isLastChapter,
      }
    })
    .filter((checkpoint: any) => {
      return checkpoint.time > 0 && checkpoint.time < videoDuration
    }) || []

  console.log('📍 Checkpoints configured:', checkpoints, 'Duration:', videoDuration)
  console.log('📊 Chapters data:', training.chapters?.map((ch: any) => ({ title: ch.title, start: ch.start_time, end: ch.end_time })))

  // Load existing progress
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/training/get-progress?trainingId=${training.id}`)
        if (response.ok) {
          const progress = await response.json()

          if (progress) {
            // Restore completed checkpoints
            const completedSet = new Set(progress.completed_checkpoints || [])
            setCompletedCheckpoints(completedSet)
            completedCheckpointsRef.current = completedSet

            // Restore time spent
            if (progress.time_spent) {
              setTotalTimeSpent(progress.time_spent)
              totalTimeSpentRef.current = progress.time_spent
            }
          }
        }
      } catch (error) {
        console.error('Failed to load progress:', error)
      } finally {
        setIsLoading(false)
        startTimeRef.current = Date.now() // Reset start time after loading
      }
    }

    loadProgress()
  }, [training.id])

  // Save progress periodically
  useEffect(() => {
    if (isLoading) return

    const saveProgress = async () => {
      if (!playerRef.current) return

      const now = Date.now()
      const timeElapsed = Math.floor((now - startTimeRef.current) / 1000)
      const newTotalTime = totalTimeSpentRef.current + timeElapsed

      // Reset start time for next interval
      startTimeRef.current = now

      try {
        await fetch('/api/training/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainingId: training.id,
            currentPosition: Math.floor(playerRef.current.currentTime || 0),
            completedCheckpoints: Array.from(completedCheckpointsRef.current),
            timeSpent: newTotalTime,
          }),
        })

        totalTimeSpentRef.current = newTotalTime
        setTotalTimeSpent(newTotalTime)
        lastSaveTimeRef.current = now
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
    }

    // Save every 10 seconds
    const interval = setInterval(saveProgress, 10000)

    // Save on unmount
    return () => {
      clearInterval(interval)
      saveProgress()
    }
  }, [training.id, isLoading])

  // Play AI voice intro for checkpoint
  const playCheckpointIntro = async (checkpointIndex: number) => {
    const chapter = training.chapters[checkpointIndex]
    const introText = `Let's pause here to check your understanding of ${chapter.title}.`

    setIsPlayingIntro(true)

    try {
      const response = await fetch('/api/training/checkpoint-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: introText }),
      })

      const { audio } = await response.json()

      // Play the intro audio
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audioElement = new Audio(`data:audio/mp3;base64,${audio}`)
      audioRef.current = audioElement

      audioElement.onended = () => {
        setIsPlayingIntro(false)
        setActiveCheckpoint(checkpointIndex) // Show quiz after voice finishes
      }

      audioElement.play()
    } catch (error) {
      console.error('Failed to play intro:', error)
      setIsPlayingIntro(false)
      setActiveCheckpoint(checkpointIndex) // Show quiz anyway
    }
  }

  // Monitor video time and trigger checkpoints
  useEffect(() => {
    if (isLoading) {
      console.log('⏳ Still loading, skipping checkpoint monitoring')
      return
    }

    if (checkpoints.length === 0) {
      console.log('⚠️ No checkpoints configured!')
    }

    const interval = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.currentTime || 0
        setCurrentTime(time)

        // Check if user has reached the end (within 5 seconds)
        if (videoDuration > 0 && time >= videoDuration - 5 && !hasReachedEnd) {
          setHasReachedEnd(true)
          console.log('✅ User reached end of video')
        }

        // Check if we've crossed a checkpoint time
        checkpoints.forEach((checkpoint: any, index: number) => {
          // Trigger if we're at or past the checkpoint time and haven't completed it
          if (
            time >= checkpoint.time &&
            !completedCheckpointsRef.current.has(index) &&
            activeCheckpoint === null && // Not already showing a checkpoint
            !isPaused &&
            !isPlayingIntro
          ) {
            console.log('🎯 CHECKPOINT TRIGGERED:', checkpoint.chapterTitle, 'at time', time, '(trigger time:', checkpoint.time + ')')
            playerRef.current.pause()
            setIsPaused(true)
            playCheckpointIntro(index)
          }
        })
      }
    }, 500) // Check twice per second for accuracy

    return () => clearInterval(interval)
  }, [checkpoints, activeCheckpoint, isPaused, isLoading, isPlayingIntro, hasReachedEnd, videoDuration])

  // Check if training is complete
  useEffect(() => {
    if (
      hasReachedEnd &&
      checkpoints.length > 0 &&
      completedCheckpoints.size === checkpoints.length &&
      !showCompletionOverlay &&
      activeCheckpoint === null
    ) {
      console.log('🎊 Training complete! All checkpoints passed and video finished')
      // Pause the video
      if (playerRef.current) {
        playerRef.current.pause()
      }
      // Show completion overlay
      setShowCompletionOverlay(true)
    }
  }, [hasReachedEnd, completedCheckpoints.size, checkpoints.length, showCompletionOverlay, activeCheckpoint])

  const handleCheckpointAnswer = async (answer: string) => {
    // Call AI to evaluate the answer
    const response = await fetch('/api/training/evaluate-checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trainingId: training.id,
        chapterIndex: activeCheckpoint,
        question: getCheckpointQuestion(activeCheckpoint!),
        answer,
        context: {
          sop: training.sop,
          keyPoints: training.key_points,
          transcript: training.transcript,
        },
      }),
    })

    const result = await response.json()
    return result
  }

  const handleContinueAfterCheckpoint = async () => {
    if (activeCheckpoint !== null) {
      // Add checkpoint to completed set
      const newCompleted = new Set(completedCheckpointsRef.current)
      newCompleted.add(activeCheckpoint)
      setCompletedCheckpoints(newCompleted)
      completedCheckpointsRef.current = newCompleted

      setActiveCheckpoint(null)
      setIsPaused(false)

      // Save progress immediately after completing checkpoint
      try {
        const now = Date.now()
        const timeElapsed = Math.floor((now - startTimeRef.current) / 1000)
        const newTotalTime = totalTimeSpentRef.current + timeElapsed

        await fetch('/api/training/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trainingId: training.id,
            currentPosition: Math.floor(playerRef.current?.currentTime || 0),
            completedCheckpoints: Array.from(newCompleted),
            timeSpent: newTotalTime,
          }),
        })

        totalTimeSpentRef.current = newTotalTime
        setTotalTimeSpent(newTotalTime)
        startTimeRef.current = now
      } catch (error) {
        console.error('Failed to save checkpoint progress:', error)
      }

      playerRef.current?.play()
    }
  }

  const getCheckpointQuestion = (checkpointIndex: number) => {
    const chapter = training.chapters[checkpointIndex]
    // Use chapter-specific question if available, otherwise use generic
    return chapter?.quiz_question || `What are the key takeaways from "${chapter?.title}"?`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{training.title}</h1>
            {training.description && (
              <p className="text-gray-600 mt-1">{training.description}</p>
            )}
          </div>
          {/* Progress Indicator */}
          <div className="flex items-center gap-6 ml-6">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Checkpoints</div>
              <div className="text-lg font-bold text-gray-900">
                {completedCheckpoints.size} / {checkpoints.length}
              </div>
            </div>
            <div className="h-12 w-px bg-gray-300" />
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Video Progress</div>
              <div className="flex items-center gap-2">
                <div className="text-lg font-bold text-blue-600">
                  {videoDuration > 0
                    ? Math.round((currentTime / videoDuration) * 100)
                    : 0}%
                </div>
                {hasReachedEnd && completedCheckpoints.size === checkpoints.length && (
                  <span className="text-green-600 text-sm font-semibold">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Video + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Player Section */}
        <div className="flex-[2] p-8 overflow-y-auto bg-gray-50 relative">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Video */}
            <div className="relative">
              {training.mux_playback_id ? (
                <>
                  <MuxPlayer
                    ref={playerRef}
                    streamType="on-demand"
                    playbackId={training.mux_playback_id}
                    metadata={{
                      video_title: training.title,
                    }}
                    className="w-full aspect-video rounded-lg overflow-hidden"
                    accentColor="#2563eb"
                  />
                  {/* Checkpoint Markers on Video Timeline */}
                  <div className="absolute bottom-12 left-0 right-0 h-1 pointer-events-none px-2">
                    {checkpoints.map((checkpoint: any, index: number) => {
                      const percentage = videoDuration > 0
                        ? (checkpoint.time / videoDuration) * 100
                        : 0
                      const isCompleted = completedCheckpoints.has(index)
                      return (
                        <div
                          key={index}
                          className={`absolute top-0 w-1.5 h-4 transform -translate-x-1/2 rounded-full shadow-lg ${
                            isCompleted
                              ? 'bg-green-500'
                              : 'bg-yellow-400'
                          }`}
                          style={{ left: `${percentage}%` }}
                          title={`Checkpoint ${index + 1}: ${checkpoint.chapterTitle}`}
                        />
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <p className="text-white">Video not available</p>
                </div>
              )}

              {/* Checkpoint Overlay */}
              {activeCheckpoint !== null && (
                <CheckpointOverlay
                  question={getCheckpointQuestion(activeCheckpoint)}
                  onAnswer={handleCheckpointAnswer}
                  onContinue={handleContinueAfterCheckpoint}
                />
              )}

              {/* Completion Overlay */}
              {showCompletionOverlay && (
                <CompletionOverlay
                  trainingTitle={training.title}
                  trainingId={training.id}
                  checkpointsCompleted={completedCheckpoints.size}
                  totalCheckpoints={checkpoints.length}
                />
              )}
            </div>

            {/* Chapters */}
            {training.chapters && training.chapters.length > 0 && (
              <div className="bg-white rounded-lg p-6 border">
                <h3 className="font-semibold text-lg mb-4">Chapters</h3>
                <div className="space-y-2">
                  {training.chapters.map((chapter: any, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                        currentTime >= chapter.start_time && currentTime < chapter.end_time
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.currentTime = chapter.start_time
                        }
                      }}
                    >
                      <span className="text-sm font-mono text-gray-600 w-16">
                        {formatTime(chapter.start_time)}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-900">
                        {chapter.title}
                      </span>
                      {completedCheckpoints.has(index) && (
                        <span className="text-xs text-green-600 font-medium">✓ Completed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Tutor Chat Section */}
        <div className="flex-1 border-l bg-white">
          <AITutorChat
            trainingId={training.id}
            trainingTitle={training.title}
            sop={training.sop}
            keyPoints={training.key_points}
            transcript={training.transcript}
          />
        </div>
      </div>
    </div>
  )
}
