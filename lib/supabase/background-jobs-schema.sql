-- Background Jobs Schema for TrainAI
-- This schema supports background processing of heavy operations

-- Job types enum
CREATE TYPE job_type AS ENUM (
  'transcription',
  'sop_generation', 
  'mux_upload',
  'tts_generation',
  'checkpoint_evaluation'
);

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'retrying'
);

-- Background jobs table
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_type job_type NOT NULL,
  status job_status DEFAULT 'pending',
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
  
  -- Job metadata
  input_data JSONB, -- Input parameters for the job
  output_data JSONB, -- Results/output from the job
  error_data JSONB, -- Error details if failed
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,
  progress_message TEXT,
  estimated_completion TIMESTAMPTZ,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Related entities
  training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  
  -- Indexing
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_user_id ON background_jobs(user_id);
CREATE INDEX idx_background_jobs_company_id ON background_jobs(company_id);
CREATE INDEX idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at);
CREATE INDEX idx_background_jobs_priority_status ON background_jobs(priority, status);
CREATE INDEX idx_background_jobs_training_module ON background_jobs(training_module_id);
CREATE INDEX idx_background_jobs_next_retry ON background_jobs(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Job queue view for efficient querying
CREATE VIEW job_queue AS
SELECT 
  id,
  user_id,
  company_id,
  job_type,
  status,
  priority,
  input_data,
  progress_percentage,
  progress_message,
  created_at,
  started_at,
  retry_count,
  max_retries,
  next_retry_at,
  training_module_id,
  assignment_id
FROM background_jobs
WHERE status IN ('pending', 'retrying')
  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
ORDER BY priority ASC, created_at ASC;

-- Function to create a new job
CREATE OR REPLACE FUNCTION create_background_job(
  p_user_id UUID,
  p_company_id UUID,
  p_job_type job_type,
  p_input_data JSONB DEFAULT '{}',
  p_priority INTEGER DEFAULT 5,
  p_training_module_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
  p_max_retries INTEGER DEFAULT 3
) RETURNS UUID AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO background_jobs (
    user_id,
    company_id,
    job_type,
    input_data,
    priority,
    training_module_id,
    assignment_id,
    max_retries
  ) VALUES (
    p_user_id,
    p_company_id,
    p_job_type,
    p_input_data,
    p_priority,
    p_training_module_id,
    p_assignment_id,
    p_max_retries
  ) RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update job status
CREATE OR REPLACE FUNCTION update_job_status(
  p_job_id UUID,
  p_status job_status,
  p_progress_percentage INTEGER DEFAULT NULL,
  p_progress_message TEXT DEFAULT NULL,
  p_output_data JSONB DEFAULT NULL,
  p_error_data JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE background_jobs SET
    status = p_status,
    progress_percentage = COALESCE(p_progress_percentage, progress_percentage),
    progress_message = COALESCE(p_progress_message, progress_message),
    output_data = COALESCE(p_output_data, output_data),
    error_data = COALESCE(p_error_data, error_data),
    started_at = CASE WHEN p_status = 'processing' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule job retry
CREATE OR REPLACE FUNCTION schedule_job_retry(
  p_job_id UUID,
  p_retry_delay_minutes INTEGER DEFAULT 5
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE background_jobs SET
    status = 'retrying',
    retry_count = retry_count + 1,
    next_retry_at = NOW() + (p_retry_delay_minutes || ' minutes')::INTERVAL,
    progress_message = 'Scheduled for retry in ' || p_retry_delay_minutes || ' minutes'
  WHERE id = p_job_id
    AND retry_count < max_retries;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get jobs for processing
CREATE OR REPLACE FUNCTION get_pending_jobs(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_id UUID,
  job_type job_type,
  input_data JSONB,
  training_module_id UUID,
  assignment_id UUID,
  retry_count INTEGER,
  max_retries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    j.user_id,
    j.company_id,
    j.job_type,
    j.input_data,
    j.training_module_id,
    j.assignment_id,
    j.retry_count,
    j.max_retries
  FROM job_queue j
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for background_jobs
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- Users can see their own jobs
CREATE POLICY "Users can view their own jobs" ON background_jobs
  FOR SELECT USING (user_id = auth.uid());

-- Users can create jobs for their company
CREATE POLICY "Users can create jobs for their company" ON background_jobs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their own jobs
CREATE POLICY "Users can update their own jobs" ON background_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- System can access all jobs (for background processing)
CREATE POLICY "System can access all jobs" ON background_jobs
  FOR ALL USING (true); -- This will be restricted by service role key

-- Grant permissions
GRANT ALL ON background_jobs TO authenticated;
GRANT ALL ON background_jobs TO service_role;
GRANT SELECT ON job_queue TO authenticated;
GRANT SELECT ON job_queue TO service_role;
GRANT EXECUTE ON FUNCTION create_background_job TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_status TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_job_retry TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_jobs TO service_role;
