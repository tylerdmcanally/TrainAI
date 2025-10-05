import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current auth user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No authenticated user found' }, { status: 401 })
    }

    console.log('Fixing profile for user:', user.id)

    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already exists',
        profile: existingProfile 
      })
    }

    // Get user metadata
    const userMetadata = user.user_metadata
    console.log('User metadata:', userMetadata)

    if (!userMetadata?.company_name) {
      return NextResponse.json({ error: 'No company name found in user metadata' }, { status: 400 })
    }

    // Create or find company
    let company
    const { data: existingCompany, error: companyCheckError } = await supabase
      .from('companies')
      .select('*')
      .eq('name', userMetadata.company_name.trim())
      .single()

    if (existingCompany) {
      company = existingCompany
      console.log('Using existing company:', company)
    } else {
      // Create new company
      const { data: newCompany, error: companyCreateError } = await supabase
        .from('companies')
        .insert({
          name: userMetadata.company_name.trim(),
          owner_id: user.id,
          plan: 'starter',
        })
        .select()
        .single()

      if (companyCreateError) {
        console.error('Company creation error:', companyCreateError)
        return NextResponse.json({ error: `Failed to create company: ${companyCreateError.message}` }, { status: 500 })
      }

      company = newCompany
      console.log('Created new company:', company)
    }

    // Create user profile
    const { data: newProfile, error: profileCreateError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: userMetadata.name || user.email,
        role: 'owner',
        company_id: company.id,
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError)
      return NextResponse.json({ error: `Failed to create profile: ${profileCreateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile,
      company: company
    })

  } catch (error: any) {
    console.error('Error fixing profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
