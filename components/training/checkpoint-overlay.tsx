'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface CheckpointOverlayProps {
  question: string
  onAnswer: (answer: string) => Promise<{ correct: boolean; feedback: string }>
  onContinue: () => void
}

export function CheckpointOverlay({ question, onAnswer, onContinue }: CheckpointOverlayProps) {
  const [answer, setAnswer] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; feedback: string; audio?: string } | null>(null)

  const handleSubmit = async () => {
    if (!answer.trim() || isChecking) return

    setIsChecking(true)
    const feedback = await onAnswer(answer)
    setResult(feedback)
    setIsChecking(false)

    // Play audio feedback if available
    if (feedback.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${feedback.audio}`)
      audio.play()
    }
  }

  const handleContinue = () => {
    setAnswer('')
    setResult(null)
    onContinue()
  }

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
              ?
            </span>
            Knowledge Check
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-gray-900 font-medium">{question}</p>
          </div>

          {/* Answer Input */}
          {!result && (
            <div className="space-y-4">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                disabled={isChecking}
              />
              <Button
                onClick={handleSubmit}
                disabled={!answer.trim() || isChecking}
                className="w-full"
                size="lg"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Submit Answer'
                )}
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 ${
                  result.correct ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.correct ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-2 ${result.correct ? 'text-green-900' : 'text-red-900'}`}>
                      {result.correct ? 'Great job! ✓' : 'Not quite right'}
                    </h4>
                    <p className={`text-sm ${result.correct ? 'text-green-800' : 'text-red-800'}`}>
                      {result.feedback}
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleContinue} className="w-full" size="lg">
                Continue Video
              </Button>
            </div>
          )}

          {/* Hint */}
          {!result && (
            <p className="text-xs text-gray-500 text-center">
              💡 The AI will evaluate your answer and provide feedback
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
