
-- Tighten RLS INSERT policy on waitlist (replace WITH CHECK (true) with email format check)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');

-- Tighten RLS INSERT policy on email_leads (replace WITH CHECK (true) with email format check)
DROP POLICY IF EXISTS "Anyone can insert email_leads" ON public.email_leads;
CREATE POLICY "Anyone can insert email_leads"
  ON public.email_leads
  FOR INSERT
  WITH CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');
