import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'
import { 
  createAppError, 
  getErrorMessage, 
  validateFileUpload,
  ERROR_CODES,
  logError 
} from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    // Validate input
    if (!audioFile) {
      throw createAppError('No audio file provided', {
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        statusCode: 400,
      })
    }

    // Validate file
    validateFileUpload(audioFile, {
      maxSize: 25 * 1024 * 1024, // 25MB limit for Whisper
      allowedTypes: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
    })

    // Check if file is too large for Whisper API
    if (audioFile.size > 25 * 1024 * 1024) {
      throw createAppError('Audio file too large. Maximum size is 25MB', {
        code: ERROR_CODES.FILE_TOO_LARGE,
        statusCode: 413,
        context: { fileSize: audioFile.size, maxSize: 25 * 1024 * 1024 },
      })
    }

    // Check if file is too small (likely empty or corrupted)
    if (audioFile.size < 1000) { // Less than 1KB
      throw createAppError('Audio file appears to be empty or corrupted', {
        code: ERROR_CODES.INVALID_FILE_TYPE,
        statusCode: 400,
        context: { fileSize: audioFile.size },
      })
    }

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    })

    // Validate transcription result
    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
      throw createAppError('Transcription resulted in empty text', {
        code: ERROR_CODES.TRANSCRIPTION_FAILED,
        statusCode: 422,
        context: { fileSize: audioFile.size, fileName: audioFile.name },
      })
    }

    return NextResponse.json({
      transcript: transcription.trim(),
      metadata: {
        fileSize: audioFile.size,
        fileName: audioFile.name,
        duration: audioFile.size / 16000, // Rough estimate
      },
    })

  } catch (error) {
    const appError = createAppError(error, {
      context: {
        endpoint: '/api/training/transcribe',
        timestamp: new Date().toISOString(),
      },
    })

    // Log error for debugging
    logError(appError, {
      endpoint: '/api/training/transcribe',
      method: 'POST',
    })

    // Handle specific OpenAI errors
    if (error instanceof Error && error.message.includes('OpenAI')) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: 'AI service is currently busy. Please try again in a moment.',
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED 
          },
          { status: 429 }
        )
      }
      
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { 
            error: 'AI service quota exceeded. Please try again later.',
            code: ERROR_CODES.QUOTA_EXCEEDED 
          },
          { status: 402 }
        )
      }
    }

    // Return standardized error response
    return NextResponse.json(
      { 
        error: getErrorMessage(appError),
        code: appError.code,
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            message: appError.message,
            stack: appError.stack,
          }
        })
      },
      { status: appError.statusCode }
    )
  }
}
