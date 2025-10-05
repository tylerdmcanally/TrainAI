import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's role and redirect to appropriate dashboard
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Redirect to role-specific dashboard
  if (profile.role === 'owner') {
    redirect('/dashboard/owner')
  } else {
    redirect('/dashboard/employee')
  }
}
