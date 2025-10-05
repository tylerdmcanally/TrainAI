'use client'

import { useEffect, useState } from 'react'

export default function TestMiddlewarePage() {
  const [cookies, setCookies] = useState<any[]>([])
  const [authStatus, setAuthStatus] = useState<string>('checking')

  useEffect(() => {
    // Get all cookies
    if (typeof document !== 'undefined') {
      const allCookies = document.cookie.split('; ').map(cookie => {
        const [name, value] = cookie.split('=')
        return { name, value: value?.substring(0, 50) + (value?.length > 50 ? '...' : '') }
      })
      setCookies(allCookies)

      // Check for Supabase auth cookies
      const supabaseAuthCookie = allCookies.find(cookie => 
        cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')
      )

      if (supabaseAuthCookie) {
        setAuthStatus('authenticated')
      } else {
        setAuthStatus('not authenticated')
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Middleware Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <p className={`text-lg font-medium ${authStatus === 'authenticated' ? 'text-green-600' : 'text-red-600'}`}>
            Status: {authStatus}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">All Cookies</h2>
          {cookies.length > 0 ? (
            <div className="space-y-2">
              {cookies.map((cookie, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <strong>{cookie.name}:</strong> {cookie.value}
                  {cookie.name.startsWith('sb-') && cookie.name.includes('auth-token') && (
                    <span className="ml-2 text-green-600 font-semibold">✅ Supabase Auth Cookie</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No cookies found.</p>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/dashboard/owner" className="text-blue-600 hover:underline">
            Try Dashboard Again
          </a>
        </div>
      </div>
    </div>
  )
}
