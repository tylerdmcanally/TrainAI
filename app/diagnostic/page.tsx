'use client'

import { useEffect, useState } from 'react'

interface TestResult {
  test: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export default function DiagnosticPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (test: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details }])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    // Test 1: Environment Variables
    addResult('Environment Variables', 'pending', 'Checking environment variables...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      addResult('Environment Variables', 'error', 'Missing required environment variables')
      setIsRunning(false)
      return
    }
    
    addResult('Environment Variables', 'success', 'Environment variables present', {
      url: supabaseUrl.substring(0, 30) + '...',
      key: supabaseKey.substring(0, 20) + '...'
    })

    // Test 2: Supabase Client Creation
    addResult('Client Creation', 'pending', 'Testing Supabase client creation...')
    
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      addResult('Client Creation', 'success', 'Supabase client created successfully')
      
      // Test 3: Basic Database Connection
      addResult('Database Connection', 'pending', 'Testing basic database connection...')
      
      try {
        const dbPromise = supabase
          .from('companies')
          .select('count')
          .limit(1)
        
        const dbTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
        
        const { data: dbData, error: dbError } = await Promise.race([dbPromise, dbTimeoutPromise])
        
        if (dbError) {
          addResult('Database Connection', 'error', `Database query failed: ${dbError.message}`, dbError)
        } else {
          addResult('Database Connection', 'success', 'Database connection successful')
        }
      } catch (timeoutError) {
        addResult('Database Connection', 'error', `Database query timed out - this is the root cause!`, timeoutError)
      }

      // Test 4: Auth Service Health Check
      addResult('Auth Service', 'pending', 'Testing auth service health...')
      
      try {
        // Test with a very short timeout first
        const authPromise = supabase.auth.getUser()
        const quickTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Quick timeout')), 2000)
        )
        
        const { data: { user }, error: authError } = await Promise.race([authPromise, quickTimeout])
        
        if (authError) {
          addResult('Auth Service', 'warning', `Auth error: ${authError.message}`, authError)
        } else if (user) {
          addResult('Auth Service', 'success', `User authenticated: ${user.email}`, user)
        } else {
          addResult('Auth Service', 'success', 'Auth service working (no user logged in)')
        }
      } catch (timeoutError) {
        addResult('Auth Service', 'error', 'Auth service timeout - this is the root cause!', timeoutError)
        
        // Test 5: Direct REST API to Auth Endpoint
        addResult('Direct Auth API', 'pending', 'Testing direct auth API call...')
        
        try {
          const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          })
          
          if (authResponse.ok) {
            addResult('Direct Auth API', 'success', 'Direct auth API call successful')
          } else {
            addResult('Direct Auth API', 'error', `Direct auth API failed: ${authResponse.status} ${authResponse.statusText}`)
          }
        } catch (directError) {
          addResult('Direct Auth API', 'error', `Direct auth API error: ${directError}`, directError)
        }
      }

      // Test 6: Network Connectivity
      addResult('Network Test', 'pending', 'Testing basic network connectivity...')
      
      try {
        const networkResponse = await fetch('https://httpbin.org/get', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (networkResponse.ok) {
          addResult('Network Test', 'success', 'Network connectivity working')
        } else {
          addResult('Network Test', 'error', `Network test failed: ${networkResponse.status}`)
        }
      } catch (networkError) {
        addResult('Network Test', 'error', `Network error: ${networkError}`)
      }

      // Test 7: Supabase Project Status Check
      addResult('Project Status', 'pending', 'Checking if project might be paused...')
      
      try {
        const statusResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })
        
        if (statusResponse.ok) {
          addResult('Project Status', 'success', 'Project appears to be active')
        } else if (statusResponse.status === 403) {
          addResult('Project Status', 'warning', 'Project might be paused or have access restrictions')
        } else {
          addResult('Project Status', 'error', `Project status check failed: ${statusResponse.status}`)
        }
      } catch (statusError) {
        addResult('Project Status', 'error', `Project status error: ${statusError}`)
      }

    } catch (error) {
      addResult('Client Creation', 'error', `Failed to create Supabase client: ${error}`)
    }

    setIsRunning(false)
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      default: return '🔄'
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Supabase Diagnostic Tool</h1>
      
      <div className="mb-6">
        <button 
          onClick={runDiagnostics}
          disabled={isRunning}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostic'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Diagnostic Results:</h2>
          {results.map((result, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getStatusIcon(result.status)}</span>
                <h3 className="font-semibold">{result.test}</h3>
                <span className={`text-sm ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-700">{result.message}</p>
              {result.details && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-600 cursor-pointer">Show Details</summary>
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ul className="text-sm space-y-1">
          <li>• If auth service is timing out, check Supabase project dashboard</li>
          <li>• Verify project is not paused or in maintenance mode</li>
          <li>• Check if RLS policies are blocking auth operations</li>
          <li>• Consider recreating the Supabase project if corrupted</li>
        </ul>
      </div>
    </div>
  )
}
