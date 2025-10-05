'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FixProfilePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const checkAndFixProfile = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('=== FIXING USER PROFILE ===')

      // 1. Get current auth user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('Current user:', { user, userError })

      if (!user) {
        throw new Error('No authenticated user found')
      }

      // 2. Check if profile exists
      console.log('Checking if profile exists...')
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Profile check result:', { existingProfile, profileCheckError })

      if (existingProfile) {
        setResult({
          success: true,
          message: 'Profile already exists',
          profile: existingProfile
        })
        return
      }

      // 3. Get user metadata
      const userMetadata = user.user_metadata
      console.log('User metadata:', userMetadata)

      if (!userMetadata?.company_name) {
        throw new Error('No company name found in user metadata')
      }

      // 4. Create or find company
      console.log('Creating/finding company...')
      let company
      const { data: existingCompany, error: companyCheckError } = await supabase
        .from('companies')
        .select('*')
        .eq('name', userMetadata.company_name.trim())
        .single()

      console.log('Company check result:', { existingCompany, companyCheckError })

      if (existingCompany) {
        company = existingCompany
        console.log('Using existing company:', company)
      } else {
        // Create new company
        const { data: newCompany, error: companyCreateError } = await supabase
          .from('companies')
          .insert({
            name: userMetadata.company_name.trim(),
            owner_id: user.id,
            plan: 'starter',
          })
          .select()
          .single()

        console.log('Company creation result:', { newCompany, companyCreateError })

        if (companyCreateError) {
          throw new Error(`Failed to create company: ${companyCreateError.message}`)
        }

        company = newCompany
        console.log('Created new company:', company)
      }

      // 5. Create user profile
      console.log('Creating user profile...')
      const { data: newProfile, error: profileCreateError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: userMetadata.name || user.email,
          role: 'owner',
          company_id: company.id,
        })
        .select()
        .single()

      console.log('Profile creation result:', { newProfile, profileCreateError })

      if (profileCreateError) {
        throw new Error(`Failed to create profile: ${profileCreateError.message}`)
      }

      setResult({
        success: true,
        message: 'Profile created successfully',
        profile: newProfile,
        company: company
      })

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
            This page will check if your user profile exists in the database and create it if missing.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={checkAndFixProfile} 
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
        </CardContent>
      </Card>
    </div>
  )
}
