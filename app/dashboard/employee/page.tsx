import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Play, Clock, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EmployeeDashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch assignments with training details
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      status,
      progress,
      time_spent,
      module_id,
      training_modules (
        id,
        title,
        description,
        video_duration
      )
    `)
    .eq('employee_id', user.id)
    .order('created_at', { ascending: false })

  const assignmentsList = assignments?.map(a => ({
    id: a.id,
    moduleId: a.module_id,
    title: (a.training_modules as any)?.title || 'Untitled',
    description: (a.training_modules as any)?.description || '',
    duration: Math.ceil(((a.training_modules as any)?.video_duration || 0) / 60),
    progress: a.progress || 0,
    status: a.status as 'not_started' | 'in_progress' | 'completed',
    timeSpent: a.time_spent || 0,
  })) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Training</h1>
          <p className="text-gray-600 mt-1">Complete your assigned training modules</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{assignmentsList.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {assignmentsList.filter(a => a.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {assignmentsList.filter(a => a.status === 'completed').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {assignmentsList.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No trainings assigned yet</p>
              </CardContent>
            </Card>
          ) : (
            assignmentsList.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="mt-1">
                        {getStatusIcon(assignment.status)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {assignment.title}
                          </h3>
                          {getStatusBadge(assignment.status)}
                        </div>
                        <p className="text-gray-600 mb-3">{assignment.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {assignment.duration} min
                          </span>
                          {assignment.progress > 0 && assignment.progress < 100 && (
                            <span>{assignment.progress}% complete</span>
                          )}
                          {assignment.timeSpent > 0 && (
                            <span>{Math.floor(assignment.timeSpent / 60)}m watched</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/employee/training/${assignment.moduleId}`}>
                      <Button
                        variant={assignment.status === 'completed' ? 'outline' : 'default'}
                      >
                        {assignment.status === 'completed' ? 'Review' :
                         assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                      </Button>
                    </Link>
                  </div>
                  {assignment.progress > 0 && assignment.progress < 100 && (
                    <div className="mt-4 ml-9">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${assignment.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
