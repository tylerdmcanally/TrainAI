-- Add detailed progress tracking to assignments table

ALTER TABLE assignments
ADD COLUMN current_position INTEGER DEFAULT 0,
ADD COLUMN completed_checkpoints JSONB DEFAULT '[]',
ADD COLUMN time_spent INTEGER DEFAULT 0,
ADD COLUMN last_watched_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX idx_assignments_employee_status ON assignments(employee_id, status);

-- Add comment for documentation
COMMENT ON COLUMN assignments.current_position IS 'Current video position in seconds';
COMMENT ON COLUMN assignments.completed_checkpoints IS 'Array of completed checkpoint indices';
COMMENT ON COLUMN assignments.time_spent IS 'Total time spent watching in seconds';
COMMENT ON COLUMN assignments.last_watched_at IS 'Last time the employee watched this training';
