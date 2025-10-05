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

    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const sessionId = formData.get('sessionId') as string

    if (!chunk || isNaN(chunkIndex) || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate chunk filename
    const chunkFileName = `${sessionId}_chunk_${chunkIndex.toString().padStart(6, '0')}`
    const chunkPath = `${user.id}/${chunkFileName}`

    // Upload chunk to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('training-videos')
      .upload(chunkPath, chunk, {
        contentType: chunk.type,
        upsert: true, // Allow overwriting if chunk is retried
      })

    if (uploadError) {
      console.error('Chunk upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload chunk' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      chunkIndex,
      chunkPath: uploadData.path,
    })
  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json(
      { error: getErrorMessage(createAppError(error)) },
      { status: 500 }
    )
  }
}
