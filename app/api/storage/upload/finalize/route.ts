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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // List all chunks for this session
    const { data: chunks, error: listError } = await supabase
      .storage
      .from('training-videos')
      .list(user.id, {
        search: `${sessionId}_chunk_`,
      })

    if (listError) {
      console.error('Error listing chunks:', listError)
      return NextResponse.json(
        { error: 'Failed to list chunks' },
        { status: 500 }
      )
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: 'No chunks found for session' },
        { status: 404 }
      )
    }

    // Sort chunks by index
    const sortedChunks = chunks
      .filter(chunk => chunk.name.startsWith(`${sessionId}_chunk_`))
      .sort((a, b) => {
        const aIndex = parseInt(a.name.split('_chunk_')[1])
        const bIndex = parseInt(b.name.split('_chunk_')[1])
        return aIndex - bIndex
      })

    // Download and concatenate all chunks
    const chunkBuffers: ArrayBuffer[] = []
    
    for (const chunk of sortedChunks) {
      const { data: chunkData, error: downloadError } = await supabase
        .storage
        .from('training-videos')
        .download(`${user.id}/${chunk.name}`)

      if (downloadError) {
        console.error('Error downloading chunk:', downloadError)
        return NextResponse.json(
          { error: 'Failed to download chunk' },
          { status: 500 }
        )
      }

      const buffer = await chunkData.arrayBuffer()
      chunkBuffers.push(buffer)
    }

    // Concatenate all chunks
    const totalSize = chunkBuffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
    const combinedBuffer = new Uint8Array(totalSize)
    let offset = 0

    for (const buffer of chunkBuffers) {
      combinedBuffer.set(new Uint8Array(buffer), offset)
      offset += buffer.byteLength
    }

    // Create final file blob
    const finalBlob = new Blob([combinedBuffer])
    
    // Generate final filename
    const finalFileName = `${sessionId}_final.webm`
    const finalPath = `${user.id}/${finalFileName}`

    // Upload final file
    const { data: finalUploadData, error: finalUploadError } = await supabase
      .storage
      .from('training-videos')
      .upload(finalPath, finalBlob, {
        contentType: 'video/webm',
        upsert: true,
      })

    if (finalUploadError) {
      console.error('Final upload error:', finalUploadError)
      return NextResponse.json(
        { error: 'Failed to upload final file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('training-videos')
      .getPublicUrl(finalUploadData.path)

    // Clean up chunk files
    const chunkPaths = sortedChunks.map(chunk => `${user.id}/${chunk.name}`)
    await supabase
      .storage
      .from('training-videos')
      .remove(chunkPaths)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: finalUploadData.path,
      fileSize: finalBlob.size,
      chunksProcessed: sortedChunks.length,
    })
  } catch (error) {
    console.error('Upload finalization error:', error)
    return NextResponse.json(
      { error: getErrorMessage(createAppError(error)) },
      { status: 500 }
    )
  }
}
