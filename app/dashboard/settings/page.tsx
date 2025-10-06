import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsRoot } from '@/components/settings/settings-root'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id, name, email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  return (
    <DashboardLayout>
      <SettingsRoot user={user} profile={profile} />
    </DashboardLayout>
  )
}
