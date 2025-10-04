import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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

    // Get user's company and verify they're an owner
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can create employees' },
        { status: 403 }
      )
    }

    // For now, we'll create a simple employee record without auth
    // The employee will need to sign up manually with the provided credentials
    const { data: employeeData, error: employeeError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        role: 'employee',
        company_id: userData.company_id,
      })
      .select()

    if (employeeError) {
      console.error('Error creating employee profile:', employeeError)
      return NextResponse.json(
        { error: 'Failed to create employee profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employeeData[0].id,
        email,
        name,
      },
      message: 'Employee profile created. They can now sign up with the provided credentials.',
      instructions: 'The employee should visit /auth/signup and use the provided email and password to complete their account setup.'
    })
  } catch (error) {
    console.error('Create employee endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

