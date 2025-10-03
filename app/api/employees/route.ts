import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData || !userData.company_id) {
      return NextResponse.json(
        { error: 'User not associated with a company' },
        { status: 400 }
      )
    }

    // Only owners can see employees
    if (userData.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can view employees' },
        { status: 403 }
      )
    }

    console.log('Fetching employees for company:', userData.company_id)

    // Get all employees in the company (excluding owners)
    const { data: employees, error: employeesError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('company_id', userData.company_id)
      .eq('role', 'employee')
      .order('name')

    console.log('Employees query result:', employees, 'Error:', employeesError)

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)

      // Try with admin client to see if it's an RLS issue
      const { createClient: createAdminClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { data: adminEmployees } = await supabaseAdmin
        .from('users')
        .select('id, email, name, role, company_id')
        .eq('role', 'employee')

      console.log('Admin client found employees:', adminEmployees)

      return NextResponse.json(
        { error: 'Failed to fetch employees', debug: { adminEmployees } },
        { status: 500 }
      )
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error) {
    console.error('Employees endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
