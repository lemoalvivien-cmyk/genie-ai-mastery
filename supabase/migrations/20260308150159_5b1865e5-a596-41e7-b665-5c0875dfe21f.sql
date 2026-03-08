
-- Migration: openclaw_policies_add_quotas
-- Adds max_jobs_per_hour and max_concurrent_jobs columns to openclaw_policies.
-- Safe defaults: 20 jobs/hour and 5 concurrent jobs per org.

ALTER TABLE public.openclaw_policies
  ADD COLUMN IF NOT EXISTS max_jobs_per_hour   integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS max_concurrent_jobs integer NOT NULL DEFAULT 5;

COMMENT ON COLUMN public.openclaw_policies.max_jobs_per_hour
  IS 'Max jobs an org can create in a rolling 60-minute window. Default: 20.';

COMMENT ON COLUMN public.openclaw_policies.max_concurrent_jobs
  IS 'Max simultaneously running/queued jobs per org. Default: 5.';
