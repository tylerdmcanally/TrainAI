import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { employeeIds } = await request.json()

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: 'Employee IDs required' },
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

    // Verify user is owner and training belongs to them
    const { data: training } = await supabase
      .from('training_modules')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (!training || training.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Training not found or access denied' },
        { status: 404 }
      )
    }

    // Create assignments (using upsert to avoid duplicates)
    const assignments = employeeIds.map(employeeId => ({
      module_id: id,
      employee_id: employeeId,
      status: 'not_started',
      progress: 0,
    }))

    const { data, error } = await supabase
      .from('assignments')
      .upsert(assignments, {
        onConflict: 'module_id,employee_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Error creating assignments:', error)
      return NextResponse.json(
        { error: 'Failed to create assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      assignments: data,
      message: `Assigned training to ${employeeIds.length} employee(s)`
    })
  } catch (error) {
    console.error('Assign endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
