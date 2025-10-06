import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTrainingAssignmentEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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
      assigned_by: user.id, // Required by RLS policy
      status: 'not_started',
      progress: 0,
    }))

    const { data, error } = await supabase
      .from('assignments')
      .upsert(assignments, {
        onConflict: 'module_id,employee_id'
      })
      .select()

    if (error) {
      console.error('Error creating assignments:', error)
      return NextResponse.json(
        { error: 'Failed to create assignments' },
        { status: 500 }
      )
    }

    // Get owner info for email
    const { data: ownerProfile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()

    // Send email notifications to each employee
    if (data && data.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const trainingUrl = `${baseUrl}/dashboard/employee/training/${id}`

      // Get employee details for emails
      const { data: employees } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', employeeIds)

      // Send emails in parallel
      const emailPromises = employees?.map(async (employee) => {
        try {
          await sendTrainingAssignmentEmail({
            to: employee.email,
            employeeName: employee.name,
            trainingTitle: training.title,
            trainingDescription: training.description,
            assignedBy: ownerProfile?.name || 'Your manager',
            trainingUrl,
          })
        } catch (error) {
          console.error(`Failed to send email to ${employee.email}:`, error)
          // Don't fail the request if email fails
        }
      }) || []

      await Promise.allSettled(emailPromises)
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
