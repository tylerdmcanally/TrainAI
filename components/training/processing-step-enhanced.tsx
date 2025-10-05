'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { UploadProgressIndicator } from '@/components/ui/progress-indicator'
import { 
  createAppError, 
  getErrorMessage, 
  isRetryableError, 
  withRetry, 
  validateFileUpload,
  ERROR_CODES 
} from '@/lib/utils/error-handler'
import { useChunkedUpload } from '@/lib/utils/chunked-upload'

interface ProcessingStepEnhancedProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
}

type ProcessingStage = 'uploading' | 'transcribing' | 'generating' | 'uploading-mux' | 'complete' | 'error'

export function ProcessingStepEnhanced({ data, onUpdate, onNext }: ProcessingStepEnhancedProps) {
  const [stage, setStage] = useState<ProcessingStage>('uploading')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [stageTimes, setStageTimes] = useState<Record<string, number>>({})
  const { showError, showSuccess, showWarning } = useToastNotifications()

  // Chunked upload hook for video upload
  const { upload: uploadVideo, isUploading: isUploadingVideo, progress: uploadProgress } = useChunkedUpload({
    chunkSize: 2 * 1024 * 1024, // 2MB chunks for videos
    onProgress: (progress) => {
      if (stage === 'uploading') {
        setProgress(progress)
      }
    },
  })

  const processRecording = useCallback(async () => {
    setError(null)
    setIsRetrying(false)
    setRetryCount(0)
    setStageTimes({})

    try {
      if (!data.videoBlob) {
        throw createAppError('No video recording found. Please go back and record again.', {
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
          statusCode: 400,
        })
      }

      const videoFile = new File([data.videoBlob], `training-${Date.now()}.webm`, {
        type: 'video/webm'
      })

      // Step 1: Upload video to Supabase Storage (with chunked upload)
      const uploadStartTime = Date.now()
      setStage('uploading')
      setProgress(0)

      let videoStorageUrl: string | null = data.videoStorageUrl || null

      if (!videoStorageUrl) {
        await withRetry(async () => {
          validateFileUpload(videoFile, {
            maxSize: 100 * 1024 * 1024, // 100MB limit
            allowedTypes: ['video/webm', 'video/mp4'],
          })

          const result = await uploadVideo(videoFile, '/api/storage/upload', {
            fileName: videoFile.name,
            fileSize: videoFile.size,
            fileType: videoFile.type,
          })

          videoStorageUrl = result.url
          onUpdate({ videoStorageUrl })
          
          const uploadTime = Date.now() - uploadStartTime
          setStageTimes(prev => ({ ...prev, uploading: uploadTime }))
          showSuccess(`Video uploaded successfully! (${(uploadTime / 1000).toFixed(1)}s)`)
        }, {
          retries: 3,
          onRetry: (attempt, err) => {
            showWarning(`Video upload failed. Retrying attempt ${attempt}...`)
            setIsRetrying(true)
            setRetryCount(attempt)
          }
        })
      }
      setProgress(15)
      setIsRetrying(false)

      // Step 2: Transcribe audio
      const transcribeStartTime = Date.now()
      setStage('transcribing')
      setProgress(20)
      let transcript: string | null = data.transcript || null

      if (!transcript) {
        await withRetry(async () => {
          const transcribeFormData = new FormData()
          transcribeFormData.append('audio', videoFile, 'recording.webm')

          const transcribeResponse = await fetch('/api/training/transcribe', {
            method: 'POST',
            body: transcribeFormData,
          })

          if (!transcribeResponse.ok) {
            const errorData = await transcribeResponse.json()
            throw createAppError(errorData.error || 'Failed to transcribe audio', {
              code: errorData.code || ERROR_CODES.TRANSCRIPTION_FAILED,
              statusCode: transcribeResponse.status,
            })
          }

          const { transcript: newTranscript } = await transcribeResponse.json()
          transcript = newTranscript
          onUpdate({ transcript })
          
          const transcribeTime = Date.now() - transcribeStartTime
          setStageTimes(prev => ({ ...prev, transcribing: transcribeTime }))
          showSuccess('Audio transcribed successfully!')
        }, {
          retries: 3,
          onRetry: (attempt, err) => {
            showWarning(`Transcription failed. Retrying attempt ${attempt}...`)
            setIsRetrying(true)
            setRetryCount(attempt)
          }
        })
      }
      setProgress(50)
      setIsRetrying(false)

      // Step 3: Generate SOP, chapters, and key points
      const generateStartTime = Date.now()
      setStage('generating')
      setProgress(60)
      let chapters = data.chapters
      let sop = data.sop
      let keyPoints = data.keyPoints

      if (!chapters || !sop || !keyPoints || chapters.length === 0) {
        await withRetry(async () => {
          if (!transcript) {
            throw createAppError('Cannot generate SOP without a transcript.', {
              code: ERROR_CODES.MISSING_REQUIRED_FIELD,
              statusCode: 400,
            })
          }

          const sopResponse = await fetch('/api/training/generate-sop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              transcript,
              duration: data.videoDuration,
            }),
          })

          if (!sopResponse.ok) {
            const errorData = await sopResponse.json()
            throw createAppError(errorData.error || 'Failed to generate SOP', {
              code: errorData.code || ERROR_CODES.AI_GENERATION_FAILED,
              statusCode: sopResponse.status,
            })
          }

          const { chapters: newChapters, sop: newSop, keyPoints: newKeyPoints } = await sopResponse.json()
          chapters = newChapters
          sop = newSop
          keyPoints = newKeyPoints
          onUpdate({ chapters, sop, keyPoints })
          
          const generateTime = Date.now() - generateStartTime
          setStageTimes(prev => ({ ...prev, generating: generateTime }))
          showSuccess('AI content generated successfully!')
        }, {
          retries: 3,
          onRetry: (attempt, err) => {
            showWarning(`AI generation failed. Retrying attempt ${attempt}...`)
            setIsRetrying(true)
            setRetryCount(attempt)
          }
        })
      }
      setProgress(75)
      setIsRetrying(false)

      // Step 4: Upload to Mux (only if credentials are configured)
      const muxStartTime = Date.now()
      setStage('uploading-mux')
      setProgress(80)
      let muxPlaybackId: string | null = data.muxPlaybackId || null
      let muxAssetId: string | null = data.muxAssetId || null

      if (!muxPlaybackId && videoStorageUrl) {
        try {
          await withRetry(async () => {
            const muxResponse = await fetch('/api/mux/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoUrl: videoStorageUrl }),
            })

            if (!muxResponse.ok) {
              const errorData = await muxResponse.json()
              throw createAppError(errorData.error || 'Failed to upload to Mux', {
                code: errorData.code || ERROR_CODES.MUX_UPLOAD_FAILED,
                statusCode: muxResponse.status,
              })
            }

            const { playbackId, assetId } = await muxResponse.json()
            muxPlaybackId = playbackId
            muxAssetId = assetId
            onUpdate({ muxPlaybackId, muxAssetId })
            
            const muxTime = Date.now() - muxStartTime
            setStageTimes(prev => ({ ...prev, mux: muxTime }))
            showSuccess('Video uploaded to Mux successfully!')
          }, {
            retries: 2, // Mux uploads can be flaky, but not infinitely retryable
            onRetry: (attempt, err) => {
              showWarning(`Mux upload failed. Retrying attempt ${attempt}...`)
              setIsRetrying(true)
              setRetryCount(attempt)
            }
          })
        } catch (muxError) {
          // If Mux upload fails after retries, it's not critical for MVP, just log and continue
          showError(getErrorMessage(muxError))
          console.warn('Mux upload skipped or failed after retries:', muxError)
          // Do not re-throw, allow the process to continue without Mux IDs
        }
      }
      setProgress(95)
      setIsRetrying(false)

      setProgress(100)
      setStage('complete')
      showSuccess('Training processing complete!')

      // Auto-advance after a brief pause
      setTimeout(() => {
        onNext()
      }, 1500)

    } catch (err: any) {
      const appError = createAppError(err)
      setError(getErrorMessage(appError))
      setStage('error')
      showError(getErrorMessage(appError))
      console.error('Processing error:', appError)
    }
  }, [data, onUpdate, onNext, showError, showSuccess, showWarning, uploadVideo])

  useEffect(() => {
    processRecording()
  }, [processRecording])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Your Training</CardTitle>
        <CardDescription>
          Please wait while our AI processes your recording. This may take a few moments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <UploadProgressIndicator
          progress={progress}
          stage={stage}
          error={error || undefined}
        />

        {/* Retry indicator */}
        {isRetrying && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              ⚠️ Retrying... (Attempt {retryCount})
            </p>
          </div>
        )}

        {/* Error handling */}
        {error && (
          <div className="bg-red-100 border border-red-200 text-red-800 p-4 rounded-lg">
            <p className="font-medium">{error}</p>
            {isRetryableError(createAppError(error)) && (
              <Button onClick={processRecording} className="mt-3" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            )}
          </div>
        )}

        {/* Stage timing information */}
        {Object.keys(stageTimes).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Times:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {Object.entries(stageTimes).map(([stageName, time]) => (
                <div key={stageName} className="flex justify-between">
                  <span className="capitalize">{stageName}:</span>
                  <span className="font-mono">
                    {time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="gap-2" 
            disabled={stage === 'uploading' || stage === 'transcribing' || stage === 'generating' || stage === 'uploading-mux'}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button 
            onClick={onNext} 
            className="gap-2" 
            disabled={stage !== 'complete'}
          >
            Next: Review & Edit
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
