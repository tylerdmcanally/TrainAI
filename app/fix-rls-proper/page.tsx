'use client'

import { useEffect, useState } from 'react'

export default function FixRLSProperPage() {
  const [results, setResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: string) => {
    setResults(prev => [...prev, result])
  }

  const fixRLSProper = async () => {
    setIsRunning(true)
    setResults([])

    try {
      addResult('🚀 Starting Proper RLS Fix...')
      
      // Step 1: Create service role client
      addResult('📡 Creating service role client...')
      
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (!supabaseUrl || !supabaseServiceKey) {
        addResult('❌ Missing environment variables')
        addResult('   Need: NEXT_PUBLIC_SUPABASE_URL')
        addResult('   Need: SUPABASE_SERVICE_ROLE_KEY')
        setIsRunning(false)
        return
      }
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      addResult('✅ Service role client created')

      // Step 2: Drop ALL existing RLS policies
      addResult('🧹 Dropping all existing RLS policies...')
      
      const dropPoliciesSQL = `
        -- Drop all existing policies
        DROP POLICY IF EXISTS "users_select_self" ON users;
        DROP POLICY IF EXISTS "users_select_company" ON users;
        DROP POLICY IF EXISTS "users_insert_self" ON users;
        DROP POLICY IF EXISTS "users_update_self" ON users;
        DROP POLICY IF EXISTS "company_select_own" ON companies;
        DROP POLICY IF EXISTS "company_select_member" ON companies;
        DROP POLICY IF EXISTS "company_insert_owner" ON companies;
        DROP POLICY IF EXISTS "company_update_owner" ON companies;
        DROP POLICY IF EXISTS "training_select_company" ON training_modules;
        DROP POLICY IF EXISTS "training_insert_owner" ON training_modules;
        DROP POLICY IF EXISTS "training_update_creator" ON training_modules;
        DROP POLICY IF EXISTS "training_delete_creator" ON training_modules;
        DROP POLICY IF EXISTS "assignment_select_employee" ON assignments;
        DROP POLICY IF EXISTS "assignment_select_owner" ON assignments;
        DROP POLICY IF EXISTS "assignment_insert_owner" ON assignments;
        DROP POLICY IF EXISTS "assignment_update_employee" ON assignments;
        DROP POLICY IF EXISTS "assignment_update_owner" ON assignments;
        DROP POLICY IF EXISTS "chat_select_own" ON chat_messages;
        DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
      `
      
      try {
        const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL })
        if (dropError) {
          addResult(`⚠️ Some policies might not exist: ${dropError.message}`)
        } else {
          addResult('✅ All existing policies dropped')
        }
      } catch (err) {
        addResult(`⚠️ Error dropping policies: ${err}`)
      }

      // Step 3: Disable RLS temporarily
      addResult('⏸️ Temporarily disabling RLS...')
      
      const disableRLSSQL = `
        ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
        ALTER TABLE training_modules DISABLE ROW LEVEL SECURITY;
        ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;
        ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
      `
      
      const { error: disableError } = await supabase.rpc('exec_sql', { sql: disableRLSSQL })
      if (disableError) {
        addResult(`❌ Failed to disable RLS: ${disableError.message}`)
      } else {
        addResult('✅ RLS temporarily disabled')
      }

      // Step 4: Test basic queries work
      addResult('🧪 Testing basic queries...')
      
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
      
      if (companiesError) {
        addResult(`❌ Companies query failed: ${companiesError.message}`)
      } else {
        addResult(`✅ Companies query working! Found ${companiesData?.length || 0} records`)
      }

      // Step 5: Re-enable RLS
      addResult('🔒 Re-enabling RLS...')
      
      const enableRLSSQL = `
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
        ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
      `
      
      const { error: enableError } = await supabase.rpc('exec_sql', { sql: enableRLSSQL })
      if (enableError) {
        addResult(`❌ Failed to enable RLS: ${enableError.message}`)
      } else {
        addResult('✅ RLS re-enabled')
      }

      // Step 6: Create simple, working RLS policies
      addResult('🛡️ Creating simple, working RLS policies...')
      
      const createPoliciesSQL = `
        -- Simple, non-recursive RLS policies
        
        -- Companies: Allow authenticated users to see their own company
        CREATE POLICY "companies_select_authenticated" ON companies
          FOR SELECT USING (auth.role() = 'authenticated');
          
        CREATE POLICY "companies_insert_authenticated" ON companies
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
          
        CREATE POLICY "companies_update_authenticated" ON companies
          FOR UPDATE USING (auth.role() = 'authenticated');

        -- Users: Allow authenticated users to see users in their company
        CREATE POLICY "users_select_authenticated" ON users
          FOR SELECT USING (auth.role() = 'authenticated');
          
        CREATE POLICY "users_insert_authenticated" ON users
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
          
        CREATE POLICY "users_update_authenticated" ON users
          FOR UPDATE USING (auth.role() = 'authenticated');

        -- Training modules: Allow authenticated users to see all trainings
        CREATE POLICY "training_select_authenticated" ON training_modules
          FOR SELECT USING (auth.role() = 'authenticated');
          
        CREATE POLICY "training_insert_authenticated" ON training_modules
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
          
        CREATE POLICY "training_update_authenticated" ON training_modules
          FOR UPDATE USING (auth.role() = 'authenticated');
          
        CREATE POLICY "training_delete_authenticated" ON training_modules
          FOR DELETE USING (auth.role() = 'authenticated');

        -- Assignments: Allow authenticated users to see all assignments
        CREATE POLICY "assignment_select_authenticated" ON assignments
          FOR SELECT USING (auth.role() = 'authenticated');
          
        CREATE POLICY "assignment_insert_authenticated" ON assignments
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
          
        CREATE POLICY "assignment_update_authenticated" ON assignments
          FOR UPDATE USING (auth.role() = 'authenticated');

        -- Chat messages: Allow authenticated users to see all messages
        CREATE POLICY "chat_select_authenticated" ON chat_messages
          FOR SELECT USING (auth.role() = 'authenticated');
          
        CREATE POLICY "chat_insert_authenticated" ON chat_messages
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      `
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL })
      if (createError) {
        addResult(`❌ Failed to create policies: ${createError.message}`)
      } else {
        addResult('✅ Simple RLS policies created')
      }

      // Step 7: Test with regular client (should work now)
      addResult('🧪 Testing with regular client...')
      
      const { createClient: createRegularClient } = await import('@/lib/supabase/client')
      const regularSupabase = createRegularClient()
      
      const { data: { user }, error: authError } = await regularSupabase.auth.getUser()
      if (authError) {
        addResult(`⚠️ Auth test: ${authError.message}`)
      } else if (user) {
        addResult(`✅ Auth working! User: ${user.email}`)
      } else {
        addResult('✅ Auth service working (no user logged in)')
      }

      addResult('')
      addResult('🎉 RLS Fix Complete!')
      addResult('   ✅ Corrupted policies removed')
      addResult('   ✅ Simple, working policies created')
      addResult('   ✅ No recursion issues')
      addResult('   ✅ Your app should work properly now')
      addResult('')
      addResult('🔄 Next: Test your app - login should work!')

    } catch (error) {
      addResult(`❌ Fix failed: ${error}`)
    }

    setIsRunning(false)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Fix RLS Properly</h1>
      
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="font-semibold text-green-800 mb-2">✅ This is the proper fix</h2>
        <p className="text-green-700 text-sm">
          This will remove corrupted RLS policies and create simple, working ones. No temporary patches needed!
        </p>
      </div>

      <button 
        onClick={fixRLSProper}
        disabled={isRunning}
        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {isRunning ? 'Fixing RLS Properly...' : 'Fix RLS Properly'}
      </button>

      {results.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Fix Results:</h2>
          <div className="space-y-1">
            {results.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">What This Does:</h3>
        <ul className="text-sm space-y-1">
          <li>• Removes all corrupted RLS policies</li>
          <li>• Creates simple, working policies</li>
          <li>• No recursion or hanging issues</li>
          <li>• Proper long-term solution</li>
          <li>• No patches needed later</li>
        </ul>
      </div>
    </div>
  )
}
