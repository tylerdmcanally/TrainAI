import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const trainingId = searchParams.get('trainingId')

    if (!trainingId) {
      return NextResponse.json(
        { error: 'Training ID is required' },
        { status: 400 }
      )
    }

    // Get assignment/progress for this training
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('module_id', trainingId)
      .eq('employee_id', user.id)
      .single()

    if (error || !assignment) {
      return NextResponse.json(null)
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    )
  }
}
