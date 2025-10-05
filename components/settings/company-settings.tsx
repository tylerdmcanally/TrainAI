'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building, Users, Settings, Save, Upload } from 'lucide-react'
import { useToastNotifications } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'

interface CompanySettingsProps {
  user: User
  companyId: string
}

interface CompanyInfo {
  name: string
  website: string
  industry: string
  size: string
  description: string
  contact_email: string
  phone: string
  address: string
}

interface TrainingPolicies {
  default_deadline_days: number
  allow_retries: boolean
  max_retries: number
  require_completion: boolean
  auto_assign_new: boolean
  certification_required: boolean
  progress_reporting: boolean
}

export function CompanySettings({ user, companyId }: CompanySettingsProps) {
  const { showSuccess, showError } = useToastNotifications()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    website: '',
    industry: '',
    size: '',
    description: '',
    contact_email: '',
    phone: '',
    address: ''
  })

  const [trainingPolicies, setTrainingPolicies] = useState<TrainingPolicies>({
    default_deadline_days: 30,
    allow_retries: true,
    max_retries: 3,
    require_completion: true,
    auto_assign_new: false,
    certification_required: false,
    progress_reporting: true
  })

  useEffect(() => {
    loadCompanySettings()
  }, [companyId])

  const loadCompanySettings = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      
      // Get company settings
      const { data, error } = await supabase
        .rpc('get_company_settings', { company_uuid: companyId })

      if (error) {
        console.error('Error loading company settings:', error)
        return
      }

      if (data) {
        if (data.company_info) {
          setCompanyInfo(data.company_info)
        }
        if (data.training_policies) {
          setTrainingPolicies(data.training_policies)
        }
      }

      // Also get basic company info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single()

      if (company && !data?.company_info?.name) {
        setCompanyInfo(prev => ({ ...prev, name: company.name }))
      }
    } catch (error) {
      console.error('Error loading company settings:', error)
      showError('Failed to load company settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompanyInfoChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleTrainingPolicyChange = (field: keyof TrainingPolicies, value: string | number | boolean) => {
    setTrainingPolicies(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .rpc('update_company_settings', {
          company_uuid: companyId,
          company_info: companyInfo,
          training_policies: trainingPolicies
        })

      if (error) {
        throw error
      }

      showSuccess('Company settings updated successfully')
    } catch (error) {
      console.error('Error updating company settings:', error)
      showError('Failed to update company settings')
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
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic information about your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyInfo.name}
                onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={companyInfo.website}
                onChange={(e) => handleCompanyInfoChange('website', e.target.value)}
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={companyInfo.industry}
                onChange={(e) => handleCompanyInfoChange('industry', e.target.value)}
                placeholder="e.g., Technology, Healthcare"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="size">Company Size</Label>
              <select
                id="size"
                value={companyInfo.size}
                onChange={(e) => handleCompanyInfoChange('size', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-1000">201-1000 employees</option>
                <option value="1000+">1000+ employees</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Company Description</Label>
            <Textarea
              id="description"
              value={companyInfo.description}
              onChange={(e) => handleCompanyInfoChange('description', e.target.value)}
              placeholder="Describe your company..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={companyInfo.contact_email}
                onChange={(e) => handleCompanyInfoChange('contact_email', e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={companyInfo.phone}
                onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={companyInfo.address}
              onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
              placeholder="Company address..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Training Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Training Policies
          </CardTitle>
          <CardDescription>
            Set default policies for training assignments and completion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline-days">Default Deadline (Days)</Label>
              <Input
                id="deadline-days"
                type="number"
                value={trainingPolicies.default_deadline_days}
                onChange={(e) => handleTrainingPolicyChange('default_deadline_days', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-retries">Maximum Retries</Label>
              <Input
                id="max-retries"
                type="number"
                value={trainingPolicies.max_retries}
                onChange={(e) => handleTrainingPolicyChange('max_retries', parseInt(e.target.value))}
                placeholder="3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Allow Retries</Label>
                <input
                  type="checkbox"
                  checked={trainingPolicies.allow_retries}
                  onChange={(e) => handleTrainingPolicyChange('allow_retries', e.target.checked)}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Require Completion</Label>
                <input
                  type="checkbox"
                  checked={trainingPolicies.require_completion}
                  onChange={(e) => handleTrainingPolicyChange('require_completion', e.target.checked)}
                  className="rounded border-gray-300"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Auto-assign New Trainings</Label>
                <input
                  type="checkbox"
                  checked={trainingPolicies.auto_assign_new}
                  onChange={(e) => handleTrainingPolicyChange('auto_assign_new', e.target.checked)}
                  className="rounded border-gray-300"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Certification Required</Label>
                <input
                  type="checkbox"
                  checked={trainingPolicies.certification_required}
                  onChange={(e) => handleTrainingPolicyChange('certification_required', e.target.checked)}
                  className="rounded border-gray-300"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
