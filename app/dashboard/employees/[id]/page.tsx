import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Play,
  UserPlus,
  Trash2,
  Edit
} from 'lucide-react'
import { AssignTrainingButton } from '@/components/employees/assign-training-button'
import { RemoveEmployeeButton } from '@/components/employees/remove-employee-button'

interface PageProps {
  params: {
    id: string
  }
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get current user (must be owner)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ownerProfile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!ownerProfile || ownerProfile.role !== 'owner') {
    redirect('/dashboard')
  }

  // Get employee details
  const { data: employee } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', ownerProfile.company_id)
    .eq('role', 'employee')
    .single()

  if (!employee) {
    notFound()
  }

  // Get all assignments for this employee with training details
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      training_modules (
        id,
        title,
        description,
        video_duration,
        chapters,
        status
      )
    `)
    .eq('employee_id', params.id)
    .order('created_at', { ascending: false })

  // Calculate stats
  const totalAssignments = assignments?.length || 0
  const completedCount = assignments?.filter(a => a.status === 'completed').length || 0
  const inProgressCount = assignments?.filter(a => a.status === 'in_progress').length || 0
  const completionRate = totalAssignments > 0 ? Math.round((completedCount / totalAssignments) * 100) : 0

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Back Button */}
        <Link href="/dashboard/employees">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Button>
        </Link>

        {/* Employee Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {employee.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{employee.name}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {formatDate(employee.created_at)}</span>
                </div>
              </div>
              <Badge variant="secondary" className="mt-3">Employee</Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <AssignTrainingButton employeeId={employee.id} employeeName={employee.name} />
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <RemoveEmployeeButton employeeId={employee.id} employeeName={employee.name} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAssignments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{inProgressCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Trainings */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assigned Trainings</h2>

          {assignments && assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const training = assignment.training_modules as any
                if (!training) return null

                return (
                  <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {training.title}
                            </h3>
                            {getStatusBadge(assignment.status)}
                          </div>

                          {training.description && (
                            <p className="text-gray-600 mb-3">{training.description}</p>
                          )}

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatDuration(training.video_duration)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Assigned {formatDate(assignment.created_at)}</span>
                            </div>
                            {assignment.completed_at && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Completed {formatDate(assignment.completed_at)}</span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {assignment.progress > 0 && assignment.progress < 100 && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Progress</span>
                                <span className="text-sm text-gray-600">{assignment.progress}%</span>
                              </div>
                              <Progress value={assignment.progress} className="h-2" />
                            </div>
                          )}
                        </div>

                        <Link href={`/dashboard/training/${training.id}`}>
                          <Button variant="outline" size="sm" className="ml-4">
                            View Training
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-blue-50 p-4 mb-4">
                  <Play className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No trainings assigned yet
                </h3>
                <p className="text-gray-600 text-center max-w-md mb-6">
                  Assign training modules to {employee.name} to get started
                </p>
                <AssignTrainingButton employeeId={employee.id} employeeName={employee.name} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
