// lib/utils/performance-monitor.ts

export interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

export interface UploadPerformanceMetrics {
  fileSize: number
  chunkSize: number
  totalChunks: number
  uploadTime: number
  throughput: number // bytes per second
  chunksPerSecond: number
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private static instance: PerformanceMonitor

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  start(name: string, metadata?: Record<string, unknown>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    })
  }

  end(name: string): PerformanceMetric | null {
    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
    }

    this.metrics.set(name, completedMetric)
    return completedMetric
  }

  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null
  }

  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  clear(): void {
    this.metrics.clear()
  }

  // Utility methods for common operations
  measureUploadPerformance(
    fileSize: number,
    chunkSize: number,
    totalChunks: number,
    uploadTime: number
  ): UploadPerformanceMetrics {
    const throughput = fileSize / (uploadTime / 1000) // bytes per second
    const chunksPerSecond = totalChunks / (uploadTime / 1000)

    return {
      fileSize,
      chunkSize,
      totalChunks,
      uploadTime,
      throughput,
      chunksPerSecond,
    }
  }

  // Format metrics for display
  formatMetric(metric: PerformanceMetric): string {
    if (!metric.duration) {
      return `${metric.name}: In progress`
    }

    const duration = metric.duration < 1000 
      ? `${metric.duration.toFixed(0)}ms`
      : `${(metric.duration / 1000).toFixed(2)}s`

    return `${metric.name}: ${duration}`
  }

  // Log performance summary
  logSummary(): void {
    const metrics = this.getAllMetrics()
    const completedMetrics = metrics.filter(m => m.duration !== undefined)

    console.group('🚀 Performance Summary')
    completedMetrics.forEach(metric => {
      console.log(this.formatMetric(metric))
      if (metric.metadata) {
        console.log('  Metadata:', metric.metadata)
      }
    })
    console.groupEnd()
  }

  // Export metrics as JSON
  exportMetrics(): string {
    return JSON.stringify(this.getAllMetrics(), null, 2)
  }
}

// Convenience functions
export const perf = PerformanceMonitor.getInstance()

export function startTiming(name: string, metadata?: Record<string, unknown>): void {
  perf.start(name, metadata)
}

export function endTiming(name: string): PerformanceMetric | null {
  return perf.end(name)
}

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  perf.start(name, metadata)
  return fn().finally(() => {
    perf.end(name)
  })
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const start = (name: string, metadata?: Record<string, unknown>) => {
    perf.start(name, metadata)
  }

  const end = (name: string) => {
    return perf.end(name)
  }

  const getMetric = (name: string) => {
    return perf.getMetric(name)
  }

  const logSummary = () => {
    perf.logSummary()
  }

  return { start, end, getMetric, logSummary }
}

// Import React for the hook
// import { useCallback } from 'react' // Unused for now
