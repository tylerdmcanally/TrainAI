import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddEmployeeButton } from '@/components/employees/add-employee-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, Calendar, TrendingUp } from 'lucide-react'

export default async function OptimizedEmployeesPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user's company and role
  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    redirect('/dashboard')
  }

  console.log('Looking for employees in company:', profile.company_id)

  // Use optimized function to get employees with counts in a single query
  const { data: employees, error: employeesError } = await supabase
    .rpc('get_employees_with_counts', { company_uuid: profile.company_id })

  if (employeesError) {
    console.error('Error fetching employees:', employeesError)
  }

  console.log('Employees found (optimized):', employees?.length || 0)

  // Get company analytics for additional insights
  const { data: analytics } = await supabase
    .rpc('get_company_training_analytics', { company_uuid: profile.company_id })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // const formatTimeSpent = (seconds: number) => {
  //   if (seconds < 60) return `${seconds}s`
  //   if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  //   return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  // }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-1">Manage your team members</p>
          </div>
          <AddEmployeeButton companyId={profile.company_id} />
        </div>

        {/* Analytics Cards */}
        {analytics && analytics[0] && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics[0].total_employees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Employees</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics[0].active_employees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics[0].total_assignments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Badge className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics[0].completed_assignments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employees List */}
        {employees && employees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <Link key={employee.id} href={`/dashboard/employees/${employee.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary">Employee</Badge>
                    </div>
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatDate(employee.created_at)}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {employee.assignment_count} training(s) assigned
                          </p>
                          {employee.assignment_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
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
              <div className="rounded-full bg-green-50 p-4 mb-4">
                <Users className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No employees yet
              </h3>
              <p className="text-gray-600 text-center max-w-md mb-6">
                Add your first employee to start assigning training modules
              </p>
              <AddEmployeeButton companyId={profile.company_id} />
            </CardContent>
          </Card>
        )}

        {/* Performance Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            🚀 <strong>Optimized Query:</strong> This page uses optimized database functions 
            to load employee data with assignment counts in a single query, 
            eliminating the N+1 query problem.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
