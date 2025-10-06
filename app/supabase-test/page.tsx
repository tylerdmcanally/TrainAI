'use client'

import { useEffect, useState } from 'react'

export default function SupabaseTestPage() {
  const [results, setResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setResults(prev => [...prev, result])
  }

  useEffect(() => {
    const testSupabase = async () => {
      try {
        // Test 1: Basic import
        addResult('🔄 Testing Supabase import...')
        const { createClient } = await import('@/lib/supabase/client')
        addResult('✅ Supabase import successful')

        // Test 2: Client creation
        addResult('🔄 Creating Supabase client...')
        const supabase = createClient()
        addResult('✅ Supabase client created')

        // Test 3: Simple query (no auth required)
        addResult('🔄 Testing basic database connection...')
        const { data, error } = await supabase
          .from('companies')
          .select('count')
          .limit(1)
        
        if (error) {
          addResult(`❌ Database query failed: ${error.message}`)
        } else {
          addResult('✅ Database connection successful')
        }

        // Test 4: Auth call with shorter timeout
        addResult('🔄 Testing auth call (5 second timeout)...')
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        
        try {
          const { data: { user }, error: authError } = await Promise.race([authPromise, timeoutPromise])
          if (authError) {
            addResult(`❌ Auth error: ${authError.message}`)
          } else if (user) {
            addResult(`✅ User authenticated: ${user.email}`)
          } else {
            addResult('ℹ️ No user authenticated (this is normal if not logged in)')
          }
        } catch (timeoutError) {
          addResult('❌ Auth call timed out - likely network or Supabase project issue')
        }

      } catch (error) {
        addResult(`❌ Test failed: ${error}`)
      }
    }

    testSupabase()
  }, [])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
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
      
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold">Possible Issues:</h3>
        <ul className="text-sm mt-2 space-y-1">
          <li>• Supabase project is paused (check dashboard)</li>
          <li>• Network connectivity issues</li>
          <li>• Supabase service is down</li>
          <li>• Environment variables pointing to wrong project</li>
        </ul>
      </div>
    </div>
  )
}
