
-- Table d'audit pour le pipeline content-forge
CREATE TABLE IF NOT EXISTS public.forge_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          timestamp with time zone NOT NULL DEFAULT now(),
  module_id       uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  module_slug     text,
  threat_source   text,
  threat_title    text,
  model_writer    text,
  model_validator text,
  validation_passed boolean NOT NULL DEFAULT false,
  validation_reason text,
  old_version     integer,
  new_version     integer,
  error           text,
  duration_ms     integer
);

ALTER TABLE public.forge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage forge_log"
  ON public.forge_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for dashboard queries
CREATE INDEX IF NOT EXISTS forge_log_run_at_idx ON public.forge_log (run_at DESC);
CREATE INDEX IF NOT EXISTS forge_log_module_id_idx ON public.forge_log (module_id);
