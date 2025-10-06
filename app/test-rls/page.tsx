'use client'

import { useEffect, useState } from 'react'

export default function TestRLSPage() {
  const [results, setResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setResults(prev => [...prev, result])
  }

  useEffect(() => {
    const testRLS = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        // Test 1: Try to query companies table (should fail with RLS if not authenticated)
        addResult('🔄 Testing companies table query (should fail with RLS)...')
        
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
        
        if (companiesError) {
          addResult(`❌ Companies query failed (expected with RLS): ${companiesError.message}`)
          addResult(`   Error code: ${companiesError.code}`)
          addResult(`   Error details: ${companiesError.details}`)
        } else {
          addResult('✅ Companies query succeeded (RLS might be disabled)')
          addResult(`   Data: ${JSON.stringify(companiesData)}`)
        }

        // Test 2: Try to query users table
        addResult('🔄 Testing users table query...')
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .limit(1)
        
        if (usersError) {
          addResult(`❌ Users query failed: ${usersError.message}`)
          addResult(`   Error code: ${usersError.code}`)
        } else {
          addResult('✅ Users query succeeded')
          addResult(`   Data: ${JSON.stringify(usersData)}`)
        }

        // Test 3: Try to get current user
        addResult('🔄 Testing auth.getUser()...')
        
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          addResult(`❌ Auth getUser failed: ${authError.message}`)
        } else if (user) {
          addResult(`✅ User authenticated: ${user.email}`)
        } else {
          addResult('ℹ️ No user authenticated (this is normal)')
        }

        // Test 4: Try a simple system query that should work
        addResult('🔄 Testing system query (should always work)...')
        
        const { data: systemData, error: systemError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .limit(1)
        
        if (systemError) {
          addResult(`❌ System query failed: ${systemError.message}`)
        } else {
          addResult('✅ System query succeeded')
        }

      } catch (error) {
        addResult(`❌ Test failed: ${error}`)
      }
    }

    testRLS()
  }, [])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">RLS (Row Level Security) Test</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Test Results:</h2>
        <div className="space-y-1">
          {results.map((result, index) => (
            <div key={index} className="text-sm font-mono">
              {result}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 rounded">
        <h3 className="font-semibold">Expected Behavior:</h3>
        <ul className="text-sm mt-2 space-y-1">
          <li>• Companies/Users queries should FAIL with RLS enabled</li>
          <li>• Auth getUser should work or timeout</li>
          <li>• System queries should work</li>
          <li>• If all queries timeout, RLS might be misconfigured</li>
        </ul>
      </div>
    </div>
  )
}
