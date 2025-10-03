import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const videoFile = formData.get('video') as File

    if (!videoFile) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileName = `${user.id}/${Date.now()}-${videoFile.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('training-videos')
      .upload(fileName, videoFile, {
        contentType: videoFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload video' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('training-videos')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: uploadData.path,
    })
  } catch (error) {
    console.error('Storage upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
