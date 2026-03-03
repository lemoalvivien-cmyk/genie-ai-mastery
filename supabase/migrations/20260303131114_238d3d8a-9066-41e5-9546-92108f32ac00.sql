CREATE TABLE public.email_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'landing_page',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert email_leads"
  ON public.email_leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view email_leads"
  ON public.email_leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
