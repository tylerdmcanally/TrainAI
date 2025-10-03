import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json()

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }

    // Check for Mux credentials
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json(
        { error: 'Mux credentials not configured' },
        { status: 500 }
      )
    }

    // Initialize Mux client
    const mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    })

    // Create an asset from the video URL
    const asset = await mux.video.assets.create({
      input: [{ url: videoUrl }],
      playback_policy: ['public'],
      // mp4_support removed - not available on basic tier
    })

    // Return the playback ID and asset ID
    return NextResponse.json({
      playbackId: asset.playback_ids?.[0]?.id,
      assetId: asset.id,
      status: asset.status,
    })
  } catch (error: any) {
    console.error('Mux upload error:', error)

    // Check for Mux plan limit error
    if (error?.message?.includes('Free plan is limited to')) {
      return NextResponse.json(
        { error: 'Mux free plan limit reached (10 videos max). Please delete old trainings or upgrade your Mux plan.' },
        { status: 402 } // Payment Required
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to upload to Mux' },
      { status: 500 }
    )
  }
}
