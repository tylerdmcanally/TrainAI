-- Create storage bucket for training videos (safe version)
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload training videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view training videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own training videos" ON storage.objects;

-- Recreate storage policies
CREATE POLICY "Authenticated users can upload training videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-videos');

CREATE POLICY "Authenticated users can view training videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-videos');

CREATE POLICY "Users can delete their own training videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-videos' AND owner = auth.uid());
