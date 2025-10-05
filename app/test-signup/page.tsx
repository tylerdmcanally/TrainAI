'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestSignupPage() {
  const [email, setEmail] = useState('test@example.com')
  const [password, setPassword] = useState('testpassword123')
  const [name, setName] = useState('Test User')
  const [companyName, setCompanyName] = useState('Test Company')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const testSignup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('=== TESTING SIGNUP ===')
      console.log('Email:', email)
      console.log('Password:', password)
      console.log('Name:', name)
      console.log('Company:', companyName)

      // Step 1: Test auth signup
      console.log('\n1. Testing auth signup...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            company_name: companyName,
          },
        },
      })

      console.log('Auth response:', { authData, authError })

      if (authError) {
        throw new Error(`Auth signup failed: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('No user returned from auth signup')
      }

      setResult(prev => ({ ...prev, auth: { success: true, user: authData.user } }))

      // Step 2: Test company creation
      console.log('\n2. Testing company creation...')
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          owner_id: authData.user.id,
          plan: 'starter',
        })
        .select()
        .single()

      console.log('Company response:', { company, companyError })

      if (companyError) {
        throw new Error(`Company creation failed: ${companyError.message}`)
      }

      setResult(prev => ({ ...prev, company: { success: true, data: company } }))

      // Step 3: Test user profile creation
      console.log('\n3. Testing user profile creation...')
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name,
          role: 'owner',
          company_id: company.id,
        })

      console.log('Profile response:', { profileError })

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`)
      }

      setResult(prev => ({ ...prev, profile: { success: true } }))

      console.log('\n✅ All steps completed successfully!')

    } catch (err: any) {
      console.error('❌ Test failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('=== TESTING LOGIN ===')
      console.log('Email:', email)
      console.log('Password:', password)

      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('Login response:', { loginData, loginError })

      if (loginError) {
        throw new Error(`Login failed: ${loginError.message}`)
      }

      setResult(prev => ({ ...prev, login: { success: true, user: loginData.user } }))

      // Test fetching user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', loginData.user.id)
        .single()

      console.log('Profile fetch response:', { profile, profileError })

      if (profileError) {
        throw new Error(`Profile fetch failed: ${profileError.message}`)
      }

      setResult(prev => ({ ...prev, profileFetch: { success: true, data: profile } }))

    } catch (err: any) {
      console.error('❌ Login test failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Supabase Signup/Login Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={testSignup} disabled={loading}>
              {loading ? 'Testing...' : 'Test Signup'}
            </Button>
            <Button onClick={testLogin} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Login'}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">Results:</h3>
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>This page helps debug signup/login issues. Check the browser console for detailed logs.</p>
            <p>Make sure to clear your Supabase data first using the SQL script.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
