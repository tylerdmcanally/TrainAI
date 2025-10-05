'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Loader2, Upload, FileText, Brain, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProgressStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'error'
  progress?: number // 0-100
  icon?: React.ReactNode
  duration?: number // in milliseconds
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  currentStep?: string
  showProgress?: boolean
  className?: string
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  showProgress = true, 
  className 
}: ProgressIndicatorProps) {
  const getStepIcon = (step: ProgressStep) => {
    if (step.icon) return step.icon
    
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'active':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStepStatusColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      case 'active':
        return 'border-blue-500 bg-blue-50'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "flex items-start space-x-4 p-4 rounded-lg border-2 transition-all duration-300",
            getStepStatusColor(step)
          )}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getStepIcon(step)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "text-sm font-medium",
                step.status === 'completed' && "text-green-900",
                step.status === 'error' && "text-red-900",
                step.status === 'active' && "text-blue-900",
                step.status === 'pending' && "text-gray-700"
              )}>
                {step.title}
              </h3>
              {step.duration && step.status === 'completed' && (
                <span className="text-xs text-gray-500">
                  {step.duration < 1000 
                    ? `${step.duration}ms` 
                    : `${(step.duration / 1000).toFixed(1)}s`
                  }
                </span>
              )}
            </div>
            
            {step.description && (
              <p className={cn(
                "text-xs mt-1",
                step.status === 'completed' && "text-green-700",
                step.status === 'error' && "text-red-700",
                step.status === 'active' && "text-blue-700",
                step.status === 'pending' && "text-gray-600"
              )}>
                {step.description}
              </p>
            )}

            {/* Progress bar */}
            {showProgress && step.status === 'active' && step.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${step.progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  {Math.round(step.progress)}%
                </p>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Specialized components for common use cases
export function UploadProgressIndicator({ 
  progress, 
  stage, 
  error, 
  className 
}: {
  progress: number
  stage: string
  error?: string
  className?: string
}) {
  const steps: ProgressStep[] = [
    {
      id: 'upload',
      title: 'Uploading File',
      description: 'Sending your video to secure storage',
      status: stage === 'uploading' ? 'active' : stage === 'uploading-mux' ? 'completed' : 'pending',
      progress: stage === 'uploading' ? progress : undefined,
      icon: <Upload className="h-5 w-5" />,
    },
    {
      id: 'transcribe',
      title: 'Transcribing Audio',
      description: 'Converting speech to text with AI',
      status: stage === 'transcribing' ? 'active' : ['generating', 'uploading-mux', 'complete'].includes(stage) ? 'completed' : 'pending',
      progress: stage === 'transcribing' ? progress : undefined,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'generate',
      title: 'Generating Content',
      description: 'Creating SOP, chapters, and key points',
      status: stage === 'generating' ? 'active' : ['uploading-mux', 'complete'].includes(stage) ? 'completed' : 'pending',
      progress: stage === 'generating' ? progress : undefined,
      icon: <Brain className="h-5 w-5" />,
    },
    {
      id: 'mux',
      title: 'Processing Video',
      description: 'Uploading to Mux for streaming',
      status: stage === 'uploading-mux' ? 'active' : stage === 'complete' ? 'completed' : 'pending',
      progress: stage === 'uploading-mux' ? progress : undefined,
      icon: <Clock className="h-5 w-5" />,
    },
  ]

  if (error) {
    // Find the current step and mark it as error
    const currentStepIndex = steps.findIndex(step => step.status === 'active')
    if (currentStepIndex >= 0) {
      steps[currentStepIndex].status = 'error'
      steps[currentStepIndex].description = error
    }
  }

  return <ProgressIndicator steps={steps} className={className} />
}

// File upload progress component
export function FileUploadProgress({ 
  fileName, 
  progress, 
  status, 
  error, 
  onCancel,
  className 
}: {
  fileName: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
  onCancel?: () => void
  className?: string
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50'
      case 'error':
        return 'border-red-500 bg-red-50'
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }

  return (
    <div className={cn(
      "flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300",
      getStatusColor(),
      className
    )}>
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {fileName}
          </p>
          {status === 'uploading' && (
            <span className="text-sm text-blue-600 font-medium">
              {Math.round(progress)}%
            </span>
          )}
        </div>
        
        {status === 'uploading' && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}
        
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>
      
      {status === 'uploading' && onCancel && (
        <button
          onClick={onCancel}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <AlertCircle className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
