'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
)

// Lazy load training creation steps
export const LazySetupStep = dynamic(
  () => import('./setup-step').then(mod => ({ default: mod.SetupStep })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyRecordingStep = dynamic(
  () => import('./recording-step').then(mod => ({ default: mod.RecordingStep })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyProcessingStepEnhanced = dynamic(
  () => import('./processing-step-enhanced').then(mod => ({ default: mod.ProcessingStepEnhanced })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyReviewStep = dynamic(
  () => import('./review-step').then(mod => ({ default: mod.ReviewStep })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyPublishStep = dynamic(
  () => import('./publish-step').then(mod => ({ default: mod.PublishStep })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load video player components
export const LazyVideoPlayer = dynamic(
  () => import('./video-player').then(mod => ({ default: mod.VideoPlayer })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyEmployeeTrainingPlayer = dynamic(
  () => import('./employee-training-player').then(mod => ({ default: mod.EmployeeTrainingPlayer })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load AI tutor chat
export const LazyAITutorChat = dynamic(
  () => import('./ai-tutor-chat').then(mod => ({ default: mod.AITutorChat })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load file upload components
export const LazyChunkedFileUpload = dynamic(
  () => import('../ui/chunked-file-upload').then(mod => ({ default: mod.ChunkedFileUpload })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyFileUpload = dynamic(
  () => import('../ui/file-upload').then(mod => ({ default: mod.FileUpload })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load progress components
export const LazyProgressIndicator = dynamic(
  () => import('../ui/progress-indicator').then(mod => ({ default: mod.ProgressIndicator })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load employee components
export const LazyAddEmployeeDialog = dynamic(
  () => import('../employees/add-employee-dialog').then(mod => ({ default: mod.AddEmployeeDialog })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyAssignTrainingDialog = dynamic(
  () => import('../training/assign-training-dialog').then(mod => ({ default: mod.AssignTrainingDialog })),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

// Lazy load analytics components (for future use)
// export const LazyAnalyticsChart = dynamic(
//   () => import('../ui/analytics-chart').then(mod => ({ default: mod.AnalyticsChart })),
//   {
//     loading: LoadingSpinner,
//     ssr: false
//   }
// )

// Lazy load form components
// export const LazyTrainingForm = dynamic(
//   () => import('../training/training-form').then(mod => ({ default: mod.TrainingForm })),
//   {
//     loading: LoadingSpinner,
//     ssr: false
//   }
// )
