
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_completed_welcome BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS panic_uses INT DEFAULT 0;
