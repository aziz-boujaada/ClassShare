-- Apply a per-user execution limit without exposing quota rows to clients.
CREATE TABLE IF NOT EXISTS public.code_execution_usage (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  execution_count INTEGER NOT NULL DEFAULT 0 CHECK (execution_count >= 0)
);

ALTER TABLE public.code_execution_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.code_execution_usage FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_code_execution_quota()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_window TIMESTAMPTZ := date_trunc('hour', now());
  next_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.code_execution_usage (user_id, window_start, execution_count)
  VALUES (current_user_id, current_window, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET window_start = EXCLUDED.window_start,
      execution_count = CASE
        WHEN public.code_execution_usage.window_start = EXCLUDED.window_start
          THEN public.code_execution_usage.execution_count + 1
        ELSE 1
      END
  RETURNING execution_count INTO next_count;

  RETURN next_count <= 30;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_code_execution_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_code_execution_quota() TO authenticated;
