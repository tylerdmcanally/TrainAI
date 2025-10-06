'use client'

import { useEffect, useState } from 'react'

export default function TestAuthPage() {
  const [result, setResult] = useState<string>('Testing...')

  useEffect(() => {
    const testAuth = async () => {
      try {
        // Test if we can import and create supabase client
        const { createClient } = await import('@/lib/supabase/client')
        console.log('✅ Supabase client import successful')
        
        const supabase = createClient()
        console.log('✅ Supabase client created')
        
        // Test auth call
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('✅ Auth call completed:', { user: !!user, error })
        
        if (error) {
          setResult(`❌ Auth Error: ${error.message}`)
        } else if (user) {
          setResult(`✅ User found: ${user.email}`)
        } else {
          setResult('❌ No user authenticated')
        }
      } catch (err) {
        console.error('❌ Test failed:', err)
        setResult(`❌ Test failed: ${err}`)
      }
    }

    testAuth()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p>Result: {result}</p>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Check browser console for detailed logs.
        </p>
      </div>
    </div>
  )
}
