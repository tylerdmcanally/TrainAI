'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { Video, Mic, Square, Pause, Play, ArrowRight, ArrowLeft, Circle, Camera } from 'lucide-react'

interface RecordingStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
}

export function RecordingStep({ data, onUpdate, onNext, onBack }: RecordingStepProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle')
  const [elapsedTime, setElapsedTime] = useState(0)
  const [includeCamera, setIncludeCamera] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const elapsedTimeRef = useRef<number>(0) // Add ref to track elapsed time
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const cameraPreviewRef = useRef<HTMLVideoElement | null>(null)
  const displayStreamRef = useRef<MediaStream | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Composite screen and camera video onto canvas
  const startCompositing = (
    screenVideo: HTMLVideoElement,
    cameraVideo: HTMLVideoElement | null,
    canvas: HTMLCanvasElement
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawFrame = () => {
      // Draw screen video (full canvas)
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)

      // Draw camera video in bottom-right corner (if available)
      if (cameraVideo && cameraVideo.readyState === cameraVideo.HAVE_ENOUGH_DATA) {
        const cameraWidth = 240  // Width of camera overlay
        const cameraHeight = 180 // Height of camera overlay (4:3 ratio)
        const padding = 20       // Padding from edges

        const x = canvas.width - cameraWidth - padding
        const y = canvas.height - cameraHeight - padding

        // Draw rounded rectangle background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(x - 4, y - 4, cameraWidth + 8, cameraHeight + 8)

        // Draw camera feed
        ctx.drawImage(cameraVideo, x, y, cameraWidth, cameraHeight)

        // Draw border
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, cameraWidth, cameraHeight)
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame)
    }

    drawFrame()
  }

  // Timer effect
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const newValue = prev + 1
          elapsedTimeRef.current = newValue // Keep ref in sync
          return newValue
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [recordingState])

  // Video preview effect - runs when recording state changes and refs are available
  useEffect(() => {
    if ((recordingState === 'recording' || recordingState === 'paused') && streamRef.current) {
      if (videoPreviewRef.current && !videoPreviewRef.current.srcObject) {
        // If we're using canvas compositing, show the canvas stream
        // Otherwise show the display stream
        if (includeCamera && canvasRef.current) {
          const canvasStream = canvasRef.current.captureStream(30)
          videoPreviewRef.current.srcObject = canvasStream
        } else {
          videoPreviewRef.current.srcObject = displayStreamRef.current
        }
      }
    }
  }, [recordingState, includeCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Reset timer and chunks for new recording
      setElapsedTime(0)
      elapsedTimeRef.current = 0
      chunksRef.current = []

      // Get screen stream with cursor
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser' as any,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          cursor: 'always' as any,
        },
        audio: true,
        preferCurrentTab: false,
      })

      displayStreamRef.current = displayStream

      // Get microphone stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      // Get camera stream if enabled
      let cameraStream: MediaStream | null = null
      if (includeCamera) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
          })
          cameraStreamRef.current = cameraStream
        } catch (err) {
          console.error('Camera error:', err)
          alert('Could not access camera. Recording without camera.')
        }
      }

      // If camera is included, composite video streams using canvas
      let videoStream: MediaStream

      if (includeCamera && cameraStream) {
        // Create hidden video elements for source streams
        const screenVideo = document.createElement('video')
        screenVideo.srcObject = displayStream
        screenVideo.muted = true
        await screenVideo.play()

        const cameraVideo = document.createElement('video')
        cameraVideo.srcObject = cameraStream
        cameraVideo.muted = true
        await cameraVideo.play()

        // Create canvas for compositing
        const canvas = document.createElement('canvas')
        canvas.width = 1920
        canvas.height = 1080
        canvasRef.current = canvas

        // Start drawing both streams onto canvas
        startCompositing(screenVideo, cameraVideo, canvas)

        // Capture canvas as video stream
        const canvasStream = canvas.captureStream(30) // 30 fps
        videoStream = canvasStream
      } else {
        // No camera, just use screen stream directly
        videoStream = displayStream
      }

      // Combine video stream with audio
      const tracks = [
        ...videoStream.getVideoTracks(),
        ...displayStream.getAudioTracks(),
        ...audioStream.getAudioTracks(),
      ]

      const combinedStream = new MediaStream(tracks)
      streamRef.current = combinedStream

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const videoUrl = URL.createObjectURL(blob)
        onUpdate({ videoBlob: blob, videoDuration: elapsedTimeRef.current, videoUrl })

        // Stop all tracks and cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
        if (displayStreamRef.current) {
          displayStreamRef.current.getTracks().forEach(track => track.stop())
        }
        if (cameraStreamRef.current) {
          cameraStreamRef.current.getTracks().forEach(track => track.stop())
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000) // Capture every second

      setRecordingState('recording')
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Could not start recording. Please check permissions and try again.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setRecordingState('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setRecordingState('recording')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setRecordingState('stopped')
    }
  }

  const handleNext = () => {
    if (data.videoBlob) {
      onNext()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Your Training</CardTitle>
        <CardDescription>
          Record your screen and talk through the process naturally. The AI will transcribe everything.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Two-column layout: Preview + Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording Preview/Status */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg aspect-video relative overflow-hidden">
          {recordingState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Video className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg opacity-75">Ready to record</p>
              <p className="text-sm opacity-50 mt-2">Your screen will appear here</p>
            </div>
          )}

          {(recordingState === 'recording' || recordingState === 'paused') && (
            <>
              <video
                ref={videoPreviewRef}
                className="w-full h-full object-contain bg-black"
                autoPlay
                muted
                playsInline
              />

              {/* Recording indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full">
                {recordingState === 'recording' ? (
                  <Circle className="h-3 w-3 fill-current animate-pulse" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
                <span className="font-mono font-bold">{formatTime(elapsedTime)}</span>
                <span className="text-xs">{recordingState === 'paused' ? 'PAUSED' : 'REC'}</span>
              </div>
            </>
          )}

          {recordingState === 'stopped' && data.videoBlob && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-green-600/10">
              <div className="bg-green-600 rounded-full p-4 mb-4">
                <Square className="h-8 w-8" />
              </div>
              <p className="text-lg">Recording Complete!</p>
              <p className="text-sm opacity-75 mt-1">Duration: {formatTime(elapsedTime)}</p>
            </div>
          )}
            </div>

            {/* Camera Toggle (only show before recording) */}
            {recordingState === 'idle' && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg mt-4">
                <input
                  type="checkbox"
                  id="includeCamera"
                  checked={includeCamera}
                  onChange={(e) => setIncludeCamera(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="includeCamera" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Camera className="h-4 w-4" />
                  Include camera (picture-in-picture)
                </label>
              </div>
            )}
          </div>

          {/* Instructions Sidebar */}
          <div className="space-y-4">
            {recordingState === 'idle' && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Quick Tips
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Select:</strong> Browser tab or app window</li>
                    <li>• <strong>NOT this tab</strong> (causes loop)</li>
                    <li>• Your cursor will be captured</li>
                    <li>• Speak clearly</li>
                    {includeCamera && <li>• Camera: bottom-right</li>}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">📱 Recording Apps?</h4>
                  <div className="text-xs text-amber-900 space-y-2">
                    <p><strong>Apps not showing?</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li><strong>System Settings</strong> → <strong>Privacy</strong> → <strong>Screen Recording</strong></li>
                      <li>Enable your browser</li>
                      <li>Restart browser</li>
                    </ol>
                    <p className="mt-2 pt-2 border-t border-amber-200"><strong>OR use Entire Screen:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Move this tab away</li>
                      <li>Select "Entire Screen"</li>
                      <li>Switch to your app</li>
                    </ol>
                  </div>
                </div>
              </>
            )}

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ Recording Active</h4>
                <div className="text-sm text-green-800 space-y-2">
                  <p>Your screen and audio are being captured.</p>
                  <p className="font-mono text-lg">{formatTime(elapsedTime)}</p>
                  {recordingState === 'paused' && (
                    <p className="text-amber-800 font-medium">⏸ Paused - Click Resume</p>
                  )}
                </div>
              </div>
            )}

            {recordingState === 'stopped' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ Recording Complete!</h4>
                <p className="text-sm text-green-800">Click "Next" to process your training.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {recordingState === 'idle' && (
            <div className="lg:col-span-2 flex justify-center -mt-2">
              <Button size="lg" onClick={startRecording} className="gap-2">
                <Circle className="h-5 w-5 fill-current" />
                Start Recording
              </Button>
            </div>
          )}

          {recordingState === 'recording' && (
            <div className="lg:col-span-3 flex items-center justify-center gap-4">
              <Button size="lg" variant="outline" onClick={pauseRecording} className="gap-2">
                <Pause className="h-5 w-5" />
                Pause
              </Button>
              <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                <Square className="h-5 w-5" />
                Stop & Finish
              </Button>
            </div>
          )}

          {recordingState === 'paused' && (
            <div className="lg:col-span-3 flex items-center justify-center gap-4">
              <Button size="lg" onClick={resumeRecording} className="gap-2">
                <Play className="h-5 w-5" />
                Resume
              </Button>
              <Button size="lg" variant="destructive" onClick={stopRecording} className="gap-2">
                <Square className="h-5 w-5" />
                Stop & Finish
              </Button>
            </div>
          )}
        </div>


        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {recordingState === 'stopped' && data.videoBlob && (
            <Button size="lg" onClick={handleNext} className="gap-2">
              Next: Process Recording
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
