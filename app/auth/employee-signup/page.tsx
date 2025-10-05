'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function EmployeeSignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companyId = searchParams.get('company')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>('')

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) {
        setError('Invalid invitation link. Please contact your administrator.')
        return
      }

      const supabase = createClient()
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()

      if (company) {
        setCompanyName(company.name)
      } else {
        setError('Company not found. Please contact your administrator.')
      }
    }

    fetchCompany()
  }, [companyId])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!companyId) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: 'employee',
          },
        },
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error('Sign up failed')
      }

      // 2. Create user profile as employee
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: formData.email,
          name: formData.name,
          role: 'employee',
          company_id: companyId,
        })

      if (profileError) {
        throw profileError
      }

      // Success! Redirect to employee dashboard
      router.push('/dashboard/employee')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 mb-4" />
          <CardTitle className="text-2xl">Join your team</CardTitle>
          <CardDescription>
            {companyName ? `Create your account for ${companyName}` : 'Create your employee account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !companyId ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">{error}</p>
              <Link href="/auth/login" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
              </div>

              {error && companyId && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !companyId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create employee account'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EmployeeSignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeeSignUpForm />
    </Suspense>
  )
}
