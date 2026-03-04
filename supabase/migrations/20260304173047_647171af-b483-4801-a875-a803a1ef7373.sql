
-- ══════════════════════════════════════════════════
-- PASSE A · Storage bucket pdfs — RLS via storage.objects
-- ══════════════════════════════════════════════════

-- Users ne voient que leurs propres PDFs
CREATE POLICY "Users read own pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users insert own pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own pdfs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins manage all pdfs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
