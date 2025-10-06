'use client'

import { useEffect, useState } from 'react'

export default function DirectTestPage() {
  const [results, setResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setResults(prev => [...prev, result])
  }

  useEffect(() => {
    const testDirectConnection = async () => {
      try {
        // Test 1: Direct fetch to Supabase REST API
        addResult('🔄 Testing direct REST API connection...')
        
        const response = await fetch('https://alkafibcdspiqtffvltg.supabase.co/rest/v1/', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U'
          }
        })
        
        if (response.ok) {
          addResult('✅ Direct REST API connection successful')
        } else {
          addResult(`❌ REST API failed: ${response.status} ${response.statusText}`)
        }

        // Test 2: Try to query companies table
        addResult('🔄 Testing companies table query...')
        
        const companiesResponse = await fetch('https://alkafibcdspiqtffvltg.supabase.co/rest/v1/companies?select=count', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U'
          }
        })
        
        if (companiesResponse.ok) {
          addResult('✅ Companies table query successful')
        } else {
          addResult(`❌ Companies query failed: ${companiesResponse.status} ${companiesResponse.statusText}`)
        }

        // Test 3: Auth endpoint
        addResult('🔄 Testing auth endpoint...')
        
        const authResponse = await fetch('https://alkafibcdspiqtffvltg.supabase.co/auth/v1/user', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa2FmaWJjZHNwaXF0ZmZ2bHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjAzNDMsImV4cCI6MjA3NDk5NjM0M30.v6PDVdFABxNCTHXTlVSG3Hk-wYOlbe98u1nw9OfA5-U'
          }
        })
        
        if (authResponse.ok) {
          addResult('✅ Auth endpoint accessible')
        } else {
          addResult(`❌ Auth endpoint failed: ${authResponse.status} ${authResponse.statusText}`)
        }

      } catch (error) {
        addResult(`❌ Test failed: ${error}`)
      }
    }

    testDirectConnection()
  }, [])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Direct Supabase Connection Test</h1>
      
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
        <h3 className="font-semibold">Project Details:</h3>
        <div className="text-sm mt-2 space-y-1">
          <p><strong>Project ID:</strong> alkafibcdspiqtffvltg</p>
          <p><strong>URL:</strong> https://alkafibcdspiqtffvltg.supabase.co</p>
          <p><strong>Dashboard:</strong> <a href="https://supabase.com/dashboard/project/alkafibcdspiqtffvltg" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Dashboard</a></p>
        </div>
      </div>
    </div>
  )
}
