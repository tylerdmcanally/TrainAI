import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = parseRequest(await request.json())

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
  } catch (error: unknown) {
    console.error('Mux upload error:', error)

    const message = error instanceof Error ? error.message : 'Failed to upload to Mux'

    if (message.includes('Free plan is limited to')) {
      return NextResponse.json(
        { error: 'Mux free plan limit reached (10 videos max). Please delete old trainings or upgrade your Mux plan.' },
        { status: 402 }
      )
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

function parseRequest(body: unknown): { videoUrl: string } {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid request body')
  }

  const record = body as Record<string, unknown>
  const videoUrl = typeof record.videoUrl === 'string' ? record.videoUrl : ''

  if (!videoUrl) {
    throw new Error('Video URL is required')
  }

  return { videoUrl }
}
