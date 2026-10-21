-- Limit concurrent AI jobs per authenticated user; stale slots expire after crashes.
CREATE TABLE IF NOT EXISTS public.ai_generation_jobs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
  PRIMARY KEY (user_id, job_id)
);

ALTER TABLE public.ai_generation_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_jobs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.acquire_ai_generation_slot(p_limit INTEGER DEFAULT 1)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  active_count INTEGER;
  new_job_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_limit < 1 OR p_limit > 3 THEN
    RAISE EXCEPTION 'Invalid concurrency limit';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('ai-generation:' || current_user_id::TEXT, 0));
  DELETE FROM public.ai_generation_jobs
  WHERE user_id = current_user_id AND expires_at <= NOW();
  SELECT COUNT(*) INTO active_count
  FROM public.ai_generation_jobs
  WHERE user_id = current_user_id AND expires_at > NOW();
  IF active_count >= p_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.ai_generation_jobs(user_id) VALUES (current_user_id)
  RETURNING job_id INTO new_job_id;
  RETURN new_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_generation_slot(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.ai_generation_jobs
  WHERE user_id = auth.uid() AND job_id = p_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_ai_generation_slot(INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_ai_generation_slot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acquire_ai_generation_slot(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ai_generation_slot(UUID) TO authenticated;
