
-- GENIE OS: Skill Graph, Memory Timeline, Agent Economy tables

-- 1. SKILL GRAPH
CREATE TABLE IF NOT EXISTS public.skill_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'ai', 'automation', 'coding', 'business', 'marketing', 'cybersecurity'
  description TEXT,
  parent_id UUID REFERENCES public.skill_graph(id),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.skill_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skill_graph_public_read" ON public.skill_graph FOR SELECT USING (true);
CREATE POLICY "skill_graph_admin_write" ON public.skill_graph FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. USER SKILL LEVELS
CREATE TABLE IF NOT EXISTS public.user_skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skill_graph(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 0 CHECK (level BETWEEN 0 AND 100),
  xp INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

ALTER TABLE public.user_skill_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usl_owner_select" ON public.user_skill_levels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usl_owner_insert" ON public.user_skill_levels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "usl_owner_update" ON public.user_skill_levels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "usl_owner_delete" ON public.user_skill_levels FOR DELETE USING (auth.uid() = user_id);

-- 3. MEMORY TIMELINE
CREATE TABLE IF NOT EXISTS public.memory_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL, -- 'chat', 'build', 'agent_run', 'skill_up', 'opportunity', 'insight'
  title TEXT NOT NULL,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  importance TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.memory_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mt_owner_select" ON public.memory_timeline FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mt_owner_insert" ON public.memory_timeline FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mt_owner_update" ON public.memory_timeline FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mt_owner_delete" ON public.memory_timeline FOR DELETE USING (auth.uid() = user_id);

-- 4. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  module TEXT, -- 'chat', 'builder', 'agents', 'knowledge', 'voice'
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_owner_select" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "al_owner_insert" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. AGENT ECONOMY
CREATE TABLE IF NOT EXISTS public.agent_economy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.genieos_agents(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  price_eur NUMERIC(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  downloads INTEGER DEFAULT 0,
  revenue_total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_economy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ae_public_read" ON public.agent_economy FOR SELECT USING (is_published = true OR auth.uid() = owner_id);
CREATE POLICY "ae_owner_insert" ON public.agent_economy FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ae_owner_update" ON public.agent_economy FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "ae_owner_delete" ON public.agent_economy FOR DELETE USING (auth.uid() = owner_id);

-- 6. AGENT SALES
CREATE TABLE IF NOT EXISTS public.agent_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_economy_id UUID REFERENCES public.agent_economy(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  amount_eur NUMERIC(10,2) DEFAULT 0,
  transaction_type TEXT DEFAULT 'install', -- 'install', 'purchase', 'clone'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as_parties_select" ON public.agent_sales FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "as_buyer_insert" ON public.agent_sales FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_skill_levels_user ON public.user_skill_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_timeline_user ON public.memory_timeline(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_economy_owner ON public.agent_economy(owner_id);

-- Seed skill_graph with default skills
INSERT INTO public.skill_graph (slug, name, category, description, icon, color) VALUES
  ('ai-fundamentals', 'IA Fondamentaux', 'ai', 'Comprendre les bases de l''IA', 'Brain', 'text-purple-400'),
  ('ai-prompting', 'Prompt Engineering', 'ai', 'Maîtriser les prompts avancés', 'MessageSquare', 'text-violet-400'),
  ('ai-agents', 'AI Agents', 'ai', 'Créer et orchestrer des agents IA', 'Bot', 'text-blue-400'),
  ('ai-models', 'Modèles IA', 'ai', 'Comprendre LLMs, diffusion, etc.', 'Cpu', 'text-indigo-400'),
  ('automation-basic', 'Automation Basique', 'automation', 'Workflows et automatisations simples', 'Zap', 'text-yellow-400'),
  ('automation-advanced', 'Automation Avancée', 'automation', 'Pipelines complexes multi-étapes', 'Network', 'text-amber-400'),
  ('coding-python', 'Python', 'coding', 'Programmation Python pour l''IA', 'Code2', 'text-green-400'),
  ('coding-api', 'API & Intégrations', 'coding', 'Connecter des services via API', 'Plug', 'text-emerald-400'),
  ('business-strategy', 'Stratégie Business', 'business', 'Analyser marchés et opportunités', 'BarChart2', 'text-pink-400'),
  ('business-saas', 'SaaS & Produit', 'business', 'Créer et lancer des SaaS', 'Layers', 'text-rose-400'),
  ('marketing-content', 'Marketing Contenu', 'marketing', 'Créer du contenu IA-assisted', 'PenTool', 'text-orange-400'),
  ('marketing-growth', 'Growth Hacking', 'marketing', 'Stratégies de croissance rapide', 'TrendingUp', 'text-red-400'),
  ('cyber-basics', 'Cybersécurité Bases', 'cybersecurity', 'Fondamentaux sécurité informatique', 'Shield', 'text-cyan-400'),
  ('cyber-phishing', 'Anti-Phishing', 'cybersecurity', 'Détecter et éviter le phishing', 'AlertTriangle', 'text-teal-400')
ON CONFLICT (slug) DO NOTHING;
