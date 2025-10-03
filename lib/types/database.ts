export type UserRole = 'owner' | 'employee'
export type TrainingStatus = 'draft' | 'published'
export type AssignmentStatus = 'not_started' | 'in_progress' | 'completed'
export type MessageRole = 'user' | 'assistant'
export type SubscriptionPlan = 'starter' | 'growth' | 'business'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  company_id: string
  created_at: string
}

export interface Company {
  id: string
  name: string
  plan: SubscriptionPlan
  owner_id: string
  employee_count: number
  created_at: string
}

export interface Chapter {
  title: string
  start_time: number
  end_time: number
}

export interface TrainingModule {
  id: string
  company_id: string
  creator_id: string
  title: string
  description: string | null
  video_url: string | null
  video_duration: number
  transcript: string | null
  chapters: Chapter[]
  sop: string | null
  key_points: string[]
  status: TrainingStatus
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  module_id: string
  employee_id: string
  status: AssignmentStatus
  progress: number
  started_at: string | null
  completed_at: string | null
}

export interface ChatMessage {
  id: string
  assignment_id: string
  role: MessageRole
  content: string
  timestamp: string
  video_timestamp: number | null
}
