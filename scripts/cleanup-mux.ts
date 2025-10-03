import Mux from '@mux/mux-node'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanupMuxAssets() {
  try {
    console.log('Fetching all Mux assets...')

    // Get all Mux assets
    const response = await mux.video.assets.list({ limit: 100 })
    const assets = response.data || []

    console.log(`Found ${assets.length} Mux assets`)

    // Delete each asset
    for (const asset of assets) {
      try {
        await mux.video.assets.delete(asset.id)
        console.log(`✓ Deleted Mux asset: ${asset.id}`)

        // Update database to remove mux references
        await supabase
          .from('training_modules')
          .update({
            mux_asset_id: null,
            mux_playback_id: null
          })
          .eq('mux_asset_id', asset.id)

      } catch (error: any) {
        console.error(`✗ Failed to delete asset ${asset.id}:`, error.message)
      }
    }

    console.log('\n✅ Cleanup complete!')

  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

cleanupMuxAssets()
