import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanupDemoData() {
  try {
    console.log('🧹 Cleaning up demo data...\n')

    // Delete demo company (cascade will delete users, trainings, assignments)
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('name', 'Acme Corporation')

    if (error) throw error

    // Delete auth users
    const demoEmails = [
      'owner@acme.com',
      'john@acme.com', 
      'emily@acme.com',
      'michael@acme.com'
    ]

    for (const email of demoEmails) {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const user = users.find(u => u.email === email)
        if (user) {
          await supabase.auth.admin.deleteUser(user.id)
          console.log(`  ✓ Deleted ${email}`)
        }
      } catch (err) {
        console.log(`  ⚠ Could not delete ${email}`)
      }
    }

    console.log('\n✅ Demo data cleaned up!')
  } catch (error) {
    console.error('❌ Error cleaning up:', error)
  }
}

cleanupDemoData()
