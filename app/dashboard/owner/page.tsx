import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Video, Clock, CheckCircle2, Play, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OwnerDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's profile and verify they're an owner
  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard/employee')
  }

  // Fetch company info
  const { data: company } = await supabase
    .from('companies')
    .select('name, employee_count')
    .eq('id', profile.company_id)
    .single()

  // Fetch all trainings for this company
  const { data: trainings } = await supabase
    .from('training_modules')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  // Fetch all employees
  const { data: employees } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('company_id', profile.company_id)
    .eq('role', 'employee')

  // Calculate stats
  const stats = [
    {
      name: 'Total Trainings',
      value: trainings?.length || 0,
      icon: Video,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Published',
      value: trainings?.filter(t => t.status === 'published').length || 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Total Duration',
      value: `${Math.round((trainings?.reduce((sum, t) => sum + (t.video_duration || 0), 0) || 0) / 60)}m`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Team Members',
      value: company?.employee_count || 0,
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
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
              Owner Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage trainings, team members, and track progress
            </p>
            {company && (
              <p className="text-sm text-gray-500 mt-1">
                {company.name}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/employees">
              <Button variant="outline" size="lg" className="gap-2">
                <Users className="h-5 w-5" />
                Manage Team
              </Button>
            </Link>
            <Link href="/dashboard/training/create">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create Training
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.name}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/dashboard/training/create">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-blue-50 p-3 mb-3">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Create Training</h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Record and publish new training
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/employees">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-green-50 p-3 mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Add Employees</h3>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Invite team members
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="border-2 border-dashed opacity-50">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-purple-50 p-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Assign Trainings</h3>
              <p className="text-sm text-gray-600 text-center mt-1">
                Coming soon
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trainings List */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Trainings</h2>
        </div>

        {trainings && trainings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map((training) => (
              <Link
                key={training.id}
                href={`/dashboard/training/${training.id}`}
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
                No training modules yet
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Create your first training module by recording your screen and talking through the process. AI will handle the rest!
              </p>
              <Link href="/dashboard/training/create">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your First Training
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
