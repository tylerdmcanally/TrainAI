#!/usr/bin/env tsx

/**
 * Bundle Analysis Script
 * Analyzes bundle size and provides optimization recommendations
 * Run with: npx tsx scripts/analyze-bundle.ts
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface BundleAnalysis {
  totalSize: number
  jsSize: number
  cssSize: number
  chunks: Array<{
    name: string
    size: number
    gzippedSize?: number
  }>
  recommendations: string[]
}

async function analyzeBundle(): Promise<BundleAnalysis> {
  console.log('🔍 Analyzing bundle...\n')

  try {
    // Build the project
    console.log('📦 Building project...')
    execSync('npm run build', { stdio: 'inherit' })

    // Check if .next directory exists
    const nextDir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(nextDir)) {
      throw new Error('.next directory not found. Build may have failed.')
    }

    // Analyze static chunks
    const staticDir = path.join(nextDir, 'static', 'chunks')
    const chunks: Array<{ name: string; size: number; gzippedSize?: number }> = []

    if (fs.existsSync(staticDir)) {
      const files = fs.readdirSync(staticDir)
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.css')) {
          const filePath = path.join(staticDir, file)
          const stats = fs.statSync(filePath)
          const size = stats.size
          
          // Estimate gzipped size (rough approximation)
          const gzippedSize = Math.round(size * 0.3)
          
          chunks.push({
            name: file,
            size,
            gzippedSize,
          })
        }
      }
    }

    // Calculate total sizes
    const jsChunks = chunks.filter(chunk => chunk.name.endsWith('.js'))
    const cssChunks = chunks.filter(chunk => chunk.name.endsWith('.css'))
    
    const jsSize = jsChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const cssSize = cssChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    const totalSize = jsSize + cssSize

    // Generate recommendations
    const recommendations: string[] = []
    
    if (jsSize > 1000 * 1024) { // > 1MB
      recommendations.push('JavaScript bundle is large (>1MB). Consider code splitting.')
    }
    
    if (cssSize > 100 * 1024) { // > 100KB
      recommendations.push('CSS bundle is large (>100KB). Consider purging unused styles.')
    }
    
    const largeChunks = chunks.filter(chunk => chunk.size > 500 * 1024) // > 500KB
    if (largeChunks.length > 0) {
      recommendations.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}. Consider splitting.`)
    }
    
    const vendorChunks = chunks.filter(chunk => chunk.name.includes('vendor') || chunk.name.includes('node_modules'))
    if (vendorChunks.length > 0) {
      recommendations.push('Vendor chunks detected. Consider optimizing third-party imports.')
    }

    return {
      totalSize,
      jsSize,
      cssSize,
      chunks: chunks.sort((a, b) => b.size - a.size),
      recommendations,
    }

  } catch (error) {
    console.error('❌ Bundle analysis failed:', error)
    throw error
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function printAnalysis(analysis: BundleAnalysis) {
  console.log('📊 Bundle Analysis Results\n')
  console.log('=' .repeat(50))
  
  console.log(`📦 Total Bundle Size: ${formatBytes(analysis.totalSize)}`)
  console.log(`📄 JavaScript: ${formatBytes(analysis.jsSize)}`)
  console.log(`🎨 CSS: ${formatBytes(analysis.cssSize)}`)
  
  console.log('\n📋 Top Chunks by Size:')
  console.log('-'.repeat(50))
  
  analysis.chunks.slice(0, 10).forEach((chunk, index) => {
    const gzipped = chunk.gzippedSize ? ` (${formatBytes(chunk.gzippedSize)} gzipped)` : ''
    console.log(`${index + 1}. ${chunk.name}: ${formatBytes(chunk.size)}${gzipped}`)
  })
  
  console.log('\n💡 Optimization Recommendations:')
  console.log('-'.repeat(50))
  
  if (analysis.recommendations.length === 0) {
    console.log('✅ Bundle size looks good! No major optimizations needed.')
  } else {
    analysis.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })
  }
  
  console.log('\n🚀 Code Splitting Opportunities:')
  console.log('-'.repeat(50))
  console.log('1. Split training creation flow into lazy-loaded steps')
  console.log('2. Lazy load video player components')
  console.log('3. Split dashboard components by role')
  console.log('4. Lazy load AI tutor chat')
  console.log('5. Split heavy UI components (forms, charts)')
  
  console.log('\n📈 Performance Targets:')
  console.log('-'.repeat(50))
  console.log('• Initial bundle: < 250KB gzipped')
  console.log('• Total bundle: < 1MB gzipped')
  console.log('• Largest chunk: < 500KB gzipped')
  console.log('• Time to Interactive: < 3s')
}

async function runBundleAnalysis() {
  try {
    const analysis = await analyzeBundle()
    printAnalysis(analysis)
    
    // Save analysis to file
    const reportPath = path.join(process.cwd(), 'bundle-analysis.json')
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2))
    console.log(`\n📄 Detailed analysis saved to: ${reportPath}`)
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error)
    process.exit(1)
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runBundleAnalysis()
}

export { analyzeBundle, printAnalysis }
