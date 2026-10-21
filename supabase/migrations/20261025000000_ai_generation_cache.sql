-- Keep derived presentation results private to their owner and expire them.
CREATE TABLE IF NOT EXISTS public.ai_generation_cache (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL CHECK (char_length(cache_key) = 64),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, cache_key),
  CHECK (expires_at > created_at)
);

ALTER TABLE public.ai_generation_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_generation_cache FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generation_cache TO authenticated;

DROP POLICY IF EXISTS "Users manage their own cached generations" ON public.ai_generation_cache;
CREATE POLICY "Users manage their own cached generations"
  ON public.ai_generation_cache FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ai_generation_cache_expiration
  ON public.ai_generation_cache(user_id, expires_at);
