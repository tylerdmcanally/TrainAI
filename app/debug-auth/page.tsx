'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      // Get all cookies
      setCookies(document.cookie)
      
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">User:</h2>
          <pre className="text-sm">{JSON.stringify(user, null, 2)}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Cookies:</h2>
          <pre className="text-sm">{cookies || 'No cookies found'}</pre>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">All Supabase Cookies:</h2>
          <div className="text-sm space-y-1">
            {document.cookie.split(';').map(cookie => {
              if (cookie.includes('supabase') || cookie.includes('sb-')) {
                return <div key={cookie}>{cookie.trim()}</div>
              }
              return null
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
