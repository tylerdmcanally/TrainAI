'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Video, Play, MessageSquare, Trophy, Save } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

interface TrainingPreferencesProps {
  user: User
}

interface TrainingPreferencesData {
  video_quality: 'auto' | 'high' | 'medium' | 'low'
  auto_play: boolean
  show_chapters: boolean
  ai_chat_enabled: boolean
  progress_tracking: boolean
  completion_certificates: boolean
}

export function TrainingPreferences({ user }: TrainingPreferencesProps) {
  const { showSuccess, showError } = useToastNotifications()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferences, setPreferences] = useState<TrainingPreferencesData>({
    video_quality: 'auto',
    auto_play: false,
    show_chapters: true,
    ai_chat_enabled: true,
    progress_tracking: true,
    completion_certificates: true
  })

  useEffect(() => {
    loadPreferences()
  }, [user.id])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .rpc('get_user_preferences', { user_uuid: user.id })

      if (error) {
        console.error('Error loading preferences:', error)
        return
      }

      if (data?.training_preferences) {
        setPreferences(data.training_preferences)
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
      showError('Failed to load training preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = (setting: keyof TrainingPreferencesData) => {
    setPreferences(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  const handleVideoQualityChange = (quality: TrainingPreferencesData['video_quality']) => {
    setPreferences(prev => ({
      ...prev,
      video_quality: quality
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .rpc('update_user_preferences', {
          user_uuid: user.id,
          training_prefs: preferences
        })

      if (error) {
        throw error
      }

      showSuccess('Training preferences updated successfully')
    } catch (error) {
      console.error('Error updating preferences:', error)
      showError('Failed to update training preferences')
    } finally {
      setIsSaving(false)
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
      {/* Video Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Settings
          </CardTitle>
          <CardDescription>
            Configure your video playback preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Video Quality</Label>
            <select
              value={preferences.video_quality}
              onChange={(e) => handleVideoQualityChange(e.target.value as TrainingPreferencesData['video_quality'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="high">High Quality</option>
              <option value="medium">Medium Quality</option>
              <option value="low">Low Quality (Data Saver)</option>
            </select>
            <p className="text-xs text-gray-500">
              Auto quality adjusts based on your internet connection
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-play Videos</Label>
              <p className="text-xs text-gray-500">
                Automatically start playing videos when opened
              </p>
            </div>
            <Switch
              checked={preferences.auto_play}
              onCheckedChange={() => handleToggle('auto_play')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Learning Experience
          </CardTitle>
          <CardDescription>
            Customize how you interact with training content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Show Chapter Navigation</Label>
              <p className="text-xs text-gray-500">
                Display chapter markers and navigation in videos
              </p>
            </div>
            <Switch
              checked={preferences.show_chapters}
              onCheckedChange={() => handleToggle('show_chapters')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable AI Chat</Label>
              <p className="text-xs text-gray-500">
                Allow AI tutor to assist during training
              </p>
            </div>
            <Switch
              checked={preferences.ai_chat_enabled}
              onCheckedChange={() => handleToggle('ai_chat_enabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Progress Tracking</Label>
              <p className="text-xs text-gray-500">
                Track and save your learning progress
              </p>
            </div>
            <Switch
              checked={preferences.progress_tracking}
              onCheckedChange={() => handleToggle('progress_tracking')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Completion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Completion & Recognition
          </CardTitle>
          <CardDescription>
            Settings for training completion and achievements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Completion Certificates</Label>
              <p className="text-xs text-gray-500">
                Generate certificates when completing training
              </p>
            </div>
            <Switch
              checked={preferences.completion_certificates}
              onCheckedChange={() => handleToggle('completion_certificates')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
