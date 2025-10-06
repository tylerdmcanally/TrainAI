'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestLoginPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [email, setEmail] = useState('owner@test.com')
  const [password, setPassword] = useState('password123')

  const testLogin = async () => {
    setLoading(true)
    setResult('Testing login...')

    try {
      const supabase = createClient()

      // Add timeout to login
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), 10000)
      )
      
      const { data, error } = await Promise.race([loginPromise, timeoutPromise])

      if (error) {
        setResult(`❌ Login failed: ${error.message}`)
        return
      }

      if (data.user) {
        setResult(`✅ Login successful! User: ${data.user.email}`)
        
        // Test profile fetch
        setResult(prev => prev + '\n🔄 Testing profile fetch...')
        
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          setResult(prev => prev + `\n❌ Profile fetch failed: ${profileError.message}`)
        } else if (profile) {
          setResult(prev => prev + `\n✅ Profile found: ${profile.name} (${profile.role})`)
          
          // Test company fetch
          if (profile.company_id) {
            setResult(prev => prev + '\n🔄 Testing company fetch...')
            
            const { data: company, error: companyError } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profile.company_id)
              .single()

            if (companyError) {
              setResult(prev => prev + `\n❌ Company fetch failed: ${companyError.message}`)
            } else if (company) {
              setResult(prev => prev + `\n✅ Company found: ${company.name}`)
            }
          }
        } else {
          setResult(prev => prev + '\n❌ No profile found')
        }
      } else {
        setResult('❌ No user returned from login')
      }

    } catch (error) {
      setResult(`❌ Login error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-blue-100 flex items-center justify-center p-8">
      <Card className="w-full max-w-md border-blue-100 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Test Login</CardTitle>
          <CardDescription>Test login with existing account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={testLogin}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Login'}
          </Button>

          {result && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm whitespace-pre-line">{result}</p>
            </div>
          )}

          <div className="text-center">
            <a href="/auth/login" className="text-blue-600 hover:text-blue-700 text-sm">
              Go to Login Page
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
