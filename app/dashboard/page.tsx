import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Video, Clock, CheckCircle2, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's company and role
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  console.log('Profile query result:', { profile, profileError, userId: user.id })

  if (profileError) {
    console.error('Profile error:', profileError)
  }

  if (!profile) {
    console.error('No profile found, redirecting to login')
    redirect('/auth/login')
  }

  const isOwner = profile.role === 'owner'

  // Fetch trainings based on role
  let trainings: unknown[] = []
  let assignments: unknown[] = []

  if (isOwner) {
    // Owners see all trainings they created
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    trainings = data || []
  } else {
    // Employees see their assigned trainings
    const { data } = await supabase
      .from('assignments')
      .select(`
        *,
        training_modules (*)
      `)
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })

    assignments = data || []
    trainings = assignments.map(a => a.training_modules).filter(Boolean)
  }

  // Calculate stats based on role
  const stats = isOwner ? [
    {
      name: 'Total Trainings',
      value: trainings?.length || 0,
      icon: Video,
      color: 'text-blue-600'
    },
    {
      name: 'Published',
      value: trainings?.filter(t => t.status === 'published').length || 0,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      name: 'Total Duration',
      value: `${Math.round((trainings?.reduce((sum, t) => sum + (t.video_duration || 0), 0) || 0) / 60)}m`,
      icon: Clock,
      color: 'text-purple-600'
    },
  ] : [
    {
      name: 'Assigned Trainings',
      value: assignments.length || 0,
      icon: Video,
      color: 'text-blue-600'
    },
    {
      name: 'Completed',
      value: assignments.filter(a => a.status === 'completed').length || 0,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      name: 'In Progress',
      value: assignments.filter(a => a.status === 'in_progress').length || 0,
      icon: Play,
      color: 'text-yellow-600'
    },
  ]

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isOwner ? 'Training Modules' : 'My Trainings'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isOwner ? 'Create and manage your employee training' : 'View and complete your assigned trainings'}
            </p>
          </div>
          {isOwner && (
            <Link href="/dashboard/training/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Training
              </Button>
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.name}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trainings List */}
        {trainings && trainings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training) => (
              <Link
                key={training.id}
                href={isOwner ? `/dashboard/training/${training.id}` : `/dashboard/employee/training/${training.id}`}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant={training.status === 'published' ? 'default' : 'secondary'}>
                        {training.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{training.title}</CardTitle>
                    {training.description && (
                      <CardDescription className="line-clamp-2">
                        {training.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium">{formatDuration(training.video_duration)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Chapters</span>
                        <span className="font-medium">{training.chapters?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Created</span>
                        <span className="font-medium">{formatDate(training.created_at)}</span>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-blue-50 p-4 mb-4">
                <Video className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isOwner ? 'No training modules yet' : 'No trainings assigned yet'}
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                {isOwner
                  ? 'Create your first training module by recording your screen and talking through the process. AI will handle the rest!'
                  : 'You don\'t have any trainings assigned yet. Check back later or contact your administrator.'
                }
              </p>
              {isOwner && (
                <Link href="/dashboard/training/create">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Your First Training
                  </Button>
                </Link>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
