
-- Create org-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for org-logos
CREATE POLICY "Org logos publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-logos');

CREATE POLICY "Managers can upload org logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-logos'
  AND public.is_manager_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Managers can update org logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'org-logos'
  AND public.is_manager_of_org(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Add org_logo_url to organizations if it doesn't exist
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS default_modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completion_deadline_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS email_reminders_enabled BOOLEAN DEFAULT TRUE;
