'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugAuthPage() {
  const [authStatus, setAuthStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      try {
        console.log('Debug: Checking auth status...')
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('Debug: Auth result:', { user, error })
        setAuthStatus({ user, error })
        
        // Also check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log('Debug: Session result:', { session, sessionError })
        
        setAuthStatus(prev => ({ ...prev, session, sessionError }))
      } catch (err) {
        console.error('Debug: Error checking auth:', err)
        setAuthStatus({ error: err })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading auth status...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(authStatus, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Check the browser console for additional debug information.
        </p>
      </div>
    </div>
  )
}
