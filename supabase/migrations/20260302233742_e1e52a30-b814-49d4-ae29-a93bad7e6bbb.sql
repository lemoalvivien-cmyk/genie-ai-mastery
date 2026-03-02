
-- Drop the overly permissive INSERT policies — service role bypasses RLS automatically
DROP POLICY IF EXISTS "Service role insert source_items" ON public.source_items;
DROP POLICY IF EXISTS "Service role insert briefs" ON public.briefs;
