import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get all published trainings for this company
    const { data: trainings, error: trainingsError } = await supabase
      .from('training_modules')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (trainingsError) {
      console.error('Error fetching trainings:', trainingsError)
      return NextResponse.json(
        { error: 'Failed to fetch trainings' },
        { status: 500 }
      )
    }

    // Get URL parameter for employee_id if provided (to fetch assignments)
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')

    let assignments = []
    if (employeeId) {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('module_id, status')
        .eq('employee_id', employeeId)

      if (!assignmentsError && assignmentsData) {
        assignments = assignmentsData
      }
    }

    return NextResponse.json({
      trainings: trainings || [],
      assignments: assignments,
    })
  } catch (error) {
    console.error('Published trainings endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
