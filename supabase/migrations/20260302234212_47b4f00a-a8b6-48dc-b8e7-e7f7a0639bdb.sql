
CREATE TABLE public.phishing_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_id     text NOT NULL,           -- ID of the simulated email (e.g. "email_1")
  score        integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  found_clues  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- clue IDs found by user
  total_clues  integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX phishing_results_user_id_idx ON public.phishing_results(user_id);

ALTER TABLE public.phishing_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own phishing results"
  ON public.phishing_results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own phishing results"
  ON public.phishing_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers view org phishing results"
  ON public.phishing_results FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = phishing_results.user_id
        AND p.org_id IS NOT NULL
        AND public.is_manager_of_org(auth.uid(), p.org_id)
    )
  );

CREATE POLICY "Admins manage all phishing results"
  ON public.phishing_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
