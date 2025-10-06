import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { EmployeeTrainingPlayer } from '@/components/training/employee-training-player'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function EmployeeTrainingPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch training
  const { data: training } = await supabase
    .from('training_modules')
    .select('*')
    .eq('id', id)
    .single()

  if (!training) {
    redirect('/dashboard/employee')
  }

  return (
    <DashboardLayout>
      <EmployeeTrainingPlayer training={training} />
    </DashboardLayout>
  )
}
