-- Add Mux columns to training_modules table
ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
ADD COLUMN IF NOT EXISTS mux_asset_id TEXT;

-- Add comments
COMMENT ON COLUMN training_modules.mux_playback_id IS 'Mux playback ID for video streaming';
COMMENT ON COLUMN training_modules.mux_asset_id IS 'Mux asset ID for video management and deletion';
