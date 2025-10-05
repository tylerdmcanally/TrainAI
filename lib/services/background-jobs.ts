// lib/services/background-jobs.ts

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type JobType = 'transcription' | 'sop_generation' | 'mux_upload' | 'tts_generation' | 'checkpoint_evaluation'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying'

export interface BackgroundJob {
  id: string
  user_id: string
  company_id: string
  job_type: JobType
  status: JobStatus
  priority: number
  input_data: Record<string, unknown>
  output_data?: Record<string, unknown>
  error_data?: Record<string, unknown>
  progress_percentage: number
  progress_message?: string
  estimated_completion?: string
  created_at: string
  started_at?: string
  completed_at?: string
  retry_count: number
  max_retries: number
  next_retry_at?: string
  training_module_id?: string
  assignment_id?: string
}

export interface CreateJobOptions {
  userId: string
  companyId: string
  jobType: JobType
  inputData?: Record<string, unknown>
  priority?: number // 1 = highest, 10 = lowest
  trainingModuleId?: string
  assignmentId?: string
  maxRetries?: number
}

export interface UpdateJobOptions {
  status?: JobStatus
  progressPercentage?: number
  progressMessage?: string
  outputData?: Record<string, unknown>
  errorData?: Record<string, unknown>
}

export class BackgroundJobService {
  private supabase: ReturnType<typeof createClient>
  private adminSupabase: ReturnType<typeof createAdminClient>

  constructor() {
    this.supabase = createClient()
    this.adminSupabase = createAdminClient()
  }

  /**
   * Create a new background job
   */
  async createJob(options: CreateJobOptions): Promise<string> {
    const {
      userId,
      companyId,
      jobType,
      inputData = {},
      priority = 5,
      trainingModuleId,
      assignmentId,
      maxRetries = 3
    } = options

    const { data, error } = await this.supabase.rpc('create_background_job', {
      p_user_id: userId,
      p_company_id: companyId,
      p_job_type: jobType,
      p_input_data: inputData,
      p_priority: priority,
      p_training_module_id: trainingModuleId || null,
      p_assignment_id: assignmentId || null,
      p_max_retries: maxRetries
    })

    if (error) {
      throw new Error(`Failed to create background job: ${error.message}`)
    }

    return data
  }

  /**
   * Update job status and progress
   */
  async updateJob(jobId: string, options: UpdateJobOptions): Promise<boolean> {
    const {
      status,
      progressPercentage,
      progressMessage,
      outputData,
      errorData
    } = options

    const { data, error } = await this.supabase.rpc('update_job_status', {
      p_job_id: jobId,
      p_status: status || null,
      p_progress_percentage: progressPercentage || null,
      p_progress_message: progressMessage || null,
      p_output_data: outputData || null,
      p_error_data: errorData || null
    })

    if (error) {
      throw new Error(`Failed to update job: ${error.message}`)
    }

    return data
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<BackgroundJob | null> {
    const { data, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Job not found
      }
      throw new Error(`Failed to get job: ${error.message}`)
    }

    return data as BackgroundJob
  }

  /**
   * Get jobs for a user
   */
  async getUserJobs(userId: string, limit = 50): Promise<BackgroundJob[]> {
    const { data, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get user jobs: ${error.message}`)
    }

    return data as BackgroundJob[]
  }

  /**
   * Get jobs for a training module
   */
  async getTrainingJobs(trainingModuleId: string): Promise<BackgroundJob[]> {
    const { data, error } = await this.supabase
      .from('background_jobs')
      .select('*')
      .eq('training_module_id', trainingModuleId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get training jobs: ${error.message}`)
    }

    return data as BackgroundJob[]
  }

  /**
   * Get pending jobs (admin only)
   */
  async getPendingJobs(limit = 10): Promise<BackgroundJob[]> {
    const { data, error } = await this.adminSupabase
      .rpc('get_pending_jobs', { limit_count: limit })

    if (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`)
    }

    return data as BackgroundJob[]
  }

  /**
   * Schedule job retry
   */
  async scheduleRetry(jobId: string, delayMinutes = 5): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('schedule_job_retry', {
      p_job_id: jobId,
      p_retry_delay_minutes: delayMinutes
    })

    if (error) {
      throw new Error(`Failed to schedule retry: ${error.message}`)
    }

    return data
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    return this.updateJob(jobId, { status: 'cancelled' })
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: Error): Promise<boolean> {
    return this.updateJob(jobId, {
      status: 'failed',
      errorData: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, outputData: Record<string, unknown>): Promise<boolean> {
    return this.updateJob(jobId, {
      status: 'completed',
      progressPercentage: 100,
      outputData
    })
  }

  /**
   * Update job progress
   */
  async updateProgress(
    jobId: string, 
    percentage: number, 
    message?: string
  ): Promise<boolean> {
    return this.updateJob(jobId, {
      progressPercentage: percentage,
      progressMessage: message
    })
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(daysOld = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { data, error } = await this.adminSupabase
      .from('background_jobs')
      .delete()
      .in('status', ['completed', 'failed', 'cancelled'])
      .lt('completed_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      throw new Error(`Failed to cleanup old jobs: ${error.message}`)
    }

    return data?.length || 0
  }
}

// Singleton instance
export const backgroundJobService = new BackgroundJobService()

// Utility functions for common job operations
export async function createTranscriptionJob(
  userId: string,
  companyId: string,
  audioFileUrl: string,
  trainingModuleId?: string
): Promise<string> {
  return backgroundJobService.createJob({
    userId,
    companyId,
    jobType: 'transcription',
    inputData: { audioFileUrl },
    priority: 3, // High priority for transcription
    trainingModuleId
  })
}

export async function createSOPGenerationJob(
  userId: string,
  companyId: string,
  title: string,
  transcript: string,
  duration: number,
  trainingModuleId?: string
): Promise<string> {
  return backgroundJobService.createJob({
    userId,
    companyId,
    jobType: 'sop_generation',
    inputData: { title, transcript, duration },
    priority: 4, // High priority for SOP generation
    trainingModuleId
  })
}

export async function createMuxUploadJob(
  userId: string,
  companyId: string,
  videoUrl: string,
  trainingModuleId?: string
): Promise<string> {
  return backgroundJobService.createJob({
    userId,
    companyId,
    jobType: 'mux_upload',
    inputData: { videoUrl },
    priority: 6, // Lower priority for video upload
    trainingModuleId
  })
}

export async function createTTSGenerationJob(
  userId: string,
  companyId: string,
  text: string,
  assignmentId?: string
): Promise<string> {
  return backgroundJobService.createJob({
    userId,
    companyId,
    jobType: 'tts_generation',
    inputData: { text },
    priority: 7, // Lower priority for TTS
    assignmentId
  })
}
