
-- Fix: app_metrics SELECT should be admin-only (no public read needed)
DROP POLICY IF EXISTS "Service role read app_metrics" ON public.app_metrics;
