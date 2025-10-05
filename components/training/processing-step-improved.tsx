'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { Loader2, CheckCircle2, FileText, Brain, Clock, AlertTriangle, RefreshCw, Upload } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { 
  createAppError, 
  getErrorMessage, 
  isRetryableError, 
  withRetry, 
  validateFileUpload,
  ERROR_CODES 
} from '@/lib/utils/error-handler'

interface ProcessingStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
}

type ProcessingStage = 'uploading' | 'transcribing' | 'generating' | 'uploading-mux' | 'complete' | 'error'

export function ProcessingStep({ data, onUpdate, onNext, onBack }: ProcessingStepProps) {
  const [stage, setStage] = useState<ProcessingStage>('transcribing')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>('')
  const { showError, showSuccess, showWarning } = useToastNotifications()

  useEffect(() => {
    processRecording()
  }, [])

  const processRecording = useCallback(async () => {
    try {
      setError(null)
      setRetryCount(0)

      // Validate input data
      if (!data.videoBlob) {
        throw createAppError('No video recording found', {
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
          statusCode: 400,
        })
      }

      // Validate file size and type
      validateFileUpload(data.videoBlob as File, {
        maxSize: 500 * 1024 * 1024, // 500MB
        allowedTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
      })

      await processWithRetry()
      
    } catch (err) {
      const appError = createAppError(err)
      const errorMessage = getErrorMessage(appError)
      
      console.error('Processing error:', appError)
      setError(errorMessage)
      setStage('error')
      showError('Processing Failed', errorMessage)
    }
  }, [data.videoBlob, data.title, data.videoDuration, onUpdate, showError])

  const processWithRetry = useCallback(async () => {
    await withRetry(
      async () => {
        // Step 1: Upload video to Supabase Storage
        setStage('uploading')
        setProgress(5)
        setCurrentStep('Uploading video to secure storage...')

        const videoFile = new File([data.videoBlob!], `training-${Date.now()}.webm`, {
          type: 'video/webm'
        })

        const formData = new FormData()
        formData.append('video', videoFile)

        const uploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw createAppError(errorData.error || 'Failed to upload video', {
            code: ERROR_CODES.UPLOAD_FAILED,
            statusCode: uploadResponse.status,
            isRetryable: uploadResponse.status >= 500,
          })
        }

        const { url: videoStorageUrl } = await uploadResponse.json()
        onUpdate({ videoStorageUrl })
        setProgress(15)

        // Step 2: Transcribe audio
        setStage('transcribing')
        setProgress(20)
        setCurrentStep('Transcribing audio using AI...')

        const transcribeFormData = new FormData()
        transcribeFormData.append('audio', data.videoBlob!, 'recording.webm')
        setProgress(30)

        const transcribeResponse = await fetch('/api/training/transcribe', {
          method: 'POST',
          body: transcribeFormData,
        })

        if (!transcribeResponse.ok) {
          const errorData = await transcribeResponse.json().catch(() => ({}))
          throw createAppError(errorData.error || 'Failed to transcribe audio', {
            code: ERROR_CODES.TRANSCRIPTION_FAILED,
            statusCode: transcribeResponse.status,
            isRetryable: transcribeResponse.status >= 500,
          })
        }

        const { transcript } = await transcribeResponse.json()
        onUpdate({ transcript })
        setProgress(50)

        // Step 3: Generate SOP, chapters, and key points
        setStage('generating')
        setProgress(60)
        setCurrentStep('Generating training documentation...')

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
          const errorData = await sopResponse.json().catch(() => ({}))
          throw createAppError(errorData.error || 'Failed to generate SOP', {
            code: ERROR_CODES.AI_GENERATION_FAILED,
            statusCode: sopResponse.status,
            isRetryable: sopResponse.status >= 500,
          })
        }

        const { chapters, sop, keyPoints } = await sopResponse.json()
        onUpdate({ chapters, sop, keyPoints })
        setProgress(75)

        // Step 4: Upload to Mux (optional, non-blocking)
        await uploadToMux(videoStorageUrl)

        setProgress(100)
        setStage('complete')
        setCurrentStep('Processing complete!')
        showSuccess('Processing Complete', 'Your training has been processed successfully!')

        // Auto-advance after a brief pause
        setTimeout(() => {
          onNext()
        }, 1500)
      },
      {
        maxRetries: 3,
        initialDelay: 2000,
        maxDelay: 10000,
      }
    )
  }, [data, onUpdate, onNext, showSuccess])

  const uploadToMux = useCallback(async (videoStorageUrl: string) => {
    setStage('uploading-mux')
    setProgress(80)
    setCurrentStep('Setting up video streaming...')

    try {
      const muxResponse = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoStorageUrl }),
      })

      if (muxResponse.ok) {
        const { playbackId, assetId } = await muxResponse.json()
        onUpdate({ muxPlaybackId: playbackId, muxAssetId: assetId })
        setProgress(95)
      } else if (muxResponse.status === 402) {
        // Mux plan limit reached - show warning but continue
        const { error: muxError } = await muxResponse.json()
        showWarning('Video Storage Limit', muxError || 'Mux upload limit reached. Video will be stored locally.')
        setProgress(95)
      } else {
        // Other Mux errors - continue without it
        console.warn('Mux upload skipped:', muxResponse.status)
        setProgress(95)
      }
    } catch (muxError) {
      // Non-critical error - continue without Mux
      console.warn('Mux upload error:', muxError)
      setProgress(95)
    }
  }, [onUpdate, showWarning])

  const handleRetry = useCallback(async () => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)
    
    try {
      await processWithRetry()
    } finally {
      setIsRetrying(false)
    }
  }, [processWithRetry])

  const getStageIcon = () => {
    switch (stage) {
      case 'uploading':
        return <Upload className="h-6 w-6" />
      case 'transcribing':
        return <FileText className="h-6 w-6" />
      case 'generating':
        return <Brain className="h-6 w-6" />
      case 'uploading-mux':
        return <Clock className="h-6 w-6" />
      case 'complete':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'error':
        return <AlertTriangle className="h-6 w-6 text-red-600" />
      default:
        return <Loader2 className="h-6 w-6 animate-spin" />
    }
  }

  const getStageTitle = () => {
    switch (stage) {
      case 'uploading':
        return 'Uploading Video'
      case 'transcribing':
        return 'Transcribing Audio'
      case 'generating':
        return 'Generating Content'
      case 'uploading-mux':
        return 'Setting Up Streaming'
      case 'complete':
        return 'Processing Complete'
      case 'error':
        return 'Processing Failed'
      default:
        return 'Processing'
    }
  }

  const getStageDescription = () => {
    switch (stage) {
      case 'uploading':
        return 'Securely uploading your video to our servers...'
      case 'transcribing':
        return 'Converting your speech to text using advanced AI...'
      case 'generating':
        return 'Creating training documentation and chapters...'
      case 'uploading-mux':
        return 'Setting up video streaming for optimal playback...'
      case 'complete':
        return 'Your training is ready! Redirecting to review...'
      case 'error':
        return 'Something went wrong. You can retry or go back.'
      default:
        return 'Processing your training content...'
    }
  }

  if (stage === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Processing Failed
          </CardTitle>
          <CardDescription>
            We encountered an error while processing your training.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mt-2">
                Retry attempt: {retryCount}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
            <Button 
              onClick={onBack} 
              variant="outline"
              className="flex-1"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStageIcon()}
          {getStageTitle()}
        </CardTitle>
        <CardDescription>
          {getStageDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="text-gray-900 font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {currentStep && (
            <p className="text-sm text-gray-600">{currentStep}</p>
          )}
        </div>

        {/* Processing Steps */}
        <div className="space-y-3">
          {[
            { key: 'uploading', label: 'Upload Video', icon: Upload },
            { key: 'transcribing', label: 'Transcribe Audio', icon: FileText },
            { key: 'generating', label: 'Generate Content', icon: Brain },
            { key: 'uploading-mux', label: 'Setup Streaming', icon: Clock },
          ].map((step, index) => {
            const Icon = step.icon
            const isActive = stage === step.key
            const isCompleted = ['uploading', 'transcribing', 'generating', 'uploading-mux'].indexOf(stage) > index
            const isCurrentStep = stage === step.key

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isCurrentStep 
                    ? 'bg-blue-50 border border-blue-200' 
                    : isCompleted 
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 ${
                  isCompleted 
                    ? 'text-green-600' 
                    : isCurrentStep 
                      ? 'text-blue-600' 
                      : 'text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isCurrentStep ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isCompleted || isCurrentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {stage === 'complete' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">
                Processing completed successfully!
              </p>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Redirecting to review your training...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
