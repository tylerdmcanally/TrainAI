'use client'

import { useState, Suspense } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { 
  LazySetupStep,
  LazyRecordingStep,
  LazyProcessingStepEnhanced,
  LazyReviewStep,
  LazyPublishStep
} from '@/components/training/lazy-components'

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

export default function OptimizedCreateTrainingPage() {
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

  const stepComponents = {
    1: LazySetupStep,
    2: LazyRecordingStep,
    3: LazyProcessingStepEnhanced,
    4: LazyReviewStep,
    5: LazyPublishStep,
  }

  const StepComponent = stepComponents[step as keyof typeof stepComponents]

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

        {/* Step Content with Suspense */}
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={
            <div className="flex items-center justify-center p-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading step {step}...</p>
              </div>
            </div>
          }>
            {StepComponent && (
              <StepComponent
                data={trainingData}
                onUpdate={updateTrainingData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
          </Suspense>
        </div>

        {/* Performance Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-4xl mx-auto">
          <p className="text-sm text-blue-800">
            🚀 <strong>Optimized Loading:</strong> This page uses dynamic imports to lazy-load 
            each step component, reducing initial bundle size and improving page load performance.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
