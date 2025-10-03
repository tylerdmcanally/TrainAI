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

    const body = await request.json()
    const {
      title,
      description,
      videoDuration,
      videoStorageUrl,
      muxPlaybackId,
      transcript,
      chapters,
      sop,
      keyPoints,
    } = body

    // Get user's company
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Insert training module
    const { data: training, error: insertError } = await supabase
      .from('training_modules')
      .insert({
        company_id: userData.company_id,
        creator_id: user.id,
        title,
        description,
        video_duration: videoDuration,
        video_url: videoStorageUrl || null,
        mux_playback_id: muxPlaybackId || null,
        transcript,
        chapters: chapters || [],
        sop,
        key_points: keyPoints || [],
        status: 'published',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to save training' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      training,
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
