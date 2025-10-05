'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Video, Mic, Brain, CheckCircle2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileTrainingCreateProps {
  onComplete: (data: any) => void
}

export function MobileTrainingCreate({ onComplete }: MobileTrainingCreateProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoBlob: null as Blob | null,
    transcript: '',
    chapters: [],
    keyPoints: [],
    sop: ''
  })

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const steps = [
    { id: 1, title: 'Setup', description: 'Basic information', icon: Video },
    { id: 2, title: 'Record', description: 'Screen recording', icon: Mic },
    { id: 3, title: 'Process', description: 'AI generation', icon: Brain },
    { id: 4, title: 'Review', description: 'Edit content', icon: CheckCircle2 },
    { id: 5, title: 'Publish', description: 'Save training', icon: CheckCircle2 },
  ]

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <SetupStep data={formData} onUpdate={updateFormData} />
      case 2:
        return <RecordingStep data={formData} onUpdate={updateFormData} />
      case 3:
        return <ProcessingStep data={formData} onUpdate={updateFormData} />
      case 4:
        return <ReviewStep data={formData} onUpdate={updateFormData} />
      case 5:
        return <PublishStep data={formData} onComplete={onComplete} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900">Create Training</h1>
            <p className="text-xs text-gray-500">Step {currentStep} of {steps.length}</p>
          </div>
          
          <div className="w-8" /> {/* Spacer */}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                currentStep >= step.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}>
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span className={cn(
                'text-xs mt-1 transition-colors',
                currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-4">
        {renderStepContent()}
      </div>

      {/* Mobile Navigation */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep < steps.length && (
            <Button
              onClick={nextStep}
              className="flex-1"
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return formData.title.trim() !== ''
      case 2:
        return formData.videoBlob !== null
      case 3:
        return formData.transcript !== ''
      case 4:
        return true
      case 5:
        return true
      default:
        return false
    }
  }
}

// Step Components
function SetupStep({ data, onUpdate }: { data: any, onUpdate: (updates: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Training Setup
        </CardTitle>
        <CardDescription>
          Provide basic information about your training
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Training Title *
          </label>
          <Input
            value={data.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Enter training title"
            className="w-full"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe what this training covers"
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function RecordingStep({ data, onUpdate }: { data: any, onUpdate: (updates: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Record Training
        </CardTitle>
        <CardDescription>
          Record your screen and audio to create the training
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Recording functionality will be implemented here
          </p>
          <Button
            onClick={() => onUpdate({ videoBlob: new Blob(['mock video data']) })}
            className="w-full"
          >
            Start Recording
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProcessingStep({ data, onUpdate }: { data: any, onUpdate: (updates: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Processing
        </CardTitle>
        <CardDescription>
          Our AI is generating your training content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">
            Processing your training content...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewStep({ data, onUpdate }: { data: any, onUpdate: (updates: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Review Content
        </CardTitle>
        <CardDescription>
          Review and edit the AI-generated content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">
            Content review interface will be implemented here
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function PublishStep({ data, onComplete }: { data: any, onComplete: (data: any) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Publish Training
        </CardTitle>
        <CardDescription>
          Save your training and make it available to employees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Your training is ready to be published!
          </p>
          <Button
            onClick={() => onComplete(data)}
            className="w-full"
          >
            Publish Training
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
