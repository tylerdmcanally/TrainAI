import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Service client for RLS bypass (administrative operations)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
      return NextResponse.json({ error: 'Only owners can un-assign trainings' }, { status: 403 })
    }

    // Get request body
    const { employeeId, trainingId } = await request.json()

    if (!employeeId || !trainingId) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify the employee belongs to the same company
    const { data: employee } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', employeeId)
      .single()

    if (!employee || employee.company_id !== profile.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // First check if the assignment exists
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('module_id', trainingId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Delete the assignment using admin client to bypass RLS
    const { data: deletedData, error: deleteError } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('module_id', trainingId)
      .eq('employee_id', employeeId)
      .select()

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Training un-assigned successfully'
    })

  } catch (error: unknown) {
    console.error('Error deleting assignment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to un-assign training' },
      { status: 500 }
    )
  }
}
