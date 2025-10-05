// lib/hooks/use-job-status.ts
// React hook for monitoring background job status

import { useState, useEffect, useCallback } from 'react'
import { backgroundJobService, BackgroundJob, JobStatus } from '@/lib/services/background-jobs'

interface JobStatusHookResult {
  job: BackgroundJob | null
  loading: boolean
  error: string | null
  progress: number
  status: JobStatus | null
  isCompleted: boolean
  isFailed: boolean
  isProcessing: boolean
  isPending: boolean
  retryCount: number
  maxRetries: number
  outputData: Record<string, unknown> | null
  errorData: Record<string, unknown> | null
  refreshJob: () => Promise<void>
  cancelJob: () => Promise<void>
}

interface UseJobStatusOptions {
  jobId: string | null
  pollingInterval?: number // milliseconds, 0 to disable polling
  autoRefresh?: boolean
}

export function useJobStatus({
  jobId,
  pollingInterval = 2000, // Poll every 2 seconds by default
  autoRefresh = true
}: UseJobStatusOptions): JobStatusHookResult {
  const [job, setJob] = useState<BackgroundJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) {
      setJob(null)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const jobData = await backgroundJobService.getJob(jobId)
      setJob(jobData)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job status'
      setError(errorMessage)
      console.error('Failed to fetch job status:', err)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  const refreshJob = useCallback(async () => {
    await fetchJobStatus()
  }, [fetchJobStatus])

  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      await backgroundJobService.cancelJob(jobId)
      await fetchJobStatus() // Refresh to get updated status
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel job'
      setError(errorMessage)
      console.error('Failed to cancel job:', err)
    }
  }, [jobId, fetchJobStatus])

  // Initial fetch
  useEffect(() => {
    fetchJobStatus()
  }, [fetchJobStatus])

  // Set up polling
  useEffect(() => {
    if (!autoRefresh || !jobId || pollingInterval === 0) {
      return
    }

    // Don't poll if job is completed, failed, or cancelled
    if (job?.status && ['completed', 'failed', 'cancelled'].includes(job.status)) {
      return
    }

    const interval = setInterval(() => {
      fetchJobStatus()
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [jobId, pollingInterval, autoRefresh, job?.status, fetchJobStatus])

  // Computed properties
  const progress = job?.progress_percentage || 0
  const status = job?.status || null
  const isCompleted = status === 'completed'
  const isFailed = status === 'failed'
  const isProcessing = status === 'processing'
  const isPending = status === 'pending'
  const retryCount = job?.retry_count || 0
  const maxRetries = job?.max_retries || 3
  const outputData = job?.output_data || null
  const errorData = job?.error_data || null

  return {
    job,
    loading,
    error,
    progress,
    status,
    isCompleted,
    isFailed,
    isProcessing,
    isPending,
    retryCount,
    maxRetries,
    outputData,
    errorData,
    refreshJob,
    cancelJob
  }
}

// Hook for monitoring multiple jobs
export function useMultipleJobStatus(jobIds: string[], pollingInterval = 2000) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllJobs = useCallback(async () => {
    if (jobIds.length === 0) {
      setJobs([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const jobPromises = jobIds.map(id => backgroundJobService.getJob(id))
      const jobResults = await Promise.all(jobPromises)
      
      const validJobs = jobResults.filter((job): job is BackgroundJob => job !== null)
      setJobs(validJobs)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job statuses'
      setError(errorMessage)
      console.error('Failed to fetch job statuses:', err)
    } finally {
      setLoading(false)
    }
  }, [jobIds])

  // Initial fetch
  useEffect(() => {
    fetchAllJobs()
  }, [fetchAllJobs])

  // Set up polling
  useEffect(() => {
    if (jobIds.length === 0 || pollingInterval === 0) {
      return
    }

    // Don't poll if all jobs are completed/failed/cancelled
    const activeJobs = jobs.filter(job => 
      job.status && !['completed', 'failed', 'cancelled'].includes(job.status)
    )
    
    if (activeJobs.length === 0) {
      return
    }

    const interval = setInterval(() => {
      fetchAllJobs()
    }, pollingInterval)

    return () => clearInterval(interval)
  }, [jobIds, pollingInterval, jobs, fetchAllJobs])

  // Computed properties
  const completedJobs = jobs.filter(job => job.status === 'completed')
  const failedJobs = jobs.filter(job => job.status === 'failed')
  const processingJobs = jobs.filter(job => job.status === 'processing')
  const pendingJobs = jobs.filter(job => job.status === 'pending')

  const overallProgress = jobs.length > 0 
    ? Math.round(jobs.reduce((sum, job) => sum + (job.progress_percentage || 0), 0) / jobs.length)
    : 0

  const allCompleted = jobs.length > 0 && completedJobs.length === jobs.length
  const hasFailures = failedJobs.length > 0
  const hasActiveJobs = processingJobs.length > 0 || pendingJobs.length > 0

  return {
    jobs,
    loading,
    error,
    completedJobs,
    failedJobs,
    processingJobs,
    pendingJobs,
    overallProgress,
    allCompleted,
    hasFailures,
    hasActiveJobs,
    refreshAll: fetchAllJobs
  }
}
