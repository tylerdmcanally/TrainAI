import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      trainingId,
      currentPosition,
      completedCheckpoints,
      timeSpent
    } = await request.json()

    // Find or create assignment
    let { data: assignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('module_id', trainingId)
      .eq('employee_id', user.id)
      .single()

    if (!assignment) {
      // Create new assignment if it doesn't exist
      const { data: newAssignment, error: createError } = await supabase
        .from('assignments')
        .insert({
          module_id: trainingId,
          employee_id: user.id,
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) throw createError
      assignment = newAssignment
    }

    // Get training to find total number of checkpoints
    const { data: training } = await supabase
      .from('training_modules')
      .select('chapters')
      .eq('id', trainingId)
      .single()

    // Calculate progress percentage based on completed checkpoints
    const totalCheckpoints = training?.chapters?.length || 1
    const uniqueCompleted = new Set(completedCheckpoints).size
    const progressPercentage = Math.round((uniqueCompleted / totalCheckpoints) * 100)

    // Update assignment with progress
    const { error: updateError } = await supabase
      .from('assignments')
      .update({
        current_position: currentPosition,
        completed_checkpoints: completedCheckpoints,
        time_spent: timeSpent,
        last_watched_at: new Date().toISOString(),
        status: progressPercentage === 100 ? 'completed' : 'in_progress',
        progress: progressPercentage,
        completed_at: progressPercentage === 100 ? new Date().toISOString() : null,
      })
      .eq('id', assignment.id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save progress error:', error)
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    )
  }
}
