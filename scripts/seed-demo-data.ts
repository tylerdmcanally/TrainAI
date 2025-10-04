import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...\n')

    // 1. Create demo owner first (without company)
    console.log('Creating demo owner...')
    const ownerEmail = 'owner@acme.com'
    const ownerPassword = 'demo123'

    const { data: authOwner, error: authOwnerError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true
    })

    if (authOwnerError) throw authOwnerError

    const { error: ownerProfileError } = await supabase
      .from('users')
      .insert({
        id: authOwner.user.id,
        email: ownerEmail,
        name: 'Sarah Johnson',
        role: 'owner'
      })

    if (ownerProfileError) throw ownerProfileError
    console.log(`✓ Created owner: ${ownerEmail} (password: ${ownerPassword})`)

    // 2. Create demo company with owner_id
    console.log('\nCreating demo company...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Acme Corporation',
        plan: 'growth',
        owner_id: authOwner.user.id
      })
      .select()
      .single()

    if (companyError) throw companyError
    console.log(`✓ Created company: ${company.name}`)

    // 3. Update owner with company_id
    const { error: updateOwnerError } = await supabase
      .from('users')
      .update({
        company_id: company.id
      })
      .eq('id', authOwner.user.id)

    if (updateOwnerError) throw updateOwnerError

    // 4. Create demo employees
    console.log('\nCreating demo employees...')
    const employees = [
      { name: 'John Smith', email: 'john@acme.com' },
      { name: 'Emily Davis', email: 'emily@acme.com' },
      { name: 'Michael Brown', email: 'michael@acme.com' }
    ]

    for (const emp of employees) {
      const { data: authEmp, error: authEmpError } = await supabase.auth.admin.createUser({
        email: emp.email,
        password: 'demo123',
        email_confirm: true
      })

      if (authEmpError) throw authEmpError

      await supabase
        .from('users')
        .insert({
          id: authEmp.user.id,
          email: emp.email,
          name: emp.name,
          role: 'employee',
          company_id: company.id
        })

      console.log(`  ✓ Created employee: ${emp.email}`)
    }

    console.log('\n✅ Demo data seeded successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('   Owner: owner@acme.com / demo123')
    console.log('   Employee: john@acme.com / demo123')
    console.log('\n💡 Tip: Create trainings as the owner, then assign them to employees!')

  } catch (error) {
    console.error('❌ Error seeding demo data:', error)
  }
}

seedDemoData()
