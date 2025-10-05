import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { perf } from '@/lib/utils/performance-monitor'

export const GET = withApiErrorHandler(async (_request: NextRequest) => {
  const supabase = await createClient()

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

  const isOwner = profile.role === 'owner'

  perf.start('get-trainings-optimized', { 
    companyId: profile.company_id, 
    isOwner,
    userId: user.id 
  })

  let trainings: unknown[] = []
  let assignments: unknown[] = []

  if (isOwner) {
    // Use optimized function to get training modules with counts
    const { data, error } = await supabase
      .rpc('get_training_modules_with_counts', { company_uuid: profile.company_id })

    if (error) {
      console.error('Error fetching training modules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch training modules' },
        { status: 500 }
      )
    }

    trainings = data || []
  } else {
    // Use optimized function to get assignments with training details
    const { data, error } = await supabase
      .rpc('get_assignments_with_training', { employee_uuid: user.id })

    if (error) {
      console.error('Error fetching assignments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    assignments = data || []
    trainings = assignments.map(a => ({
      id: a.module_id,
      title: a.training_title,
      description: a.training_description,
      video_duration: a.training_video_duration,
      status: a.training_status,
      assignment_status: a.status,
      assignment_progress: a.progress,
      started_at: a.started_at,
      completed_at: a.completed_at,
      created_at: a.created_at
    }))
  }

  const metric = perf.end('get-trainings-optimized')
  console.log('Optimized training query performance:', metric)

  // Calculate stats based on role
  const stats = isOwner ? {
    totalTrainings: trainings.length,
    publishedTrainings: trainings.filter(t => t.status === 'published').length,
    draftTrainings: trainings.filter(t => t.status === 'draft').length,
    totalAssignments: trainings.reduce((sum, t) => sum + (t.assignment_count || 0), 0),
    completedAssignments: trainings.reduce((sum, t) => sum + (t.completion_count || 0), 0)
  } : {
    totalAssignments: assignments.length,
    completedAssignments: assignments.filter(a => a.status === 'completed').length,
    inProgressAssignments: assignments.filter(a => a.status === 'in_progress').length,
    notStartedAssignments: assignments.filter(a => a.status === 'not_started').length
  }

  return NextResponse.json({
    trainings,
    stats,
    performance: {
      queryTime: metric?.duration,
      queryType: 'optimized',
      isOwner
    }
  })
})
