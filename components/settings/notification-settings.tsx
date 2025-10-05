'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Mail, Smartphone, Save, RefreshCw } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

interface NotificationSettingsProps {
  user: User
}

interface NotificationPreferences {
  email_notifications: {
    training_assigned: boolean
    training_completed: boolean
    progress_updates: boolean
    weekly_summary: boolean
    monthly_report: boolean
    system_announcements: boolean
  }
  in_app_notifications: {
    new_training: boolean
    deadline_reminders: boolean
    progress_milestones: boolean
    achievements: boolean
    system_updates: boolean
  }
  push_notifications: {
    enabled: boolean
    training_reminders: boolean
    deadline_alerts: boolean
    achievements: boolean
  }
}

export function NotificationSettings({ user }: NotificationSettingsProps) {
  const { showSuccess, showError } = useToastNotifications()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: {
      training_assigned: true,
      training_completed: true,
      progress_updates: false,
      weekly_summary: true,
      monthly_report: false,
      system_announcements: true
    },
    in_app_notifications: {
      new_training: true,
      deadline_reminders: true,
      progress_milestones: true,
      achievements: true,
      system_updates: true
    },
    push_notifications: {
      enabled: true,
      training_reminders: true,
      deadline_alerts: true,
      achievements: true
    }
  })

  useEffect(() => {
    loadPreferences()
  }, [user.id])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      // Get user preferences
      const { data, error } = await supabase
        .rpc('get_user_preferences', { user_uuid: user.id })

      if (error) {
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          in_app_notifications: data.in_app_notifications,
          push_notifications: data.push_notifications
        })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      showError('Failed to load notification preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (category: keyof NotificationPreferences, setting: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting as keyof typeof prev[category]]
      }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .rpc('update_user_preferences', {
          user_uuid: user.id,
          email_notifs: preferences.email_notifications,
          in_app_notifs: preferences.in_app_notifications,
          push_notifs: preferences.push_notifications
        })

      if (error) {
        throw error
      }

      showSuccess('Notification preferences updated successfully')
    } catch (error) {
      console.error('Error updating preferences:', error)
      showError('Failed to update notification preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPreferences({
      email_notifications: {
        training_assigned: true,
        training_completed: true,
        progress_updates: false,
        weekly_summary: true,
        monthly_report: false,
        system_announcements: true
      },
      in_app_notifications: {
        new_training: true,
        deadline_reminders: true,
        progress_milestones: true,
        achievements: true,
        system_updates: true
      },
      push_notifications: {
        enabled: true,
        training_reminders: true,
        deadline_alerts: true,
        achievements: true
      }
    })
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
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure which events trigger email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.email_notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Label>
                <p className="text-xs text-gray-500">
                  {getEmailNotificationDescription(key)}
                </p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={() => handleToggle('email_notifications', key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Control notifications shown within the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.in_app_notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Label>
                <p className="text-xs text-gray-500">
                  {getInAppNotificationDescription(key)}
                </p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={() => handleToggle('in_app_notifications', key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Configure push notifications for mobile devices and browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(preferences.push_notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  {key === 'enabled' ? 'Enable Push Notifications' : key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Label>
                <p className="text-xs text-gray-500">
                  {getPushNotificationDescription(key)}
                </p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={() => handleToggle('push_notifications', key)}
                disabled={key !== 'enabled' && !preferences.push_notifications.enabled}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}

function getEmailNotificationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    training_assigned: 'Get notified when new training is assigned to you',
    training_completed: 'Receive confirmation when you complete a training',
    progress_updates: 'Weekly updates on your training progress',
    weekly_summary: 'Weekly summary of your training activity',
    monthly_report: 'Monthly detailed report of your progress',
    system_announcements: 'Important updates and announcements from TrainAI'
  }
  return descriptions[key] || 'Email notification setting'
}

function getInAppNotificationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    new_training: 'Show notifications for newly assigned trainings',
    deadline_reminders: 'Remind you about upcoming training deadlines',
    progress_milestones: 'Celebrate your progress milestones',
    achievements: 'Notify you of achievements and badges earned',
    system_updates: 'Show system updates and maintenance notifications'
  }
  return descriptions[key] || 'In-app notification setting'
}

function getPushNotificationDescription(key: string): string {
  const descriptions: Record<string, string> = {
    enabled: 'Enable push notifications on your device',
    training_reminders: 'Push reminders for training sessions',
    deadline_alerts: 'Push alerts for approaching deadlines',
    achievements: 'Push notifications for achievements and milestones'
  }
  return descriptions[key] || 'Push notification setting'
}
