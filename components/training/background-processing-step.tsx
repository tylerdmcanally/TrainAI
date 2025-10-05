// components/training/background-processing-step.tsx
// Enhanced processing step with background job support

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Brain, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Mic,
  ArrowLeft, 
  ArrowRight,
  XCircle,
  Play
} from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { useJobStatus } from '@/lib/hooks/use-job-status'
import { backgroundJobService, createTranscriptionJob, createSOPGenerationJob, createMuxUploadJob } from '@/lib/services/background-jobs'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { uploadFileInChunks } from '@/lib/utils/chunked-upload'
import {
  createAppError,
  getErrorMessage,
  validateFileUpload,
  ERROR_CODES
} from '@/lib/utils/error-handler'

interface BackgroundProcessingStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
  user: { id: string; company_id: string }
}

type ProcessingStage = 'uploading' | 'transcription' | 'generation' | 'mux_upload' | 'complete' | 'error'

interface JobState {
  transcriptionJobId: string | null
  sopJobId: string | null
  muxJobId: string | null
}

export function BackgroundProcessingStep({ data, onUpdate, onNext, onBack, user }: BackgroundProcessingStepProps) {
  const [stage, setStage] = useState<ProcessingStage>('uploading')
  const [jobs, setJobs] = useState<JobState>({
    transcriptionJobId: null,
    sopJobId: null,
    muxJobId: null
  })
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { showError, showSuccess, showWarning } = useToastNotifications()

  // Job status monitoring
  const transcriptionJob = useJobStatus({
    jobId: jobs.transcriptionJobId,
    pollingInterval: 1000, // Poll every second for real-time updates
    autoRefresh: true
  })

  const sopJob = useJobStatus({
    jobId: jobs.sopJobId,
    pollingInterval: 1000,
    autoRefresh: true
  })

  const muxJob = useJobStatus({
    jobId: jobs.muxJobId,
    pollingInterval: 2000, // Poll less frequently for Mux
    autoRefresh: true
  })

  const processRecording = useCallback(async () => {
    setError(null)
    setIsRetrying(false)

    try {
      if (!data.videoBlob) {
        throw createAppError('No video recording found. Please go back and record again.', {
          code: ERROR_CODES.MISSING_REQUIRED_FIELD,
          statusCode: 400,
        })
      }

      // Step 1: Upload video to Supabase Storage (using chunked upload)
      setStage('uploading')
      setUploadProgress(0)

      const videoFile = new File([data.videoBlob], `training-${Date.now()}.webm`, {
        type: 'video/webm'
      })

      let videoStorageUrl: string | null = data.videoStorageUrl || null

      if (!videoStorageUrl) {
        validateFileUpload(videoFile, {
          maxSize: 500 * 1024 * 1024, // 500MB limit
          allowedTypes: ['video/webm', 'video/mp4'],
        })

        const { url, path } = await uploadFileInChunks(videoFile, {
          onProgress: (progress) => {
            setUploadProgress(progress)
          },
          maxRetries: 3,
        })
        videoStorageUrl = url
        onUpdate({ videoStorageUrl })
        showSuccess('Video uploaded to storage successfully!')
      }

      setUploadProgress(100)

      // Step 2: Create transcription job
      setStage('transcription')
      const transcriptionJobId = await createTranscriptionJob(
        user.id,
        user.company_id,
        videoStorageUrl,
        data.id
      )
      setJobs(prev => ({ ...prev, transcriptionJobId }))
      showSuccess('Transcription job started!')

    } catch (err: any) {
      const appError = createAppError(err)
      setError(getErrorMessage(appError))
      setStage('error')
      showError(getErrorMessage(appError))
      console.error('Processing error:', appError)
    }
  }, [data, onUpdate, onNext, user, showError, showSuccess, showWarning])

  // Monitor transcription job completion
  useEffect(() => {
    if (transcriptionJob.isCompleted && transcriptionJob.outputData) {
      const { transcript } = transcriptionJob.outputData as { transcript: string }
      onUpdate({ transcript })
      
      // Start SOP generation job
      if (data.title && transcript && data.videoDuration) {
        setStage('generation')
        createSOPGenerationJob(
          user.id,
          user.company_id,
          data.title,
          transcript,
          data.videoDuration,
          data.id
        ).then(sopJobId => {
          setJobs(prev => ({ ...prev, sopJobId }))
          showSuccess('AI content generation started!')
        }).catch(err => {
          console.error('Failed to create SOP generation job:', err)
          showError('Failed to start AI content generation')
        })
      }
    }
  }, [transcriptionJob.isCompleted, transcriptionJob.outputData, data.title, data.videoDuration, data.id, user.id, user.company_id, onUpdate, showSuccess, showError])

  // Monitor SOP generation job completion
  useEffect(() => {
    if (sopJob.isCompleted && sopJob.outputData) {
      const { chapters, sop, keyPoints } = sopJob.outputData as {
        chapters: any[]
        sop: string
        keyPoints: string[]
      }
      onUpdate({ chapters, sop, keyPoints })
      
      // Start Mux upload job (optional)
      if (data.videoStorageUrl) {
        setStage('mux_upload')
        createMuxUploadJob(
          user.id,
          user.company_id,
          data.videoStorageUrl,
          data.id
        ).then(muxJobId => {
          setJobs(prev => ({ ...prev, muxJobId }))
          showSuccess('Video streaming setup started!')
        }).catch(err => {
          console.error('Failed to create Mux upload job:', err)
          // Mux upload is optional, continue without it
          setStage('complete')
          showSuccess('Training processing complete!')
        })
      } else {
        setStage('complete')
        showSuccess('Training processing complete!')
      }
    }
  }, [sopJob.isCompleted, sopJob.outputData, data.videoStorageUrl, data.id, user.id, user.company_id, onUpdate, showSuccess])

  // Monitor Mux upload job completion
  useEffect(() => {
    if (muxJob.isCompleted && muxJob.outputData) {
      const { playbackId, assetId } = muxJob.outputData as {
        playbackId: string
        assetId: string
      }
      onUpdate({ muxPlaybackId: playbackId, muxAssetId: assetId })
      setStage('complete')
      showSuccess('Training processing complete!')
    }
  }, [muxJob.isCompleted, muxJob.outputData, onUpdate, showSuccess])

  // Handle job failures
  useEffect(() => {
    if (transcriptionJob.isFailed || sopJob.isFailed || muxJob.isFailed) {
      const failedJob = transcriptionJob.isFailed ? 'transcription' : 
                       sopJob.isFailed ? 'AI content generation' : 'video upload'
      setError(`${failedJob} failed. Please try again.`)
      setStage('error')
      showError(`${failedJob} failed. Please try again.`)
    }
  }, [transcriptionJob.isFailed, sopJob.isFailed, muxJob.isFailed, showError])

  // Auto-advance when complete
  useEffect(() => {
    if (stage === 'complete') {
      const timer = setTimeout(() => {
        onNext()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [stage, onNext])

  const getStageIcon = (currentStage: ProcessingStage) => {
    switch (currentStage) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'transcription':
        return transcriptionJob.isProcessing ? 
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> :
          <Mic className="h-5 w-5 text-blue-500" />
      case 'generation':
        return sopJob.isProcessing ? 
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> :
          <Brain className="h-5 w-5 text-blue-500" />
      case 'mux_upload':
        return muxJob.isProcessing ? 
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> :
          <Clock className="h-5 w-5 text-blue-500" />
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
    }
  }

  const getStageMessage = (currentStage: ProcessingStage) => {
    switch (currentStage) {
      case 'uploading':
        return `Uploading video to secure storage... ${Math.round(uploadProgress)}%`
      case 'transcription':
        if (transcriptionJob.isProcessing) {
          return `Transcribing audio... ${transcriptionJob.progress}%`
        }
        return 'Starting transcription...'
      case 'generation':
        if (sopJob.isProcessing) {
          return `Generating AI content... ${sopJob.progress}%`
        }
        return 'Starting AI content generation...'
      case 'mux_upload':
        if (muxJob.isProcessing) {
          return `Setting up video streaming... ${muxJob.progress}%`
        }
        return 'Starting video streaming setup...'
      case 'complete':
        return 'Processing complete!'
      case 'error':
        return 'An error occurred during processing.'
      default:
        return 'Starting processing...'
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    setJobs({
      transcriptionJobId: null,
      sopJobId: null,
      muxJobId: null
    })
    setError(null)
    await processRecording()
    setIsRetrying(false)
  }

  const handleCancel = async () => {
    // Cancel all active jobs
    const cancelPromises = []
    if (jobs.transcriptionJobId) cancelPromises.push(backgroundJobService.cancelJob(jobs.transcriptionJobId))
    if (jobs.sopJobId) cancelPromises.push(backgroundJobService.cancelJob(jobs.sopJobId))
    if (jobs.muxJobId) cancelPromises.push(backgroundJobService.cancelJob(jobs.muxJobId))
    
    await Promise.all(cancelPromises)
    onBack()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Your Training</CardTitle>
        <CardDescription>
          Your training is being processed in the background. You can close this tab and come back later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              {getStageIcon(stage)}
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
            {getStageMessage(stage)}
          </h3>

          {/* Progress indicators for each stage */}
          {stage === 'uploading' && (
            <ProgressIndicator
              progress={uploadProgress}
              message="Uploading video..."
              status="loading"
              className="mt-4"
            />
          )}

          {stage === 'transcription' && transcriptionJob.isProcessing && (
            <ProgressIndicator
              progress={transcriptionJob.progress}
              message={transcriptionJob.job?.progress_message || "Transcribing audio..."}
              status="loading"
              className="mt-4"
            />
          )}

          {stage === 'generation' && sopJob.isProcessing && (
            <ProgressIndicator
              progress={sopJob.progress}
              message={sopJob.job?.progress_message || "Generating AI content..."}
              status="loading"
              className="mt-4"
            />
          )}

          {stage === 'mux_upload' && muxJob.isProcessing && (
            <ProgressIndicator
              progress={muxJob.progress}
              message={muxJob.job?.progress_message || "Setting up video streaming..."}
              status="loading"
              className="mt-4"
            />
          )}

          {/* Job status summary */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium">Transcription</div>
              <div className={`text-xs ${transcriptionJob.isCompleted ? 'text-green-600' : transcriptionJob.isFailed ? 'text-red-600' : 'text-blue-600'}`}>
                {transcriptionJob.isCompleted ? '✓ Complete' : 
                 transcriptionJob.isFailed ? '✗ Failed' : 
                 transcriptionJob.isProcessing ? '⏳ Processing' : '⏸ Pending'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">AI Generation</div>
              <div className={`text-xs ${sopJob.isCompleted ? 'text-green-600' : sopJob.isFailed ? 'text-red-600' : 'text-blue-600'}`}>
                {sopJob.isCompleted ? '✓ Complete' : 
                 sopJob.isFailed ? '✗ Failed' : 
                 sopJob.isProcessing ? '⏳ Processing' : '⏸ Pending'}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Video Upload</div>
              <div className={`text-xs ${muxJob.isCompleted ? 'text-green-600' : muxJob.isFailed ? 'text-red-600' : 'text-blue-600'}`}>
                {muxJob.isCompleted ? '✓ Complete' : 
                 muxJob.isFailed ? '✗ Failed' : 
                 muxJob.isProcessing ? '⏳ Processing' : '⏸ Pending'}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg mt-4 max-w-md text-center">
              <p className="font-medium">{error}</p>
              <div className="mt-3 flex gap-2 justify-center">
                <Button onClick={handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" /> Try Again
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <XCircle className="h-4 w-4 mr-2" /> Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={handleCancel} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button onClick={onNext} className="gap-2" disabled={stage !== 'complete'}>
            Next: Review & Edit
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
