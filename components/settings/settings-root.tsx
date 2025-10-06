'use client'

import { useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { SettingsNavigation } from './settings-navigation'
import { SettingsContent } from './settings-content'
import type { SettingsSection } from './types'

interface SettingsRootProps {
  user: User
  profile: {
    role: 'owner' | 'employee'
    company_id: string
    name: string
    email: string
  }
}

export function SettingsRoot({ user, profile }: SettingsRootProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile')

  const handleSectionChange = useCallback((section: SettingsSection) => {
    setActiveSection(section)
  }, [])

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SettingsNavigation
          userRole={profile.role}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <SettingsContent
          user={user}
          profile={profile}
          activeSection={activeSection}
        />
      </div>
    </div>
  )
}
