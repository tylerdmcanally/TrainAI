-- Add mux_playback_id column to training_modules table
ALTER TABLE training_modules
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN training_modules.mux_playback_id IS 'Mux playback ID for video streaming';
