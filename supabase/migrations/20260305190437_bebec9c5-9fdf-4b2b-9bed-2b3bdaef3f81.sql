-- Fix analytics_events INSERT policy to allow anonymous page_view events
-- The previous policy blocked anon users (visitors on landing page) with 401
DROP POLICY IF EXISTS "Authenticated users insert own events" ON public.analytics_events;

CREATE POLICY "Users can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (
  (auth.role() = 'authenticated' AND (actor_user_id IS NULL OR actor_user_id = auth.uid()))
  OR
  (auth.role() = 'anon' AND actor_user_id IS NULL)
);