#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function verifyCleanup() {
  console.log('🔍 Verifying database cleanup...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const tables = ['chat_messages', 'assignments', 'training_modules', 'users', 'companies']
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Error checking ${table}:`, error.message)
      } else {
        console.log(`📊 ${table}: ${count} records`)
      }
    }
    
    // Check auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.error('❌ Error checking auth users:', authError.message)
    } else {
      console.log(`📊 auth.users: ${authUsers.users.length} users`)
    }
    
    console.log('✅ Verification complete!')
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message)
  }
}

verifyCleanup()
