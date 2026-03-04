
-- PASSE A · #1 — Policy explicite sur access_codes (retry)
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent gérer les codes (via service_role en Edge Function, bypass RLS)
CREATE POLICY "Admins manage access_codes"
  ON public.access_codes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
