import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Mux from '@mux/mux-node'

// Initialize Mux only if credentials are available
const getMuxClient = () => {
  if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
    return null
  }
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get training to check ownership and find Mux asset ID (if column exists)
    const { data: training, error: fetchError } = await supabase
      .from('training_modules')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (fetchError || !training) {
      console.error('Training fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      )
    }

    // Check if user owns this training
    if (training.creator_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this training' },
        { status: 403 }
      )
    }

    // Try to get Mux asset ID if the column exists
    const mux = getMuxClient()
    if (mux) {
      try {
        const { data: muxData } = await supabase
          .from('training_modules')
          .select('mux_asset_id')
          .eq('id', id)
          .single()

        if (muxData && muxData.mux_asset_id) {
          try {
            await mux.video.assets.delete(muxData.mux_asset_id)
            console.log('Deleted Mux asset:', muxData.mux_asset_id)
          } catch (muxError: unknown) {
            console.error('Mux delete error:', muxError)
            // Continue with database deletion even if Mux fails
          }
        }
      } catch (error) {
        // Column might not exist yet - that's okay
        console.warn('Could not fetch mux_asset_id (column might not exist):', error)
      }
    }

    // Delete the training module from database
    // This will cascade delete assignments and chat messages due to foreign keys
    const { error: deleteError } = await supabase
      .from('training_modules')
      .delete()
      .eq('id', id)
      .eq('creator_id', user.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete training' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Training deleted successfully'
    })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
