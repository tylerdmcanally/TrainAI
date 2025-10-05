'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Save } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'

interface SecuritySettingsProps {
  user: User
  companyId: string
}

export function SecuritySettings({ user, companyId }: SecuritySettingsProps) {
  const { showSuccess, showError } = useToastNotifications()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Implementation would go here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      showSuccess('Security settings updated successfully')
    } catch (error) {
      showError('Failed to update security settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Access Control
          </CardTitle>
          <CardDescription>
            Configure advanced security settings and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-12 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Security Settings</h3>
            <p className="text-sm">
              Configure two-factor authentication, session management,
              and advanced security controls. This feature is coming soon!
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
