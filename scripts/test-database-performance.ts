#!/usr/bin/env tsx

/**
 * Database Performance Testing Script
 * Compares old vs optimized queries
 * Run with: npx tsx scripts/test-database-performance.ts
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface PerformanceTest {
  name: string
  oldQuery: () => Promise<any>
  newQuery: () => Promise<any>
  description: string
}

async function measureQueryTime(queryFn: () => Promise<any>): Promise<{ result: any; time: number }> {
  const start = performance.now()
  const result = await queryFn()
  const end = performance.now()
  return { result, time: end - start }
}

async function testEmployeeListing() {
  console.log('🧪 Testing Employee Listing Performance\n')

  // Mock company ID (replace with actual UUID)
  const companyId = '00000000-0000-0000-0000-000000000000'

  // Old query (N+1 problem)
  const oldQuery = async () => {
    // Get employees
    const { data: employees } = await supabase
      .from('users')
      .select('id, email, name, role, created_at, company_id')
      .eq('company_id', companyId)
      .eq('role', 'employee')
      .order('created_at', { ascending: false })

    // N+1 problem: query assignment count for each employee
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

    return employeesWithCounts
  }

  // New optimized query
  const newQuery = async () => {
    const { data } = await supabase
      .rpc('get_employees_with_counts', { company_uuid: companyId })
    return data
  }

  // Test both queries
  console.log('Testing old query (N+1)...')
  const oldResult = await measureQueryTime(oldQuery)
  console.log(`  ⏱️  Old query time: ${oldResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${oldResult.result?.length || 0} employees`)

  console.log('\nTesting new optimized query...')
  const newResult = await measureQueryTime(newQuery)
  console.log(`  ⏱️  New query time: ${newResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${newResult.result?.length || 0} employees`)

  // Calculate improvement
  const improvement = ((oldResult.time - newResult.time) / oldResult.time) * 100
  console.log(`\n🚀 Performance improvement: ${improvement.toFixed(1)}%`)
  console.log(`   Speed increase: ${(oldResult.time / newResult.time).toFixed(1)}x faster`)

  return { oldTime: oldResult.time, newTime: newResult.time, improvement }
}

async function testTrainingModules() {
  console.log('\n🧪 Testing Training Modules Performance\n')

  const companyId = '00000000-0000-0000-0000-000000000000'

  // Old query
  const oldQuery = async () => {
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    return data
  }

  // New optimized query
  const newQuery = async () => {
    const { data } = await supabase
      .rpc('get_training_modules_with_counts', { company_uuid: companyId })
    return data
  }

  console.log('Testing old query...')
  const oldResult = await measureQueryTime(oldQuery)
  console.log(`  ⏱️  Old query time: ${oldResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${oldResult.result?.length || 0} training modules`)

  console.log('\nTesting new optimized query...')
  const newResult = await measureQueryTime(newQuery)
  console.log(`  ⏱️  New query time: ${newResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${newResult.result?.length || 0} training modules`)

  const improvement = ((oldResult.time - newResult.time) / oldResult.time) * 100
  console.log(`\n🚀 Performance improvement: ${improvement.toFixed(1)}%`)

  return { oldTime: oldResult.time, newTime: newResult.time, improvement }
}

async function testSearchPerformance() {
  console.log('\n🧪 Testing Search Performance\n')

  const companyId = '00000000-0000-0000-0000-000000000000'
  const searchTerm = 'training'

  // Old query (basic text search)
  const oldQuery = async () => {
    const { data } = await supabase
      .from('training_modules')
      .select('*')
      .eq('company_id', companyId)
      .ilike('title', `%${searchTerm}%`)
      .order('created_at', { ascending: false })

    return data
  }

  // New optimized query (full-text search)
  const newQuery = async () => {
    const { data } = await supabase
      .rpc('search_training_modules', {
        company_uuid: companyId,
        search_term: searchTerm
      })
    return data
  }

  console.log(`Testing search for: "${searchTerm}"`)
  
  console.log('\nTesting old query (ILIKE)...')
  const oldResult = await measureQueryTime(oldQuery)
  console.log(`  ⏱️  Old query time: ${oldResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${oldResult.result?.length || 0} matches`)

  console.log('\nTesting new optimized query (full-text search)...')
  const newResult = await measureQueryTime(newQuery)
  console.log(`  ⏱️  New query time: ${newResult.time.toFixed(2)}ms`)
  console.log(`  📊 Results: ${newResult.result?.length || 0} matches`)

  const improvement = ((oldResult.time - newResult.time) / oldResult.time) * 100
  console.log(`\n🚀 Performance improvement: ${improvement.toFixed(1)}%`)

  return { oldTime: oldResult.time, newTime: newResult.time, improvement }
}

async function testIndexUsage() {
  console.log('\n🔍 Testing Index Usage\n')

  // Check index usage statistics
  const { data: indexStats, error } = await supabase
    .from('pg_stat_user_indexes')
    .select('*')
    .eq('schemaname', 'public')

  if (error) {
    console.log('  ⚠️  Could not fetch index statistics:', error.message)
    return
  }

  console.log('📊 Index Usage Statistics:')
  indexStats?.forEach(stat => {
    if (stat.indexname.startsWith('idx_')) {
      console.log(`  ${stat.indexname}:`)
      console.log(`    Scans: ${stat.idx_scan}`)
      console.log(`    Tuples read: ${stat.idx_tup_read}`)
      console.log(`    Tuples fetched: ${stat.idx_tup_fetch}`)
    }
  })
}

async function runAllTests() {
  console.log('🚀 Database Performance Testing Suite\n')
  console.log('=' .repeat(50))

  try {
    const results = []

    // Test employee listing
    const employeeResults = await testEmployeeListing()
    results.push({ test: 'Employee Listing', ...employeeResults })

    // Test training modules
    const trainingResults = await testTrainingModules()
    results.push({ test: 'Training Modules', ...trainingResults })

    // Test search performance
    const searchResults = await testSearchPerformance()
    results.push({ test: 'Search', ...searchResults })

    // Test index usage
    await testIndexUsage()

    // Summary
    console.log('\n📊 Performance Test Summary')
    console.log('=' .repeat(50))
    
    results.forEach(result => {
      console.log(`\n${result.test}:`)
      console.log(`  Old query: ${result.oldTime.toFixed(2)}ms`)
      console.log(`  New query: ${result.newTime.toFixed(2)}ms`)
      console.log(`  Improvement: ${result.improvement.toFixed(1)}%`)
    })

    const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length
    console.log(`\n🎯 Average Performance Improvement: ${avgImprovement.toFixed(1)}%`)

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
}

export { testEmployeeListing, testTrainingModules, testSearchPerformance }
