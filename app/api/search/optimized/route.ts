import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiErrorHandler } from '@/lib/utils/api-error-handler'
import { perf } from '@/lib/utils/performance-monitor'

export const GET = withApiErrorHandler(async (request: NextRequest) => {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const type = searchParams.get('type') // 'trainings' or 'employees'

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

  if (!profile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    )
  }

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters long' },
      { status: 400 }
    )
  }

  const isOwner = profile.role === 'owner'

  perf.start('search-optimized', { 
    query: query.trim(),
    type,
    companyId: profile.company_id,
    isOwner 
  })

  let results: unknown[] = []
  let error: unknown = null

  try {
    if (type === 'trainings') {
      // Search training modules
      const { data, error: searchError } = await supabase
        .rpc('search_training_modules', {
          company_uuid: profile.company_id,
          search_term: query.trim()
        })
      
      results = data || []
      error = searchError
    } else if (type === 'employees' && isOwner) {
      // Search employees (owners only)
      const { data, error: searchError } = await supabase
        .rpc('search_employees', {
          company_uuid: profile.company_id,
          search_term: query.trim()
        })
      
      results = data || []
      error = searchError
    } else {
      return NextResponse.json(
        { error: 'Invalid search type or insufficient permissions' },
        { status: 400 }
      )
    }
  } catch (err) {
    error = err
  }

  const metric = perf.end('search-optimized')
  console.log('Optimized search performance:', metric)

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    results,
    count: results.length,
    query: query.trim(),
    type,
    performance: {
      queryTime: metric?.duration,
      queryType: 'optimized'
    }
  })
})
