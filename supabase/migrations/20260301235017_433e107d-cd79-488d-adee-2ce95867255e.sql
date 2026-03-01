-- Create PDF storage bucket (private, signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdfs', 'pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Policy: owners can read their own PDFs
CREATE POLICY "Users read own PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: authenticated users can upload PDFs to their folder
CREATE POLICY "Users upload own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
