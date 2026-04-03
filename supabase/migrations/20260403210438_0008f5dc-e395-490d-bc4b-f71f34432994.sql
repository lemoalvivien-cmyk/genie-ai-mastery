-- 1. Fix org-documents storage: restrict to user's own org
DROP POLICY IF EXISTS "Org members can read org documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete own documents" ON storage.objects;

CREATE POLICY "Org members read own org documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'org-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::uuid = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members upload own org documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'org-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::uuid = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Org members delete own org documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'org-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1]::uuid = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins manage all org documents" ON storage.objects
  FOR ALL USING (
    bucket_id = 'org-documents'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. Fix referrals email exposure: create masked view
CREATE OR REPLACE VIEW public.referrals_safe AS
  SELECT id, referrer_id, referral_code, status, created_at, completed_at,
         LEFT(referred_email, 2) || '***@' || SPLIT_PART(referred_email, '@', 2) AS referred_email_masked
  FROM public.referrals;