
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS plan_source TEXT DEFAULT 'none' 
    CHECK (plan_source IN ('none','stripe','access_code'));
