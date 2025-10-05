'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FixProfilePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fixProfile = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('Fixing profile...')
      const response = await fetch('/api/fix-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      console.log('Fix profile response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix profile')
      }

      setResult(data)

    } catch (err: any) {
      console.error('Error fixing profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Fix User Profile</CardTitle>
          <p className="text-gray-600">
            This will check if your user profile exists in the database and create it if missing.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={fixProfile} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Checking/Fixing Profile...' : 'Check and Fix Profile'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Result:</h3>
              <p className="text-green-700 mb-2">{result.message}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Checks if your profile exists in the users table</li>
              <li>If missing, creates it using your auth user data</li>
              <li>Creates or finds your company</li>
              <li>Sets you as the owner of the company</li>
            </ul>
          </div>

          {result?.success && (
            <div className="mt-4">
              <Button 
                onClick={() => window.location.href = '/dashboard/owner'} 
                className="w-full"
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}