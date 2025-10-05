import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { perf } from '@/lib/utils/performance-monitor'

export const GET = withApiErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const employeeId = searchParams.get('employeeId')

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get user's company and role
  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    )
  }

  // Determine which employee's progress to fetch
  const targetEmployeeId = employeeId || user.id
  const isOwner = profile.role === 'owner'

  // Owners can view any employee's progress, employees can only view their own
  if (!isOwner && targetEmployeeId !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  perf.start('get-progress-optimized', { 
    targetEmployeeId,
    isOwner 
  })

  // Use optimized function to get progress summary
  const { data: progressSummary, error: progressError } = await supabase
    .rpc('get_employee_progress_summary', { employee_uuid: targetEmployeeId })

  if (progressError) {
    console.error('Error fetching progress summary:', progressError)
    return NextResponse.json(
      { error: 'Failed to fetch progress summary' },
      { status: 500 }
    )
  }

  // Get detailed assignments with training info
  const { data: assignments, error: assignmentsError } = await supabase
    .rpc('get_assignments_with_training', { employee_uuid: targetEmployeeId })

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }

  const metric = perf.end('get-progress-optimized')
  console.log('Optimized progress query performance:', metric)

  return NextResponse.json({
    progressSummary: progressSummary?.[0] || {
      total_assignments: 0,
      completed_assignments: 0,
      in_progress_assignments: 0,
      not_started_assignments: 0,
      total_time_spent: 0,
      average_progress: 0
    },
    assignments: assignments || [],
    performance: {
      queryTime: metric?.duration,
      queryType: 'optimized'
    }
  })
})

export const POST = withApiErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient()
  const body = await request.json()
  const { assignmentId, progress, status, timeSpent } = body

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Validate input
  if (!assignmentId || progress === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields: assignmentId, progress' },
      { status: 400 }
    )
  }

  if (progress < 0 || progress > 100) {
    return NextResponse.json(
      { error: 'Progress must be between 0 and 100' },
      { status: 400 }
    )
  }

  perf.start('update-progress-optimized', { 
    assignmentId,
    progress,
    status,
    timeSpent 
  })

  // Use optimized function to update progress
  const { data: success, error } = await supabase
    .rpc('update_assignment_progress', {
      assignment_uuid: assignmentId,
      new_progress: progress,
      new_status: status || null,
      new_time_spent: timeSpent || null
    })

  const metric = perf.end('update-progress-optimized')
  console.log('Optimized progress update performance:', metric)

  if (error) {
    console.error('Error updating progress:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }

  if (!success) {
    return NextResponse.json(
      { error: 'Assignment not found or update failed' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    performance: {
      queryTime: metric?.duration,
      queryType: 'optimized'
    }
  })
})
