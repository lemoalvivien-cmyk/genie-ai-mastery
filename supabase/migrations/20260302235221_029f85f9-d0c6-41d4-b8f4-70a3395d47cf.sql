-- Fix user_roles: add RLS policies (self-read, admin manage)
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage user_roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));