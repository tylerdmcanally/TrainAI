import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAppError, getErrorMessage } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { fileName, fileSize, fileType, uploadId, metadata } = await request.json()

    if (!fileName || !fileSize || !uploadId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    // Generate unique session ID and upload path
    const sessionId = `session-${uploadId}-${Date.now()}`
    const uploadPath = `${user.id}/${sessionId}`

    // Store session info in a temporary table or cache
    // For now, we'll use a simple approach with the sessionId
    const sessionData = {
      sessionId,
      uploadPath,
      fileName,
      fileSize,
      fileType,
      userId: user.id,
      metadata,
      createdAt: new Date().toISOString(),
    }

    // In a real implementation, you might store this in Redis or a temporary table
    // For now, we'll return the session info and trust the client to maintain it

    return NextResponse.json({
      sessionId,
      uploadUrl: '/api/storage/upload/chunk',
      uploadPath,
    })
  } catch (error) {
    console.error('Upload session initialization error:', error)
    return NextResponse.json(
      { error: getErrorMessage(createAppError(error)) },
      { status: 500 }
    )
  }
}
