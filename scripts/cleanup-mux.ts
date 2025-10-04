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

    // Get all mux_asset_ids from database
    const { data: trainings } = await supabase
      .from('training_modules')
      .select('mux_asset_id')
      .not('mux_asset_id', 'is', null)

    const validAssetIds = new Set(
      trainings?.map(t => t.mux_asset_id).filter(Boolean) || []
    )

    console.log(`Found ${validAssetIds.size} assets referenced in database`)

    let deletedCount = 0
    let keptCount = 0

    // Delete orphaned assets (not in database)
    for (const asset of assets) {
      try {
        if (validAssetIds.has(asset.id)) {
          console.log(`  Keeping asset ${asset.id} (in use)`)
          keptCount++
        } else {
          await mux.video.assets.delete(asset.id)
          console.log(`✓ Deleted orphaned asset: ${asset.id}`)
          deletedCount++
        }
      } catch (error: any) {
        console.error(`✗ Failed to delete asset ${asset.id}:`, error.message)
      }
    }

    console.log('\n✅ Cleanup complete!')
    console.log(`   Deleted: ${deletedCount} orphaned assets`)
    console.log(`   Kept: ${keptCount} assets in use`)

  } catch (error) {
    console.error('Cleanup error:', error)
  }
}

cleanupMuxAssets()
