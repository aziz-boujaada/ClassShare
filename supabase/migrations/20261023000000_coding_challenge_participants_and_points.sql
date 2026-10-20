-- Track challenge entries and one-time completions without exposing a way for
-- browser clients to mark their own work complete or award themselves points.
CREATE TABLE IF NOT EXISTS public.coding_challenge_participants (
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coding_challenge_participants_user_completed
  ON public.coding_challenge_participants(user_id, completed_at);

ALTER TABLE public.coding_challenge_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.coding_challenge_participants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.coding_challenge_participants TO anon, authenticated;

-- Public leaderboard/card reads can see participant IDs and profile fields
-- for challenges attached to published presentations only.
GRANT SELECT (id, author_id, presentation_id) ON public.coding_challenges TO anon;
DROP POLICY IF EXISTS "Public may read published coding challenge references" ON public.coding_challenges;
CREATE POLICY "Public may read published coding challenge references"
  ON public.coding_challenges FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations presentation
      WHERE presentation.id = coding_challenges.presentation_id
        AND presentation.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Users can view participants of visible challenges" ON public.coding_challenge_participants;
CREATE POLICY "Users can view participants of visible challenges"
  ON public.coding_challenge_participants FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coding_challenges challenge
      WHERE challenge.id = coding_challenge_participants.challenge_id
        AND (
          (auth.uid() IS NOT NULL AND challenge.author_id = (SELECT auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.presentations presentation
            WHERE presentation.id = challenge.presentation_id
              AND presentation.status = 'published'
          )
        )
    )
  );

CREATE OR REPLACE FUNCTION public.enroll_in_coding_challenge(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coding_challenges challenge
    WHERE challenge.id = p_challenge_id
      AND (
        challenge.author_id = current_user_id
        OR EXISTS (
          SELECT 1 FROM public.presentations presentation
          WHERE presentation.id = challenge.presentation_id
            AND presentation.status = 'published'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Challenge not found or inaccessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.coding_challenge_participants (challenge_id, user_id)
  VALUES (p_challenge_id, current_user_id)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_in_coding_challenge(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_coding_challenge(UUID) TO authenticated;

-- Called only by the authenticated execute-code Edge Function using its
-- service role client, after all public and hidden test cases pass.
CREATE OR REPLACE FUNCTION public.award_coding_challenge_points(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_or_completed INTEGER;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.coding_challenges WHERE id = p_challenge_id
  ) THEN
    RAISE EXCEPTION 'Challenge or user not found' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.coding_challenge_participants (challenge_id, user_id, completed_at)
  VALUES (p_challenge_id, p_user_id, NOW())
  ON CONFLICT (challenge_id, user_id) DO UPDATE
    SET completed_at = EXCLUDED.completed_at
    WHERE public.coding_challenge_participants.completed_at IS NULL;

  GET DIAGNOSTICS inserted_or_completed = ROW_COUNT;
  RETURN inserted_or_completed = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.award_coding_challenge_points(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_coding_challenge_points(UUID, UUID) TO service_role;

-- Include completed challenges in leaderboard scores and include learners
-- who have earned challenge points even if they have not published a course.
CREATE OR REPLACE VIEW public.leaderboard_view WITH (security_invoker = true) AS
SELECT
  p.id AS user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  p.study_program,
  COUNT(DISTINCT pres.id) AS published_presentations_count,
  COUNT(DISTINCT l.id) AS total_likes_received,
  COUNT(DISTINCT c.id) AS total_comments_received,
  MIN(pres.published_at) AS first_published_at,
  COUNT(DISTINCT participant.challenge_id) AS solved_coding_challenges_count
FROM public.profiles p
LEFT JOIN public.presentations pres
  ON pres.author_id = p.id AND pres.status = 'published'
LEFT JOIN public.likes l
  ON l.presentation_id = pres.id
LEFT JOIN public.comments c
  ON c.presentation_id = pres.id
LEFT JOIN public.coding_challenge_participants participant
  ON participant.user_id = p.id AND participant.completed_at IS NOT NULL
GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.study_program
HAVING COUNT(DISTINCT pres.id) > 0 OR COUNT(DISTINCT participant.challenge_id) > 0
ORDER BY
  published_presentations_count DESC,
  total_likes_received DESC,
  total_comments_received DESC,
  first_published_at ASC;

GRANT SELECT ON public.leaderboard_view TO anon, authenticated;
