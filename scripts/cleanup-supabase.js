#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupSupabase() {
  console.log('🧹 Starting Supabase cleanup...')
  
  try {
    // Get counts before cleanup
    console.log('\n📊 Current data counts:')
    const tables = ['chat_messages', 'assignments', 'training_modules', 'users', 'companies']
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      console.log(`  ${table}: ${count || 0} records`)
    }

    // Get auth users count
    const { data: authUsers, count: authCount } = await supabase.auth.admin.listUsers()
    console.log(`  auth.users: ${authCount || authUsers?.length || 0} records`)

    // Confirm cleanup
    console.log('\n⚠️  This will delete ALL data from your Supabase database!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')
    
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('\n🗑️  Deleting data...')

    // Delete in correct order (respecting foreign key constraints)
    console.log('  Deleting chat_messages...')
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    if (chatError) console.error('Chat messages error:', chatError)

    console.log('  Deleting assignments...')
    const { error: assignmentsError } = await supabase
      .from('assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (assignmentsError) console.error('Assignments error:', assignmentsError)

    console.log('  Deleting training_modules...')
    const { error: trainingError } = await supabase
      .from('training_modules')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (trainingError) console.error('Training modules error:', trainingError)

    console.log('  Deleting users...')
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (usersError) console.error('Users error:', usersError)

    console.log('  Deleting companies...')
    const { error: companiesError } = await supabase
      .from('companies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (companiesError) console.error('Companies error:', companiesError)

    // Delete auth users
    console.log('  Deleting auth users...')
    const { data: allAuthUsers } = await supabase.auth.admin.listUsers()
    if (allAuthUsers?.users) {
      for (const user of allAuthUsers.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) console.error(`Auth user delete error for ${user.id}:`, deleteError)
      }
    }

    // Verify cleanup
    console.log('\n✅ Cleanup complete! Final counts:')
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      console.log(`  ${table}: ${count || 0} records`)
    }

    const { data: finalAuthUsers, count: finalAuthCount } = await supabase.auth.admin.listUsers()
    console.log(`  auth.users: ${finalAuthCount || finalAuthUsers?.length || 0} records`)

    console.log('\n🎉 Supabase database is now clean and ready for fresh testing!')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

cleanupSupabase()
