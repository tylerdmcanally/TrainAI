import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { trainingId } = await request.json()

    if (!trainingId) {
      return NextResponse.json(
        { error: 'Training ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Update assignment to completed
    const { data, error } = await supabase
      .from('assignments')
      .update({
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('module_id', trainingId)
      .eq('employee_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error completing training:', error)
      return NextResponse.json(
        { error: 'Failed to complete training' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignment: data,
    })
  } catch (error) {
    console.error('Complete endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
