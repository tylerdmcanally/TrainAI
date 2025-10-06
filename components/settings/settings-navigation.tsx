'use client'

import { 
  User, 
  Bell, 
  Shield, 
  Building, 
  Video, 
  Palette,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { SettingsSection } from './types'

interface SettingsNavigationProps {
  userRole: 'owner' | 'employee'
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

interface NavigationItem {
  id: SettingsSection
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  roles: ('owner' | 'employee')[]
}

const navigationItems: NavigationItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Personal information and account details',
    icon: User,
    roles: ['owner', 'employee']
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email and push notification preferences',
    icon: Bell,
    roles: ['owner', 'employee']
  },
  {
    id: 'training',
    label: 'Training Preferences',
    description: 'Learning experience and video settings',
    icon: Video,
    roles: ['owner', 'employee']
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    description: 'Data privacy and account security',
    icon: Shield,
    roles: ['owner', 'employee']
  },
  {
    id: 'company',
    label: 'Company Settings',
    description: 'Company information and team management',
    icon: Building,
    roles: ['owner']
  },
  {
    id: 'branding',
    label: 'Branding',
    description: 'Company colors, logo, and customization',
    icon: Palette,
    roles: ['owner']
  },
  {
    id: 'security',
    label: 'Security & Access',
    description: 'Advanced security and access controls',
    icon: SettingsIcon,
    roles: ['owner']
  }
]

export function SettingsNavigation({ userRole, activeSection, onSectionChange }: SettingsNavigationProps) {
  // Filter navigation items based on user role
  const availableItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {availableItems.map((item) => {
            const isActive = activeSection === item.id
            const Icon = item.icon
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-4 text-left",
                  isActive && "bg-blue-50 text-blue-700 border border-blue-200"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <Icon className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className={cn(
                      "text-xs mt-1 leading-relaxed",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )}>
                      {item.description}
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 mt-1 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-400"
                  )} />
                </div>
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          TrainAI v1.0.0
        </div>
      </div>
    </div>
  )
}
