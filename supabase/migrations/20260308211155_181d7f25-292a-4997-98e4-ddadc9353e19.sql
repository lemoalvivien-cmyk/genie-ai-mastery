-- Autopilot columns on campaigns (safe to run multiple times)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS is_auto boolean DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;