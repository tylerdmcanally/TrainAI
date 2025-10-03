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

    // Create the employee auth account using the service role
    // Note: This requires using the service role key, not the anon key
    // For now, we'll use the admin API through an edge function or manually create

    // Since we can't create users from client-side with regular auth,
    // we'll need to use Supabase Admin API
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

    // Create auth user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    })

    if (createUserError) {
      console.error('Error creating auth user:', createUserError)
      return NextResponse.json(
        { error: createUserError.message || 'Failed to create employee account' },
        { status: 500 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create employee account' },
        { status: 500 }
      )
    }

    // Create user profile using admin client to bypass RLS
    console.log('Creating profile for user:', newUser.user.id, 'with company_id:', userData.company_id)

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUser.user.id,
        email,
        name,
        role: 'employee',
        company_id: userData.company_id,
      })
      .select()

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      console.error('Profile data attempted:', { id: newUser.user.id, email, name, role: 'employee', company_id: userData.company_id })
      // Try to delete the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create employee profile' },
        { status: 500 }
      )
    }

    console.log('Profile created successfully:', profileData)

    return NextResponse.json({
      success: true,
      employee: {
        id: newUser.user.id,
        email,
        name,
      },
      message: 'Employee created successfully'
    })
  } catch (error) {
    console.error('Create employee endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
      )
  }
}
