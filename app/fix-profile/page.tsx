'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function FixProfilePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const fixProfile = async () => {
    setLoading(true)
    setResult('Fixing profile for owner@test.com...')

    try {
      const supabase = createClient()

      // Step 1: Get the authenticated user
      setResult('Step 1: Getting authenticated user...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setResult('❌ No authenticated user found. Please log in first.')
        return
      }

      setResult(`✅ Found user: ${user.email}`)

      // Step 2: Check if profile exists
      setResult('Step 2: Checking if profile exists...')
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        setResult('✅ Profile already exists! No fix needed.')
        return
      }

      setResult('❌ Profile missing, creating it...')

      // Step 3: Create company first
      setResult('Step 3: Creating company...')
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: 'The Test Company',
          owner_id: user.id,
          plan: 'starter',
        })
        .select()
        .single()

      if (companyError) {
        setResult(`❌ Company creation failed: ${companyError.message}`)
        return
      }

      setResult(`✅ Company created: ${company.name}`)

      // Step 4: Create user profile
      setResult('Step 4: Creating user profile...')
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: 'Test Owner',
          role: 'owner',
          company_id: company.id,
        })

      if (profileError) {
        setResult(`❌ Profile creation failed: ${profileError.message}`)
        return
      }

      setResult('✅ Profile created successfully! You can now use the dashboard.')
      
      // Auto-redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard/owner'
      }, 2000)

    } catch (error) {
      setResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-blue-100 flex items-center justify-center p-8">
      <Card className="w-full max-w-md border-blue-100 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Fix Missing Profile</CardTitle>
          <CardDescription>Create missing profile data for authenticated user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            This will create the missing profile and company data for your authenticated user.
          </p>

          <Button
            onClick={fixProfile}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Fixing...' : 'Fix Profile'}
          </Button>

          {result && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm whitespace-pre-line">{result}</p>
            </div>
          )}

          <div className="text-center">
            <a href="/test-login" className="text-blue-600 hover:text-blue-700 text-sm">
              Back to Test Login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
