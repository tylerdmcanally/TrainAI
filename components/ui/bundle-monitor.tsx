'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Package, Clock, Zap } from 'lucide-react'

interface BundleMetrics {
  totalSize: number
  jsSize: number
  cssSize: number
  loadTime: number
  chunkCount: number
  performanceScore: number
}

interface BundleMonitorProps {
  className?: string
}

export function BundleMonitor({ className }: BundleMonitorProps) {
  const [metrics, setMetrics] = useState<BundleMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const measureBundleMetrics = async () => {
      try {
        // Measure load time
        const loadTime = performance.now()
        
        // Get resource timing data
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const jsResources = resources.filter(r => r.name.includes('.js'))
        const cssResources = resources.filter(r => r.name.includes('.css'))
        
        // Calculate sizes (approximate)
        const jsSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        const cssSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
        const totalSize = jsSize + cssSize
        
        // Count chunks
        const chunkCount = jsResources.length + cssResources.length
        
        // Calculate performance score (0-100)
        let performanceScore = 100
        
        if (totalSize > 1000 * 1024) performanceScore -= 20 // > 1MB
        if (loadTime > 3000) performanceScore -= 20 // > 3s
        if (chunkCount > 20) performanceScore -= 10 // > 20 chunks
        if (jsSize > 800 * 1024) performanceScore -= 15 // > 800KB JS
        if (cssSize > 100 * 1024) performanceScore -= 10 // > 100KB CSS
        
        performanceScore = Math.max(0, performanceScore)
        
        setMetrics({
          totalSize,
          jsSize,
          cssSize,
          loadTime,
          chunkCount,
          performanceScore,
        })
        
      } catch (error) {
        console.error('Failed to measure bundle metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Measure after a short delay to allow resources to load
    const timer = setTimeout(measureBundleMetrics, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // const getPerformanceColor = (score: number): string => {
  //   if (score >= 80) return 'text-green-600'
  //   if (score >= 60) return 'text-yellow-600'
  //   return 'text-red-600'
  // }

  const getPerformanceBadge = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Monitor
          </CardTitle>
          <CardDescription>Loading bundle metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Monitor
          </CardTitle>
          <CardDescription>Unable to load bundle metrics</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bundle Monitor
        </CardTitle>
        <CardDescription>
          Real-time bundle performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Performance Score</span>
          </div>
          <Badge variant={getPerformanceBadge(metrics.performanceScore)}>
            {metrics.performanceScore}/100
          </Badge>
        </div>

        {/* Bundle Sizes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Size</p>
              <p className="text-sm font-medium">{formatBytes(metrics.totalSize)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Chunks</p>
              <p className="text-sm font-medium">{metrics.chunkCount}</p>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>JavaScript</span>
            <span>{formatBytes(metrics.jsSize)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>CSS</span>
            <span>{formatBytes(metrics.cssSize)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Load Time</span>
            <span>{metrics.loadTime.toFixed(0)}ms</span>
          </div>
        </div>

        {/* Recommendations */}
        {metrics.performanceScore < 80 && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-1">Optimization Tips:</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              {metrics.totalSize > 1000 * 1024 && (
                <li>• Bundle size is large. Consider code splitting.</li>
              )}
              {metrics.loadTime > 3000 && (
                <li>• Load time is slow. Optimize critical resources.</li>
              )}
              {metrics.chunkCount > 20 && (
                <li>• Many chunks detected. Consider bundling strategy.</li>
              )}
            </ul>
          </div>
        )}

        {/* Performance Indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>Measured at {new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
