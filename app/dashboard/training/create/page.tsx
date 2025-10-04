'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SetupStep } from '@/components/training/setup-step'
import { RecordingStep } from '@/components/training/recording-step'
import { ProcessingStep } from '@/components/training/processing-step'
import { ReviewStep } from '@/components/training/review-step'
import { PublishStep } from '@/components/training/publish-step'

export type TrainingData = {
  title: string
  description: string
  videoBlob?: Blob
  videoUrl?: string
  videoStorageUrl?: string
  muxPlaybackId?: string
  muxAssetId?: string
  videoDuration: number
  transcript?: string
  chapters?: Array<{ title: string; start_time: number; end_time: number }>
  sop?: string
  keyPoints?: string[]
}

export default function CreateTrainingPage() {
  const [step, setStep] = useState(1)
  const [trainingData, setTrainingData] = useState<TrainingData>({
    title: '',
    description: '',
    videoDuration: 0,
  })

  const updateTrainingData = (updates: Partial<TrainingData>) => {
    setTrainingData(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Progress Indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {['Setup', 'Record', 'Process', 'Review', 'Publish'].map((label, index) => {
              const stepNumber = index + 1
              const isActive = step === stepNumber
              const isCompleted = step > stepNumber

              return (
                <div key={label} className="flex items-center" style={{ flex: index < 4 ? '1' : '0 0 auto' }}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓' : stepNumber}
                    </div>
                    <span
                      className={`text-sm mt-2 whitespace-nowrap ${
                        isActive ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < 4 && (
                    <div
                      className={`h-1 flex-1 -mt-6 mx-2 transition-colors ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <SetupStep
              data={trainingData}
              onUpdate={updateTrainingData}
              onNext={nextStep}
            />
          )}
          {step === 2 && (
            <RecordingStep
              data={trainingData}
              onUpdate={updateTrainingData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === 3 && (
            <ProcessingStep
              data={trainingData}
              onUpdate={updateTrainingData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === 4 && (
            <ReviewStep
              data={trainingData}
              onUpdate={updateTrainingData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === 5 && (
            <PublishStep
              data={trainingData}
              onBack={prevStep}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
