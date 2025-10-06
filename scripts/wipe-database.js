#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function wipeDatabase() {
  console.log('🧹 Starting database cleanup...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    console.log('🗑️  Deleting chat_messages...')
    await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🗑️  Deleting assignments...')
    await supabase.from('assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🗑️  Deleting training_modules...')
    await supabase.from('training_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🗑️  Deleting users...')
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🗑️  Deleting companies...')
    await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    console.log('🗑️  Deleting auth users...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message)
    } else {
      for (const user of authUsers.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (deleteError) {
          console.error(`❌ Error deleting user ${user.id}:`, deleteError.message)
        } else {
          console.log(`✅ Deleted user: ${user.email}`)
        }
      }
    }
    
    console.log('✅ Database cleanup completed!')
    console.log('🎉 Ready for fresh testing!')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
    process.exit(1)
  }
}

wipeDatabase()
