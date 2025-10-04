'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Trophy, ArrowRight } from 'lucide-react'

interface CompletionOverlayProps {
  trainingTitle: string
  trainingId: string
  checkpointsCompleted: number
  totalCheckpoints: number
}

export function CompletionOverlay({
  trainingTitle,
  trainingId,
  checkpointsCompleted,
  totalCheckpoints,
}: CompletionOverlayProps) {
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)

    try {
      // Mark training as completed
      await fetch('/api/training/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainingId }),
      })

      // Redirect to dashboard
      router.push('/dashboard/employee')
    } catch (error) {
      console.error('Error completing training:', error)
      setIsCompleting(false)
    }
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-green-600/90 to-blue-600/90 backdrop-blur-sm flex items-center justify-center z-50 p-8">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Trophy className="h-20 w-20 text-yellow-500 animate-bounce" />
              <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Training Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Details */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {trainingTitle}
            </h3>
            <p className="text-gray-600">
              Congratulations on completing this training module!
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border-2 border-green-200 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {checkpointsCompleted}/{totalCheckpoints}
              </div>
              <div className="text-sm text-gray-600">Checkpoints Passed</div>
            </div>
            <div className="bg-white border-2 border-blue-200 rounded-lg p-4 text-center">
              <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600">Video Completed</div>
            </div>
          </div>

          {/* Completion Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Your progress has been saved</li>
              <li>✓ Training marked as complete</li>
              <li>✓ Return to your dashboard to view more trainings</li>
            </ul>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            className="w-full"
            size="lg"
          >
            {isCompleting ? (
              <>Completing...</>
            ) : (
              <>
                Return to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
