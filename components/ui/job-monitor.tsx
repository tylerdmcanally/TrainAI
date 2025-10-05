// components/ui/job-monitor.tsx
// Real-time job monitoring component

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressIndicator } from './progress-indicator'
import { useJobStatus, useMultipleJobStatus } from '@/lib/hooks/use-job-status'
import { backgroundJobService, BackgroundJob, JobStatus } from '@/lib/services/background-jobs'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface JobMonitorProps {
  userId?: string
  trainingModuleId?: string
  className?: string
  showActions?: boolean
  compact?: boolean
}

interface JobCardProps {
  job: BackgroundJob
  showActions?: boolean
  onRefresh?: () => void
}

function JobCard({ job, showActions = true, onRefresh }: JobCardProps) {
  const { progress, status, isCompleted, isFailed, isProcessing, isPending, retryCount, maxRetries, outputData, errorData, cancelJob, refreshJob } = useJobStatus({
    jobId: job.id,
    pollingInterval: 2000,
    autoRefresh: true
  })

  const getStatusIcon = (jobStatus: JobStatus) => {
    switch (jobStatus) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'cancelled':
        return <Pause className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (jobStatus: JobStatus) => {
    switch (jobStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'transcription':
        return 'Audio Transcription'
      case 'sop_generation':
        return 'AI Content Generation'
      case 'mux_upload':
        return 'Video Upload'
      case 'tts_generation':
        return 'Audio Generation'
      case 'checkpoint_evaluation':
        return 'Answer Evaluation'
      default:
        return jobType
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleCancel = async () => {
    try {
      await cancelJob()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to cancel job:', error)
    }
  }

  const handleRefresh = async () => {
    try {
      await refreshJob()
      onRefresh?.()
    } catch (error) {
      console.error('Failed to refresh job:', error)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <CardTitle className="text-sm font-medium">
              {getJobTypeLabel(job.job_type)}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", getStatusColor(status))}>
              {status}
            </Badge>
            {retryCount > 0 && (
              <Badge variant="outline" className="text-xs">
                Retry {retryCount}/{maxRetries}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Created: {formatDate(job.created_at)}
          {job.started_at && ` • Started: ${formatDate(job.started_at)}`}
          {job.completed_at && ` • Completed: ${formatDate(job.completed_at)}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {(isProcessing || isPending) && (
          <ProgressIndicator
            progress={progress}
            message={job.progress_message || `Processing ${getJobTypeLabel(job.job_type).toLowerCase()}...`}
            status={isProcessing ? "loading" : "info"}
            className="mb-4"
          />
        )}

        {isFailed && errorData && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Processing Failed</p>
                <p className="text-red-700 mt-1">
                  {typeof errorData.message === 'string' ? errorData.message : 'Unknown error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isCompleted && outputData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Processing Complete</p>
                <p className="text-green-700 mt-1">
                  {getJobTypeLabel(job.job_type)} completed successfully
                </p>
              </div>
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isProcessing}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            
            {(isProcessing || isPending) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <Pause className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function JobMonitor({ 
  userId, 
  trainingModuleId, 
  className, 
  showActions = true,
  compact = false 
}: JobMonitorProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async () => {
    try {
      setLoading(true)
      setError(null)

      let fetchedJobs: BackgroundJob[] = []
      
      if (trainingModuleId) {
        fetchedJobs = await backgroundJobService.getTrainingJobs(trainingModuleId)
      } else if (userId) {
        fetchedJobs = await backgroundJobService.getUserJobs(userId)
      }

      setJobs(fetchedJobs)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch jobs'
      setError(errorMessage)
      console.error('Failed to fetch jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [userId, trainingModuleId])

  if (loading && jobs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading jobs...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <span className="ml-2 text-red-600">{error}</span>
        </CardContent>
      </Card>
    )
  }

  if (jobs.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Background Jobs</CardTitle>
          <CardDescription>No background jobs found</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Group jobs by status
  const pendingJobs = jobs.filter(job => ['pending', 'processing', 'retrying'].includes(job.status))
  const completedJobs = jobs.filter(job => job.status === 'completed')
  const failedJobs = jobs.filter(job => job.status === 'failed')
  const cancelledJobs = jobs.filter(job => job.status === 'cancelled')

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Background Jobs</h3>
          <p className="text-sm text-gray-600">
            {jobs.length} total jobs • {pendingJobs.length} active • {completedJobs.length} completed
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Active Jobs */}
      {pendingJobs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <Play className="h-4 w-4" />
            Active Jobs ({pendingJobs.length})
          </h4>
          <div className="grid gap-3">
            {pendingJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                showActions={showActions}
                onRefresh={fetchJobs}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Jobs */}
      {completedJobs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedJobs.length})
          </h4>
          {!compact && (
            <div className="grid gap-3">
              {completedJobs.slice(0, 5).map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  showActions={false}
                  onRefresh={fetchJobs}
                />
              ))}
              {completedJobs.length > 5 && (
                <p className="text-sm text-gray-600 text-center py-2">
                  ... and {completedJobs.length - 5} more completed jobs
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Failed Jobs */}
      {failedJobs.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-red-800 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Failed ({failedJobs.length})
          </h4>
          <div className="grid gap-3">
            {failedJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                showActions={showActions}
                onRefresh={fetchJobs}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
