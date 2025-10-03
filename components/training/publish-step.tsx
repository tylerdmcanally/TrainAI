'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingData } from '@/app/dashboard/training/create/page'
import { ArrowLeft, CheckCircle2, Loader2, Upload } from 'lucide-react'

interface PublishStepProps {
  data: TrainingData
  onBack: () => void
}

export function PublishStep({ data, onBack }: PublishStepProps) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  const handlePublish = async () => {
    setPublishing(true)
    setError(null)

    try {
      const response = await fetch('/api/training/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          videoDuration: data.videoDuration,
          videoStorageUrl: data.videoStorageUrl,
          muxPlaybackId: data.muxPlaybackId,
          transcript: data.transcript,
          chapters: data.chapters,
          sop: data.sop,
          keyPoints: data.keyPoints,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to publish training')
      }

      setPublished(true)

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      console.error('Publish error:', err)
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish Training</CardTitle>
        <CardDescription>
          Your training is ready! Publish it to make it available to your team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="bg-gray-50 border rounded-lg p-6 space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">{data.title}</h4>
            {data.description && (
              <p className="text-sm text-gray-600">{data.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
              <p className="font-semibold text-gray-900">
                {Math.floor(data.videoDuration / 60)}m {data.videoDuration % 60}s
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Chapters</p>
              <p className="font-semibold text-gray-900">{data.chapters?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Key Points</p>
              <p className="font-semibold text-gray-900">{data.keyPoints?.length || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Has SOP</p>
              <p className="font-semibold text-gray-900">
                {data.sop && data.sop.length > 0 ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium mb-1">Publishing Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {published && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
              <CheckCircle2 className="h-5 w-5" />
              Training Published!
            </div>
            <p className="text-sm text-green-700">
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Info */}
        {!published && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Training will be saved to your dashboard</li>
              <li>• You can assign it to employees</li>
              <li>• Employees will get AI tutoring while learning</li>
              <li>• Track progress and completion rates</li>
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={publishing || published}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Edit
          </Button>

          <Button
            size="lg"
            onClick={handlePublish}
            disabled={publishing || published}
            className="gap-2"
          >
            {publishing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publishing...
              </>
            ) : published ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Published!
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Publish Training
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
