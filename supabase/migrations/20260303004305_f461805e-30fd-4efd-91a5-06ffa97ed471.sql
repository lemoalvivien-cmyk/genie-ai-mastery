
-- Helper RPC to safely increment the logging error counter
CREATE OR REPLACE FUNCTION public.increment_logging_errors()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_metrics SET
    logging_errors = logging_errors + 1,
    last_logging_error_at = now(),
    updated_at = now()
  WHERE id = 1;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;
