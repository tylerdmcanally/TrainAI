/**
 * Comprehensive error handling utilities for TrainAI
 */

export interface AppError extends Error {
  code?: string
  statusCode?: number
  context?: Record<string, unknown>
  isRetryable?: boolean
}

export class TrainAIError extends Error implements AppError {
  code?: string
  statusCode?: number
  context?: Record<string, unknown>
  isRetryable?: boolean

  constructor(
    message: string,
    options: {
      code?: string
      statusCode?: number
      context?: Record<string, unknown>
      isRetryable?: boolean
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'TrainAIError'
    this.code = options.code
    this.statusCode = options.statusCode || 500
    this.context = options.context
    this.isRetryable = options.isRetryable || false
    
    if (options.cause) {
      this.cause = options.cause
    }
  }
}

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Processing errors
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  AI_GENERATION_FAILED: 'AI_GENERATION_FAILED',
  VIDEO_PROCESSING_FAILED: 'VIDEO_PROCESSING_FAILED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // External service errors
  MUX_ERROR: 'MUX_ERROR',
  OPENAI_ERROR: 'OPENAI_ERROR',
  SUPABASE_ERROR: 'SUPABASE_ERROR',
} as const

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNAUTHORIZED]: 'Please log in to continue',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.SESSION_EXPIRED]: 'Your session has expired. Please log in again',
  
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection',
  [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again',
  [ERROR_CODES.CONNECTION_FAILED]: 'Unable to connect to server. Please try again later',
  
  [ERROR_CODES.FILE_TOO_LARGE]: 'File is too large. Please choose a smaller file',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type. Please choose a supported file format',
  [ERROR_CODES.UPLOAD_FAILED]: 'Failed to upload file. Please try again',
  
  [ERROR_CODES.TRANSCRIPTION_FAILED]: 'Failed to transcribe audio. Please try recording again',
  [ERROR_CODES.AI_GENERATION_FAILED]: 'AI processing failed. Please try again',
  [ERROR_CODES.VIDEO_PROCESSING_FAILED]: 'Video processing failed. Please try again',
  
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred. Please try again',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'Record not found',
  [ERROR_CODES.DUPLICATE_RECORD]: 'Record already exists',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again',
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota exceeded. Please upgrade your plan or try again later',
  
  [ERROR_CODES.MUX_ERROR]: 'Video service error. Please try again',
  [ERROR_CODES.OPENAI_ERROR]: 'AI service temporarily unavailable. Please try again',
  [ERROR_CODES.SUPABASE_ERROR]: 'Service temporarily unavailable. Please try again',
} as const

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof TrainAIError && error.code) {
    return ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || error.message
  }
  
  if (error instanceof Error) {
    // Handle specific error patterns
    if (error.message.includes('fetch')) {
      return ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR]
    }
    if (error.message.includes('timeout')) {
      return ERROR_MESSAGES[ERROR_CODES.TIMEOUT]
    }
    if (error.message.includes('unauthorized')) {
      return ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED]
    }
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TrainAIError) {
    return error.isRetryable || false
  }
  
  if (error instanceof Error) {
    // Network errors are generally retryable
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('timeout')) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (error.message.includes('500') || 
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true
    }
  }
  
  return false
}

/**
 * Create a standardized error from various error sources
 */
export function createAppError(
  error: unknown,
  context?: Record<string, unknown>
): TrainAIError {
  if (error instanceof TrainAIError) {
    return error
  }
  
  if (error instanceof Error) {
    return new TrainAIError(error.message, {
      context,
      cause: error,
      isRetryable: isRetryableError(error),
    })
  }
  
  if (typeof error === 'string') {
    return new TrainAIError(error, { context })
  }
  
  return new TrainAIError('Unknown error occurred', { context })
}

/**
 * Retry function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      )
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field]
    return value === undefined || value === null || value === ''
  })
  
  if (missingFields.length > 0) {
    throw new TrainAIError(
      `Missing required fields: ${missingFields.join(', ')}`,
      {
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        statusCode: 400,
        context: { missingFields },
      }
    )
  }
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, options: {
  maxSize?: number // in bytes
  allowedTypes?: string[]
} = {}): void {
  const { maxSize = 100 * 1024 * 1024, allowedTypes = [] } = options // 100MB default
  
  if (file.size > maxSize) {
    throw new TrainAIError(
      `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
      {
        code: ERROR_CODES.FILE_TOO_LARGE,
        statusCode: 413,
        context: { fileSize: file.size, maxSize },
      }
    )
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new TrainAIError(
      `File type ${file.type} is not allowed`,
      {
        code: ERROR_CODES.INVALID_FILE_TYPE,
        statusCode: 415,
        context: { fileType: file.type, allowedTypes },
      }
    )
  }
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const appError = createAppError(error, context)
  
  console.error('TrainAI Error:', {
    message: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    context: appError.context,
    stack: appError.stack,
    timestamp: new Date().toISOString(),
  })
  
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with error tracking service
    // Example: Sentry.captureException(appError, { extra: context })
  }
}
