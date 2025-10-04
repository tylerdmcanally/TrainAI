'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface CheckpointQuestion {
  question: string
  options: Array<{ id: string; text: string }>
  correctAnswer: string
  explanation: string
}

interface CheckpointOverlayProps {
  questionData: CheckpointQuestion | null
  onAnswer: (selectedAnswer: string, correctAnswer: string, explanation: string) => Promise<{ correct: boolean; feedback: string; audio?: string }>
  onContinue: () => void
  isLoadingQuestion: boolean
}

export function CheckpointOverlay({ questionData, onAnswer, onContinue, isLoadingQuestion }: CheckpointOverlayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<{ correct: boolean; feedback: string; audio?: string } | null>(null)

  const handleSubmit = async () => {
    if (!selectedAnswer || isChecking || !questionData) return

    setIsChecking(true)
    const feedback = await onAnswer(selectedAnswer, questionData.correctAnswer, questionData.explanation)
    setResult(feedback)
    setIsChecking(false)

    // Play audio feedback if available
    if (feedback.audio) {
      const audio = new Audio(`data:audio/mp3;base64,${feedback.audio}`)
      audio.play()
    }
  }

  const handleContinue = () => {
    setSelectedAnswer('')
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
          {/* Loading State */}
          {isLoadingQuestion && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Generating question...</span>
            </div>
          )}

          {/* Question and Options */}
          {!isLoadingQuestion && questionData && !result && (
            <>
              {/* Question */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-gray-900 font-medium">{questionData.question}</p>
              </div>

              {/* Multiple Choice Options */}
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {questionData.options.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                        selectedAnswer === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAnswer(option.id)}
                    >
                      <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
                      <Label
                        htmlFor={option.id}
                        className="flex-1 cursor-pointer text-gray-900 font-medium"
                      >
                        <span className="font-bold text-blue-600 mr-2">{option.id}.</span>
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || isChecking}
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
            </>
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
          {!isLoadingQuestion && !result && questionData && (
            <p className="text-xs text-gray-500 text-center">
              💡 Select the best answer and submit
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
