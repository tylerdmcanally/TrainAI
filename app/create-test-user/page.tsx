'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateTestUserPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [formData, setFormData] = useState({
    name: 'Test Owner',
    email: 'owner@test.com',
    password: 'password123',
    companyName: 'The Test Company'
  })

  const createTestUser = async () => {
    setLoading(true)
    setResult('Creating test user...')

    try {
      const supabase = createClient()

      // Step 1: Create auth user
      setResult('Step 1: Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            company_name: formData.companyName,
          },
        },
      })

      if (authError) {
        setResult(`❌ Auth signup failed: ${authError.message}`)
        return
      }

      if (!authData.user) {
        setResult('❌ No user returned from signup')
        return
      }

      setResult('✅ Auth user created successfully')

      // Step 2: Create company
      setResult('Step 2: Creating company...')
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.companyName,
          owner_id: authData.user.id,
          plan: 'starter',
        })
        .select()
        .single()

      if (companyError) {
        setResult(`❌ Company creation failed: ${companyError.message}`)
        return
      }

      setResult('✅ Company created successfully')

      // Step 3: Create user profile
      setResult('Step 3: Creating user profile...')
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          role: 'owner',
          company_id: company.id,
        })

      if (profileError) {
        setResult(`❌ User profile creation failed: ${profileError.message}`)
        return
      }

      setResult('✅ Test user created successfully! You can now log in.')
      
      // Auto-redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)

    } catch (error) {
      setResult(`❌ Unexpected error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-blue-100 flex items-center justify-center p-8">
      <Card className="w-full max-w-md border-blue-100 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Test User</CardTitle>
          <CardDescription>Create a test user to verify authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              disabled={loading}
            />
          </div>

          <Button
            onClick={createTestUser}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Test User'}
          </Button>

          {result && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm whitespace-pre-line">{result}</p>
            </div>
          )}

          <div className="text-center">
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 text-sm">
              Already have an account? Log in
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
