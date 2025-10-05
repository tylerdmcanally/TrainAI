/**
 * API Error Handling Utilities
 * Provides standardized error handling for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createAppError, 
  getErrorMessage, 
  logError, 
  ERROR_CODES,
  TrainAIError 
} from './error-handler'

export interface ApiHandlerOptions {
  requireAuth?: boolean
  allowedMethods?: string[]
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }
}

/**
 * Wrapper for API route handlers with comprehensive error handling
 */
export function withApiErrorHandler<T = unknown>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  options: ApiHandlerOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      // Check HTTP method
      if (options.allowedMethods && !options.allowedMethods.includes(req.method)) {
        throw createAppError(`Method ${req.method} not allowed`, {
          code: ERROR_CODES.VALIDATION_ERROR,
          statusCode: 405,
        })
      }

      // Rate limiting (basic implementation)
      if (options.rateLimit) {
        // TODO: Implement proper rate limiting with Redis or similar
        // For now, this is a placeholder
      }

      // Execute the handler
      return await handler(req)

    } catch (error) {
      const appError = createAppError(error, {
        context: {
          method: req.method,
          url: req.url,
          userAgent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString(),
        },
      })

      // Log error
      logError(appError, {
        endpoint: req.nextUrl.pathname,
        method: req.method,
        body: req.body ? 'present' : 'absent',
      })

      // Return standardized error response
      return createErrorResponse(appError)
    }
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(error: TrainAIError): NextResponse {
  const response: Record<string, unknown> = {
    error: getErrorMessage(error),
    code: error.code,
    timestamp: new Date().toISOString(),
  }

  // Add debug info in development
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      message: error.message,
      stack: error.stack,
      context: error.context,
    }
  }

  // Add retry information for retryable errors
  if (error.isRetryable) {
    response.retryable = true
    response.retryAfter = calculateRetryAfter(error.statusCode || 500)
  }

  return NextResponse.json(response, {
    status: error.statusCode || 500,
    headers: {
      'Content-Type': 'application/json',
      ...(error.isRetryable && {
        'Retry-After': calculateRetryAfter(error.statusCode || 500).toString(),
      }),
    },
  })
}

/**
 * Calculate retry delay based on error status
 */
function calculateRetryAfter(statusCode: number): number {
  if (statusCode === 429) return 60 // Rate limited - wait 1 minute
  if (statusCode >= 500) return 30 // Server error - wait 30 seconds
  return 5 // Default - wait 5 seconds
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  body: unknown,
  validator: (data: unknown) => data is T
): T {
  if (!validator(body)) {
    throw createAppError('Invalid request body', {
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
    })
  }
  return body
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => {
    const value = body[field]
    return value === undefined || value === null || value === ''
  })

  if (missingFields.length > 0) {
    throw createAppError(
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
 * Handle Supabase errors specifically
 */
export function handleSupabaseError(error: unknown): TrainAIError {
  if (error.code === 'PGRST116') {
    return createAppError('Record not found', {
      code: ERROR_CODES.RECORD_NOT_FOUND,
      statusCode: 404,
    })
  }

  if (error.code === '23505') {
    return createAppError('Record already exists', {
      code: ERROR_CODES.DUPLICATE_RECORD,
      statusCode: 409,
    })
  }

  if (error.code === '42501') {
    return createAppError('Insufficient permissions', {
      code: ERROR_CODES.UNAUTHORIZED,
      statusCode: 403,
    })
  }

  return createAppError(error.message || 'Database error', {
    code: ERROR_CODES.SUPABASE_ERROR,
    statusCode: 500,
    context: { supabaseError: error },
  })
}

/**
 * Handle OpenAI errors specifically
 */
export function handleOpenAIError(error: unknown): TrainAIError {
  if (error.status === 429) {
    return createAppError('AI service rate limit exceeded', {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      statusCode: 429,
      isRetryable: true,
    })
  }

  if (error.status === 402) {
    return createAppError('AI service quota exceeded', {
      code: ERROR_CODES.QUOTA_EXCEEDED,
      statusCode: 402,
    })
  }

  if (error.status >= 500) {
    return createAppError('AI service temporarily unavailable', {
      code: ERROR_CODES.OPENAI_ERROR,
      statusCode: 503,
      isRetryable: true,
    })
  }

  return createAppError(error.message || 'AI service error', {
    code: ERROR_CODES.OPENAI_ERROR,
    statusCode: 500,
    context: { openaiError: error },
  })
}

/**
 * Handle Mux errors specifically
 */
export function handleMuxError(error: unknown): TrainAIError {
  if (error.message?.includes('Free plan is limited to')) {
    return createAppError('Video storage limit reached', {
      code: ERROR_CODES.QUOTA_EXCEEDED,
      statusCode: 402,
    })
  }

  if (error.status >= 500) {
    return createAppError('Video service temporarily unavailable', {
      code: ERROR_CODES.MUX_ERROR,
      statusCode: 503,
      isRetryable: true,
    })
  }

  return createAppError(error.message || 'Video service error', {
    code: ERROR_CODES.MUX_ERROR,
    statusCode: 500,
    context: { muxError: error },
  })
}

/**
 * Middleware for authentication validation
 */
export async function validateAuth(req: NextRequest) {
  // This would integrate with your auth system
  // For now, it's a placeholder that could check JWT tokens, session cookies, etc.
  
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw createAppError('Authentication required', {
      code: ERROR_CODES.UNAUTHORIZED,
      statusCode: 401,
    })
  }

  // TODO: Implement actual JWT validation
  // const token = authHeader.replace('Bearer ', '')
  // const isValid = await validateJWT(token)
  // if (!isValid) {
  //   throw createAppError('Invalid authentication token', {
  //     code: ERROR_CODES.UNAUTHORIZED,
  //     statusCode: 401,
  //   })
  // }

  return true
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200
): NextResponse {
  const response: Record<string, unknown> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response, { status: statusCode })
}
