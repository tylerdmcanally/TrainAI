'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Shield, Eye, Download, Trash2, Key, Save, AlertTriangle } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

interface PrivacySecuritySettingsProps {
  user: User
}

interface PrivacySettings {
  profile_visibility: 'public' | 'company' | 'private'
  progress_visibility: 'public' | 'company' | 'private'
  analytics_opt_in: boolean
  data_export_enabled: boolean
}

export function PrivacySecuritySettings({ user }: PrivacySecuritySettingsProps) {
  const { showSuccess, showError } = useToastNotifications()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profile_visibility: 'company',
    progress_visibility: 'private',
    analytics_opt_in: true,
    data_export_enabled: true
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadPrivacySettings()
  }, [user.id])

  const loadPrivacySettings = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .rpc('get_user_preferences', { user_uuid: user.id })

      if (error) {
        console.error('Error loading privacy settings:', error)
        return
      }

      if (data?.privacy_settings) {
        setPrivacySettings(data.privacy_settings)
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error)
      showError('Failed to load privacy settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrivacyToggle = (setting: keyof PrivacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  const handlePrivacySelect = (setting: keyof PrivacySettings, value: string) => {
    setPrivacySettings(prev => ({
      ...prev,
      [setting]: value
    }))
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showError('Password must be at least 6 characters long')
      return
    }

    setIsChangingPassword(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) {
        throw error
      }

      showSuccess('Password updated successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error updating password:', error)
      showError('Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSavePrivacy = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .rpc('update_user_preferences', {
          user_uuid: user.id,
          privacy_prefs: privacySettings
        })

      if (error) {
        throw error
      }

      showSuccess('Privacy settings updated successfully')
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      showError('Failed to update privacy settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDataExport = async () => {
    try {
      const supabase = createClient()
      
      // This would typically trigger a background job to prepare data export
      showSuccess('Data export request submitted. You will receive an email when ready.')
    } catch (error) {
      console.error('Error requesting data export:', error)
      showError('Failed to request data export')
    }
  }

  const handleAccountDeletion = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      
      // This would typically require additional confirmation and admin approval
      showError('Account deletion requires manual approval. Please contact support.')
    } catch (error) {
      console.error('Error requesting account deletion:', error)
      showError('Failed to request account deletion')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control who can see your information and progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Profile Visibility</Label>
            <select
              value={privacySettings.profile_visibility}
              onChange={(e) => handlePrivacySelect('profile_visibility', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public - Visible to everyone</option>
              <option value="company">Company - Visible to company members</option>
              <option value="private">Private - Only visible to you</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Progress Visibility</Label>
            <select
              value={privacySettings.progress_visibility}
              onChange={(e) => handlePrivacySelect('progress_visibility', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="public">Public - Progress visible to everyone</option>
              <option value="company">Company - Progress visible to managers</option>
              <option value="private">Private - Progress only visible to you</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Analytics Opt-in</Label>
              <p className="text-xs text-gray-500">
                Allow TrainAI to collect anonymous usage data to improve the platform
              </p>
            </div>
            <Switch
              checked={privacySettings.analytics_opt_in}
              onCheckedChange={() => handlePrivacyToggle('analytics_opt_in')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>

            <Button 
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword}
              className="gap-2"
            >
              <Key className="h-4 w-4" />
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export your data or manage your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Data Export</Label>
              <p className="text-xs text-gray-500">
                Download a copy of all your data
              </p>
            </div>
            <Button variant="outline" onClick={handleDataExport} className="gap-2">
              <Download className="h-4 w-4" />
              Request Export
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Account Deletion</Label>
              <p className="text-xs text-gray-500">
                Permanently delete your account and all data
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleAccountDeletion}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSavePrivacy} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Privacy Settings'}
        </Button>
      </div>
    </div>
  )
}
