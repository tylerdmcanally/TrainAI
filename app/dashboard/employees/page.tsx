import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddEmployeeButton } from '@/components/employees/add-employee-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Mail, Calendar } from 'lucide-react'

export default async function EmployeesPage() {
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

  // Get all employees in the company
  const { data: employees, error: employeesError } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      created_at,
      company_id
    `)
    .eq('company_id', profile.company_id)
    .eq('role', 'employee')
    .order('created_at', { ascending: false })

  if (employeesError) {
    console.error('Error fetching employees:', employeesError)
  }

  console.log('Employees found:', employees?.length || 0)

  // Check if there are ANY employees with role='employee' (debug)
  const { data: allEmployees } = await supabase
    .from('users')
    .select('id, email, role, company_id')
    .eq('role', 'employee')

  console.log('All employees in database:', allEmployees?.length || 0, allEmployees)

  // Get assignment counts for each employee
  const employeesWithCounts = await Promise.all(
    (employees || []).map(async (employee) => {
      const { count } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee.id)

      return {
        ...employee,
        assignmentCount: count || 0
      }
    })
  )

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
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-1">Manage your team members</p>
          </div>
          <AddEmployeeButton companyId={profile.company_id} />
        </div>

        {/* Employees List */}
        {employeesWithCounts && employeesWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employeesWithCounts.map((employee) => (
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
                        <p className="text-sm text-gray-500">
                          {employee.assignmentCount} training(s) assigned
                        </p>
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
      </div>
    </DashboardLayout>
  )
}
