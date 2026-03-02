
-- artifacts table for Artifact Forge (Jarvis)
CREATE TABLE public.artifacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id      uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  session_id  uuid,
  file_path   text,
  signed_url  text,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own artifacts
CREATE POLICY "Users view own artifacts"
  ON public.artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own artifacts"
  ON public.artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own artifacts"
  ON public.artifacts FOR DELETE
  USING (auth.uid() = user_id);

-- Managers/admins can view org artifacts
CREATE POLICY "Managers view org artifacts"
  ON public.artifacts FOR SELECT
  USING (org_id IS NOT NULL AND is_manager_of_org(auth.uid(), org_id));

-- Admins full access
CREATE POLICY "Admins manage all artifacts"
  ON public.artifacts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
