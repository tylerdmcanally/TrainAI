-- Create storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for training videos
-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload training videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-videos');

-- Allow authenticated users to read training videos
CREATE POLICY "Authenticated users can view training videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-videos');

-- Allow users to delete their own training videos
CREATE POLICY "Users can delete their own training videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-videos' AND owner = auth.uid());
