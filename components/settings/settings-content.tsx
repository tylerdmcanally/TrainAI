'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { ProfileSettings } from './profile-settings'
import { NotificationSettings } from './notification-settings'
import { TrainingPreferences } from './training-preferences'
import { PrivacySecuritySettings } from './privacy-security-settings'
import { CompanySettings } from './company-settings'
import { BrandingSettings } from './branding-settings'
import { SecuritySettings } from './security-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SettingsSection } from './types'

interface SettingsContentProps {
  user: User
  profile: {
    role: 'owner' | 'employee'
    company_id: string
    name: string
    email: string
  }
  activeSection: SettingsSection
}

export function SettingsContent({ user, profile, activeSection }: SettingsContentProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)

    // Simulate loading time for settings data
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [activeSection])

  const renderSettingsContent = () => {
    if (isLoading) {
      return (
        <div className="p-8 space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      )
    }

    switch (activeSection) {
      case 'profile':
        return <ProfileSettings user={user} profile={profile} />
      case 'notifications':
        return <NotificationSettings user={user} />
      case 'training':
        return <TrainingPreferences user={user} />
      case 'privacy':
        return <PrivacySecuritySettings user={user} />
      case 'company':
        return profile.role === 'owner' ? <CompanySettings user={user} companyId={profile.company_id} /> : null
      case 'branding':
        return profile.role === 'owner' ? <BrandingSettings user={user} companyId={profile.company_id} /> : null
      case 'security':
        return profile.role === 'owner' ? <SecuritySettings user={user} companyId={profile.company_id} /> : null
      default:
        return <ProfileSettings user={user} profile={profile} />
    }
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'profile':
        return 'Profile Settings'
      case 'notifications':
        return 'Notification Preferences'
      case 'training':
        return 'Training Preferences'
      case 'privacy':
        return 'Privacy & Security'
      case 'company':
        return 'Company Settings'
      case 'branding':
        return 'Branding & Customization'
      case 'security':
        return 'Security & Access Control'
      default:
        return 'Settings'
    }
  }

  const getSectionDescription = () => {
    switch (activeSection) {
      case 'profile':
        return 'Manage your personal information and account details'
      case 'notifications':
        return 'Configure how and when you receive notifications'
      case 'training':
        return 'Customize your learning experience and video preferences'
      case 'privacy':
        return 'Control your privacy settings and account security'
      case 'company':
        return 'Manage company information and team settings'
      case 'branding':
        return 'Customize your company\'s appearance and branding'
      case 'security':
        return 'Configure advanced security settings and access controls'
      default:
        return 'Manage your settings and preferences'
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h1>
        <p className="text-gray-600 mt-1">{getSectionDescription()}</p>
      </div>

      {/* Content */}
      {renderSettingsContent()}
    </div>
  )
}
