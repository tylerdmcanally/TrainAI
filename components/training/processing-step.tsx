'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { Loader2, CheckCircle2, FileText, Brain, Clock } from 'lucide-react'

interface ProcessingStepProps {
  data: TrainingData
  onUpdate: (updates: Partial<TrainingData>) => void
  onNext: () => void
  onBack: () => void
}

type ProcessingStage = 'uploading' | 'transcribing' | 'generating' | 'uploading-mux' | 'complete' | 'error'

export function ProcessingStep({ data, onUpdate, onNext }: ProcessingStepProps) {
  const [stage, setStage] = useState<ProcessingStage>('transcribing')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    processRecording()
  }, [])

  const processRecording = async () => {
    try {
      if (!data.videoBlob) {
        throw new Error('No video recording found')
      }

      // Step 1: Upload video to Supabase Storage
      setStage('uploading')
      setProgress(5)

      const videoFile = new File([data.videoBlob], `training-${Date.now()}.webm`, {
        type: 'video/webm'
      })

      const formData = new FormData()
      formData.append('video', videoFile)

      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video')
      }

      const { url: videoStorageUrl } = await uploadResponse.json()
      onUpdate({ videoStorageUrl })

      setProgress(15)

      // Step 2: Transcribe audio
      setStage('transcribing')
      setProgress(20)

      const transcribeFormData = new FormData()
      transcribeFormData.append('audio', data.videoBlob, 'recording.webm')

      setProgress(30)

      const transcribeResponse = await fetch('/api/training/transcribe', {
        method: 'POST',
        body: transcribeFormData,
      })

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe audio')
      }

      const { transcript } = await transcribeResponse.json()
      onUpdate({ transcript })

      setProgress(50)

      // Step 3: Generate SOP, chapters, and key points
      setStage('generating')
      setProgress(60)

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
        throw new Error('Failed to generate SOP')
      }

      const { chapters, sop, keyPoints } = await sopResponse.json()

      setProgress(75)

      onUpdate({
        chapters,
        sop,
        keyPoints,
      })

      // Step 4: Upload to Mux (only if credentials are configured)
      setStage('uploading-mux')
      setProgress(80)

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
          // Mux plan limit reached - show error to user
          const { error: muxError } = await muxResponse.json()
          throw new Error(muxError || 'Mux upload limit reached')
        } else {
          // Other Mux errors - continue without it
          console.warn('Mux upload skipped or failed')
          setProgress(95)
        }
      } catch (muxError) {
        // Check if it's the plan limit error - if so, throw to show to user
        if (muxError instanceof Error && muxError.message.includes('limit')) {
          throw muxError
        }
        // Non-critical error - continue without Mux
        console.warn('Mux upload error:', muxError)
        setProgress(95)
      }

      setProgress(100)
      setStage('complete')

      // Auto-advance after a brief pause
      setTimeout(() => {
        onNext()
      }, 1500)

    } catch (err) {
      console.error('Processing error:', err)
      setError(err instanceof Error ? err.message : 'Processing failed')
      setStage('error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Your Training</CardTitle>
        <CardDescription>
          AI is analyzing your recording and creating documentation...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {progress}% Complete
            </span>
            <span className="text-sm text-gray-500">
              {stage === 'uploading' && 'Uploading video...'}
              {stage === 'transcribing' && 'Transcribing audio...'}
              {stage === 'generating' && 'Generating documentation...'}
              {stage === 'uploading-mux' && 'Preparing video playback...'}
              {stage === 'complete' && 'Done!'}
              {stage === 'error' && 'Error occurred'}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Processing Stages */}
        <div className="space-y-4">
          {/* Video Upload */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`mt-1 ${
              stage === 'uploading' ? 'text-blue-600' :
              ['transcribing', 'generating', 'uploading-mux', 'complete'].includes(stage) ? 'text-green-600' :
              'text-gray-400'
            }`}>
              {['transcribing', 'generating', 'uploading-mux', 'complete'].includes(stage) ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : stage === 'uploading' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Clock className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Video Upload</h4>
              <p className="text-sm text-gray-600">
                Saving your recording to cloud storage
              </p>
            </div>
          </div>

          {/* Transcription */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`mt-1 ${
              stage === 'transcribing' ? 'text-blue-600' :
              ['generating', 'uploading-mux', 'complete'].includes(stage) ? 'text-green-600' :
              'text-gray-400'
            }`}>
              {['generating', 'uploading-mux', 'complete'].includes(stage) ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : stage === 'transcribing' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Clock className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Speech-to-Text Transcription</h4>
              <p className="text-sm text-gray-600">
                Converting your spoken words into text using OpenAI Whisper
              </p>
            </div>
          </div>

          {/* SOP Generation */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`mt-1 ${
              stage === 'generating' ? 'text-blue-600' :
              ['uploading-mux', 'complete'].includes(stage) ? 'text-green-600' :
              'text-gray-400'
            }`}>
              {['uploading-mux', 'complete'].includes(stage) ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : stage === 'generating' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Document Generation</h4>
              <p className="text-sm text-gray-600">
                Creating chapters, step-by-step guide, and key points with GPT-4
              </p>
            </div>
          </div>

          {/* Mux Upload */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`mt-1 ${
              stage === 'uploading-mux' ? 'text-blue-600' :
              stage === 'complete' ? 'text-green-600' :
              'text-gray-400'
            }`}>
              {stage === 'complete' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : stage === 'uploading-mux' ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">Video Optimization</h4>
              <p className="text-sm text-gray-600">
                Preparing video for smooth playback on any device
              </p>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`mt-1 ${
              stage === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              {stage === 'complete' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Brain className="h-6 w-6" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">AI Optimization</h4>
              <p className="text-sm text-gray-600">
                Structuring content for maximum learning retention
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {stage === 'error' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-1">Processing Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success State */}
        {stage === 'complete' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
              <CheckCircle2 className="h-5 w-5" />
              Processing Complete!
            </div>
            <p className="text-sm text-green-700">
              Your training documentation is ready for review.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
