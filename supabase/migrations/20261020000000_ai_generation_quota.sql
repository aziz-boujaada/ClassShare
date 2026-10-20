-- Private server-enforced daily AI quota. Clients cannot read or modify usage rows.
CREATE TABLE IF NOT EXISTS public.ai_generation_usage (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generation_usage_user_created
  ON public.ai_generation_usage(user_id, created_at DESC);

ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ai_generation_quota()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  recent_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Serialize attempts by user so concurrent requests cannot bypass the quota.
  PERFORM pg_advisory_xact_lock(hashtextextended(current_user_id::TEXT, 0));
  SELECT COUNT(*) INTO recent_count
  FROM public.ai_generation_usage
  WHERE user_id = current_user_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF recent_count >= 10 THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.ai_generation_usage(user_id) VALUES (current_user_id);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_generation_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_generation_quota() TO authenticated;
