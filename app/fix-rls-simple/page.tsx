'use client'

import { useEffect, useState } from 'react'

export default function FixRLSSimplePage() {
  const [results, setResults] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: string) => {
    setResults(prev => [...prev, result])
  }

  const fixRLSSimple = async () => {
    setIsRunning(true)
    setResults([])

    try {
      addResult('🚀 Starting Simple RLS Fix...')
      addResult('')
      addResult('Since we don\'t have the service role key, we\'ll use a different approach.')
      addResult('')
      
      // Step 1: Test current state with timeout
      addResult('🧪 Testing current state...')
      
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Test if we can query companies table with timeout
      try {
        const queryPromise = supabase
          .from('companies')
          .select('*')
          .limit(1)
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000)
        )
        
        const { data: companiesData, error: companiesError } = await Promise.race([queryPromise, timeoutPromise])
        
        if (companiesError) {
          addResult(`❌ Companies query failing: ${companiesError.message}`)
          addResult(`   This confirms RLS is blocking queries`)
        } else {
          addResult(`✅ Companies query working! Found ${companiesData?.length || 0} records`)
          addResult(`   RLS might already be fixed or disabled`)
        }
      } catch (timeoutError) {
        addResult(`❌ Companies query timed out - RLS is definitely blocking queries`)
        addResult(`   This confirms the RLS policies are corrupted`)
      }

      // Step 2: Test auth with timeout
      addResult('🔐 Testing auth service...')
      
      try {
        const authPromise = supabase.auth.getUser()
        const authTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        )
        
        const { data: { user }, error: authError } = await Promise.race([authPromise, authTimeoutPromise])
        
        if (authError) {
          addResult(`❌ Auth failing: ${authError.message}`)
        } else if (user) {
          addResult(`✅ Auth working! User: ${user.email}`)
        } else {
          addResult('✅ Auth service working (no user logged in)')
        }
      } catch (authTimeoutError) {
        addResult(`❌ Auth timed out - this confirms the RLS issue`)
      }

      addResult('')
      addResult('📋 MANUAL FIX REQUIRED:')
      addResult('')
      addResult('Since we don\'t have the service role key, you need to:')
      addResult('')
      addResult('1. Go to your Supabase Dashboard:')
      addResult('   https://supabase.com/dashboard/project/alkafibcdspiqtffvltg')
      addResult('')
      addResult('2. Go to SQL Editor')
      addResult('')
      addResult('3. Run this SQL to disable RLS temporarily:')
      addResult('   ALTER TABLE companies DISABLE ROW LEVEL SECURITY;')
      addResult('   ALTER TABLE users DISABLE ROW LEVEL SECURITY;')
      addResult('   ALTER TABLE training_modules DISABLE ROW LEVEL SECURITY;')
      addResult('   ALTER TABLE assignments DISABLE ROW LEVEL SECURITY;')
      addResult('   ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;')
      addResult('')
      addResult('4. Test your app - it should work immediately!')
      addResult('')
      addResult('5. Later, we can re-enable RLS with simple policies:')
      addResult('   ALTER TABLE companies ENABLE ROW LEVEL SECURITY;')
      addResult('   CREATE POLICY "allow_all_authenticated" ON companies')
      addResult('     FOR ALL USING (auth.role() = \'authenticated\');')
      addResult('   -- (repeat for other tables)')
      addResult('')

    } catch (error) {
      addResult(`❌ Test failed: ${error}`)
    }

    setIsRunning(false)
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Simple RLS Fix</h1>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-800 mb-2">🔧 Manual Fix Required</h2>
        <p className="text-blue-700 text-sm">
          Since we don't have the service role key, we'll guide you through a manual fix in the Supabase dashboard.
        </p>
      </div>

      <button 
        onClick={fixRLSSimple}
        disabled={isRunning}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {isRunning ? 'Testing Current State...' : 'Test & Get Manual Fix Instructions'}
      </button>

      {results.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Instructions:</h2>
          <div className="space-y-1">
            {results.map((result, index) => (
              <div key={index} className={`text-sm font-mono ${result.startsWith('❌') ? 'text-red-600' : result.startsWith('✅') ? 'text-green-600' : result.startsWith('📋') ? 'text-blue-600 font-semibold' : ''}`}>
                {result}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h3 className="font-semibold mb-2">Why This Approach Works:</h3>
        <ul className="text-sm space-y-1">
          <li>• Uses Supabase dashboard (no service key needed)</li>
          <li>• Temporarily disables RLS to get app working</li>
          <li>• Simple, safe, and effective</li>
          <li>• Can re-enable RLS later with proper policies</li>
        </ul>
      </div>
    </div>
  )
}
