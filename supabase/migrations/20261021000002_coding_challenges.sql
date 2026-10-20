-- Challenge answers and hidden test cases remain unreadable to browser clients.
CREATE TABLE IF NOT EXISTS public.coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE,
  public_content JSONB NOT NULL,
  private_content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_challenges_presentation
  ON public.coding_challenges(presentation_id);

ALTER TABLE public.coding_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coding_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, author_id, presentation_id, public_content, created_at)
  ON public.coding_challenges TO authenticated;
GRANT INSERT (author_id, public_content, private_content)
  ON public.coding_challenges TO authenticated;
GRANT UPDATE (presentation_id)
  ON public.coding_challenges TO authenticated;

DROP POLICY IF EXISTS "Students can view public coding challenges" ON public.coding_challenges;
CREATE POLICY "Students can view public coding challenges"
  ON public.coding_challenges FOR SELECT TO authenticated
  USING (
    author_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.presentations p
      WHERE p.id = coding_challenges.presentation_id
        AND p.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Students can save their generated coding challenges" ON public.coding_challenges;
CREATE POLICY "Students can save their generated coding challenges"
  ON public.coding_challenges FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students can attach their challenge to their presentation" ON public.coding_challenges;
CREATE POLICY "Students can attach their challenge to their presentation"
  ON public.coding_challenges FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      presentation_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_id
          AND p.author_id = (SELECT auth.uid())
      )
    )
  );

-- Store only student drafts because secure code execution is not configured yet.
CREATE TABLE IF NOT EXISTS public.coding_challenge_drafts (
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id),
  CONSTRAINT coding_challenge_drafts_source_size CHECK (octet_length(source_code) <= 32768)
);

ALTER TABLE public.coding_challenge_drafts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_challenge_drafts TO authenticated;

DROP POLICY IF EXISTS "Students can manage their coding challenge drafts" ON public.coding_challenge_drafts;
CREATE POLICY "Students can manage their coding challenge drafts"
  ON public.coding_challenge_drafts FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.coding_challenges c
      WHERE c.id = challenge_id
        AND (
          c.author_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.presentations p
            WHERE p.id = c.presentation_id AND p.status = 'published'
          )
        )
    )
  );
