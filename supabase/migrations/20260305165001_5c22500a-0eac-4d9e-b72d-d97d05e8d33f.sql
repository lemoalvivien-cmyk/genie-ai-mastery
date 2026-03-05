
-- GENIE OS: User Memory
CREATE TABLE IF NOT EXISTS public.genieos_user_memory (
  user_id uuid PRIMARY KEY,
  skill_level text DEFAULT 'beginner',
  primary_goals text[] DEFAULT '{}',
  recent_topics text[] DEFAULT '{}',
  context_summary text DEFAULT '',
  preferences jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.genieos_user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own genieos memory" ON public.genieos_user_memory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- GENIE OS: Agents
CREATE TABLE IF NOT EXISTS public.genieos_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  objective text DEFAULT '',
  system_prompt text DEFAULT '',
  tools jsonb DEFAULT '[]',
  status text DEFAULT 'draft',
  executions integer DEFAULT 0,
  last_executed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.genieos_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own genieos agents" ON public.genieos_agents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- GENIE OS: Workflows
CREATE TABLE IF NOT EXISTS public.genieos_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  trigger_event text DEFAULT '',
  steps jsonb DEFAULT '[]',
  tools text DEFAULT '',
  status text DEFAULT 'draft',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.genieos_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own genieos workflows" ON public.genieos_workflows
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- GENIE OS: Conversations
CREATE TABLE IF NOT EXISTS public.genieos_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module text DEFAULT 'assistant',
  messages jsonb DEFAULT '[]',
  title text DEFAULT 'Conversation',
  model_used text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.genieos_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own genieos conversations" ON public.genieos_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- GENIE OS: Projects
CREATE TABLE IF NOT EXISTS public.genieos_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  type text DEFAULT 'app',
  stack jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.genieos_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own genieos projects" ON public.genieos_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
