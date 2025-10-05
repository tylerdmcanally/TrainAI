import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { perf } from '@/lib/utils/performance-monitor'

export const GET = withApiErrorHandler(async () => {
  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get user's company and role
  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  // Use optimized function to get employees with counts in a single query
  perf.start('get-employees-optimized', { companyId: profile.company_id })
  
  const { data: employees, error } = await supabase
    .rpc('get_employees_with_counts', { company_uuid: profile.company_id })

  const metric = perf.end('get-employees-optimized')
  console.log('Optimized employee query performance:', metric)

  if (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    employees: employees || [],
    count: employees?.length || 0,
    performance: {
      queryTime: metric?.duration,
      queryType: 'optimized'
    }
  })
})
