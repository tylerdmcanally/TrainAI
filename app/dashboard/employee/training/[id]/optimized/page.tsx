import { Suspense } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LazyEmployeeTrainingPlayer } from '@/components/training/lazy-components'

// Loading component for lazy-loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-16">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading training player...</p>
    </div>
  </div>
)

export default async function OptimizedEmployeeTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get user's role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'employee') {
    redirect('/dashboard')
  }

  // Fetch training with assignment details
  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      *,
      training_modules (*)
    `)
    .eq('employee_id', user.id)
    .eq('module_id', id)
    .single()

  if (!assignment || !assignment.training_modules) {
    redirect('/dashboard/employee')
  }

  const training = assignment.training_modules

  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <LazyEmployeeTrainingPlayer training={training} />
      </Suspense>
      
      {/* Performance Info */}
      <div className="absolute bottom-4 right-4 p-3 bg-blue-50 rounded-lg shadow-lg">
        <p className="text-xs text-blue-800">
          🚀 <strong>Optimized:</strong> Lazy-loaded training player
        </p>
      </div>
    </DashboardLayout>
  )
}
