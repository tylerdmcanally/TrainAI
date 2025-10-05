'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [cookies, setCookies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchAuthData = async () => {
      console.log('=== AUTH DEBUG PAGE ===')
      setLoading(true)
      
      // Fetch user
      console.log('Fetching auth user...')
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      console.log('Auth user result:', { authUser, userError })
      setUser(authUser)

      if (authUser) {
        // Fetch profile
        console.log('Fetching user profile...')
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        console.log('Profile result:', { userProfile, profileError })
        setProfile(userProfile)
      }

      // Get all cookies
      if (typeof document !== 'undefined') {
        console.log('Getting cookies...')
        const allCookies = document.cookie.split('; ').map(cookie => {
          const [name, value] = cookie.split('=')
          return { name, value: value?.substring(0, 50) + (value?.length > 50 ? '...' : '') }
        })
        console.log('Cookies:', allCookies)
        setCookies(allCookies)
      }
      
      setLoading(false)
      console.log('=== AUTH DEBUG COMPLETE ===')
    }

    fetchAuthData()
  }, [supabase])

  const handleLogout = async () => {
    console.log('Logging out...')
    await supabase.auth.signOut()
    router.refresh()
    setUser(null)
    setProfile(null)
    setCookies([])
  }

  const handleLogin = async () => {
    console.log('Redirecting to login...')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p>Loading authentication debug data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Authentication Debugger</CardTitle>
          <CardDescription>Check your current authentication status and cookies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="text-xl font-semibold mb-2">Auth User Status</h3>
            {user ? (
              <div className="space-y-1 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Authenticated:</strong> Yes</p>
                <p><strong>Last Sign In At:</strong> {new Date(user.last_sign_in_at).toLocaleString()}</p>
                <p><strong>Email Confirmed:</strong> {user.email_confirmed_at ? 'Yes' : 'No'}</p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">❌ No user authenticated</p>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">User Profile (public.users)</h3>
            {profile ? (
              <div className="space-y-1 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Role:</strong> {profile.role}</p>
                <p><strong>Company ID:</strong> {profile.company_id}</p>
                <p><strong>Job Title:</strong> {profile.job_title || 'N/A'}</p>
                <p><strong>Profile Picture:</strong> {profile.profile_picture_url || 'N/A'}</p>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">❌ No user profile found in public.users</p>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Browser Cookies</h3>
            {cookies.length > 0 ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Look for cookies starting with `sb-` and containing `auth-token` for Supabase session.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {cookies.map((cookie, index) => (
                    <li key={index} className="text-sm break-all">
                      <strong>{cookie.name}:</strong> {cookie.value}
                      {cookie.name.startsWith('sb-') && cookie.name.includes('auth-token') && (
                        <span className="ml-2 text-green-600 font-semibold">✅ Supabase Auth Cookie</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p>❌ No cookies found.</p>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Actions</h3>
            <div className="flex gap-4 flex-wrap">
              {user ? (
                <Button onClick={handleLogout} variant="destructive">
                  Logout
                </Button>
              ) : (
                <Button onClick={handleLogin}>
                  Go to Login
                </Button>
              )}
              <Button onClick={() => router.push('/auth/signup')} variant="outline">
                Go to Signup
              </Button>
              <Button onClick={() => router.push('/dashboard')} variant="outline">
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-2">Console Logs</h3>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Open your browser's Developer Tools (F12) and check the Console tab for detailed logs.
                You should see logs starting with "=== AUTH DEBUG PAGE ==="
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}