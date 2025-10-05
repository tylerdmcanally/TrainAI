/**
 * Custom hook for handling retry logic with exponential backoff
 */

import { useState, useCallback } from 'react'
import { useToastNotifications } from '@/components/ui/toast'
import { isRetryableError, getErrorMessage } from '@/lib/utils/error-handler'

interface UseRetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffFactor?: number
  showToast?: boolean
}

interface RetryState {
  isRetrying: boolean
  retryCount: number
  lastError: Error | null
}

export function useRetry(options: UseRetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    showToast = true,
  } = options

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  })

  const { showError, showWarning } = useToastNotifications()

  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      customOptions?: Partial<UseRetryOptions>
    ): Promise<T> => {
      const opts = { ...options, ...customOptions }
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
        try {
          setState(prev => ({
            ...prev,
            isRetrying: attempt > 0,
            retryCount: attempt,
          }))

          const result = await operation()
          
          // Success - reset state
          setState({
            isRetrying: false,
            retryCount: 0,
            lastError: null,
          })

          return result

        } catch (error) {
          lastError = error as Error
          
          // Don't retry if it's not a retryable error
          if (!isRetryableError(error)) {
            setState({
              isRetrying: false,
              retryCount: attempt,
              lastError,
            })

            if (showToast) {
              showError('Operation Failed', getErrorMessage(error))
            }
            
            throw error
          }

          // Don't retry on the last attempt
          if (attempt === opts.maxRetries!) {
            break
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(
            opts.initialDelay! * Math.pow(opts.backoffFactor!, attempt),
            opts.maxDelay!
          )

          if (showToast && attempt === 0) {
            showWarning(
              'Retrying...', 
              `Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay / 1000)} seconds...`
            )
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      // All retries exhausted
      setState({
        isRetrying: false,
        retryCount: opts.maxRetries!,
        lastError,
      })

      if (showToast) {
        showError(
          'Operation Failed', 
          `Failed after ${opts.maxRetries!} attempts. ${getErrorMessage(lastError)}`
        )
      }

      throw lastError
    },
    [maxRetries, initialDelay, maxDelay, backoffFactor, showToast, showError, showWarning]
  )

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
    })
  }, [])

  return {
    executeWithRetry,
    reset,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    lastError: state.lastError,
    hasRetried: state.retryCount > 0,
  }
}

/**
 * Hook for handling async operations with retry logic
 */
export function useAsyncWithRetry<T>(
  asyncFn: () => Promise<T>,
  dependencies: any[] = [],
  retryOptions?: UseRetryOptions
) {
  const { executeWithRetry, ...retryState } = useRetry(retryOptions)
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await executeWithRetry(asyncFn)
      setData(result)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [executeWithRetry, asyncFn])

  const reset = useCallback(() => {
    setData(null)
    setIsLoading(false)
    retryState.reset()
  }, [retryState])

  return {
    execute,
    reset,
    data,
    isLoading,
    ...retryState,
  }
}
