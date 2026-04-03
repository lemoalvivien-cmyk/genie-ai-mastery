-- Check which tables are in the publication and drop them safely
DO $$
DECLARE
  _table text;
BEGIN
  FOR _table IN
    SELECT schemaname || '.' || tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename IN ('chat_messages', 'genie_brain', 'org_invoices', 'campaigns', 'ai_jobs', 'brain_events')
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %s', _table);
  END LOOP;
END $$;

-- Ensure progress is in the publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;
  END IF;
END $$;