import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get assignments for this training
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        employee_id,
        status,
        progress,
        started_at,
        completed_at,
        created_at,
        users:employee_id (
          name,
          email
        )
      `)
      .eq('module_id', id)

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignments: assignments || [] })
  } catch (error) {
    console.error('Assignments endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
