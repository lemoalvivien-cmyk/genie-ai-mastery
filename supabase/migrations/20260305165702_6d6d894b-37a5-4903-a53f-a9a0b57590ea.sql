
-- Marketplace items table
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'agent',
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  category text DEFAULT 'general',
  is_public boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  rating_avg numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public marketplace items visible to authenticated"
  ON public.marketplace_items FOR SELECT
  USING (is_public = true AND auth.role() = 'authenticated');
CREATE POLICY "Users manage own marketplace items"
  ON public.marketplace_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all marketplace items"
  ON public.marketplace_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Marketplace ratings table
CREATE TABLE IF NOT EXISTS public.marketplace_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (item_id, user_id)
);
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read ratings"
  ON public.marketplace_ratings FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Users manage own ratings"
  ON public.marketplace_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Marketplace usage table
CREATE TABLE IF NOT EXISTS public.marketplace_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  used_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.marketplace_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own marketplace usage"
  ON public.marketplace_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own marketplace usage"
  ON public.marketplace_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Agent executions table (runtime logs)
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.genieos_agents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  objective text NOT NULL DEFAULT '',
  steps jsonb DEFAULT '[]'::jsonb,
  result text DEFAULT '',
  status text DEFAULT 'pending',
  error text DEFAULT NULL,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent executions"
  ON public.agent_executions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all agent executions"
  ON public.agent_executions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update marketplace rating avg
CREATE OR REPLACE FUNCTION public.update_marketplace_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketplace_items
  SET
    rating_avg = (SELECT AVG(rating) FROM public.marketplace_ratings WHERE item_id = NEW.item_id),
    rating_count = (SELECT COUNT(*) FROM public.marketplace_ratings WHERE item_id = NEW.item_id),
    updated_at = now()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_rating_avg_trigger
  AFTER INSERT OR UPDATE ON public.marketplace_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_marketplace_rating_avg();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION public.increment_marketplace_usage(_item_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.marketplace_items
  SET usage_count = usage_count + 1, updated_at = now()
  WHERE id = _item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
