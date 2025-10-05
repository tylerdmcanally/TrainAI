// app/api/jobs/[id]/status/route.ts
// Get job status and progress

import { NextRequest, NextResponse } from 'next/server'
import { backgroundJobService } from '@/lib/services/background-jobs'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'

interface RouteParams {
  params: {
    id: string
  }
}

export const GET = withApiErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const jobId = params.id

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  try {
    const job = await backgroundJobService.getJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Return job status with relevant information
    const response = {
      id: job.id,
      jobType: job.job_type,
      status: job.status,
      progressPercentage: job.progress_percentage,
      progressMessage: job.progress_message,
      created_at: job.created_at,
      started_at: job.started_at,
      completed_at: job.completed_at,
      retry_count: job.retry_count,
      max_retries: job.max_retries,
      next_retry_at: job.next_retry_at,
      
      // Include output data if completed
      outputData: job.status === 'completed' ? job.output_data : undefined,
      
      // Include error data if failed
      errorData: job.status === 'failed' ? job.error_data : undefined,
      
      // Estimated completion time
      estimatedCompletion: job.estimated_completion
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Failed to get job status:', error)
    throw error
  }
})

// Cancel a job
export const DELETE = withApiErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const jobId = params.id

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  try {
    const success = await backgroundJobService.cancelJob(jobId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to cancel job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Job cancelled successfully',
      jobId
    })

  } catch (error) {
    console.error('Failed to cancel job:', error)
    throw error
  }
})
