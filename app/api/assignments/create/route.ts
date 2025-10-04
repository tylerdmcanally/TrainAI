import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user (must be authenticated owner)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an owner
    const { data: profile } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can assign trainings' }, { status: 403 })
    }

    // Get request body
    const { employeeId, trainingIds } = await request.json()

    if (!employeeId || !trainingIds || !Array.isArray(trainingIds) || trainingIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify employee belongs to same company
    const { data: employee } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', employeeId)
      .single()

    if (!employee || employee.company_id !== profile.company_id || employee.role !== 'employee') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Verify all trainings belong to the owner's company
    const { data: trainings } = await supabase
      .from('training_modules')
      .select('id, company_id')
      .in('id', trainingIds)

    if (!trainings || trainings.length !== trainingIds.length) {
      return NextResponse.json({ error: 'One or more trainings not found' }, { status: 404 })
    }

    const invalidTraining = trainings.find(t => t.company_id !== profile.company_id)
    if (invalidTraining) {
      return NextResponse.json({ error: 'Cannot assign trainings from another company' }, { status: 403 })
    }

    // Create assignments
    const assignmentsToCreate = trainingIds.map(trainingId => ({
      module_id: trainingId,
      employee_id: employeeId,
      assigned_by: user.id,
      status: 'not_started',
      progress: 0,
    }))

    const { data: assignments, error: assignError } = await supabase
      .from('assignments')
      .insert(assignmentsToCreate)
      .select()

    if (assignError) {
      console.error('Assignment error:', assignError)
      return NextResponse.json({ error: assignError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assignments,
      message: `Successfully assigned ${assignments.length} training(s)`
    })

  } catch (error: any) {
    console.error('Error creating assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create assignments' },
      { status: 500 }
    )
  }
}
