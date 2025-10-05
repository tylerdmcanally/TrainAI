import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SettingsNavigation } from '@/components/settings/settings-navigation'
import { SettingsContent } from '@/components/settings/settings-content'
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
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
        {/* Settings Navigation Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
          <SettingsNavigation userRole={profile.role} />
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto">
          <SettingsContent 
            user={user} 
            profile={profile}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
