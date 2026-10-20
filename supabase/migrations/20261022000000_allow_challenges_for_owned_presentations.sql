-- Let the authenticated Edge Function attach a newly generated challenge
-- directly to one of the current user's presentations.
GRANT INSERT (author_id, presentation_id, public_content, private_content)
  ON public.coding_challenges TO authenticated;

DROP POLICY IF EXISTS "Students can save their generated coding challenges" ON public.coding_challenges;
CREATE POLICY "Students can save their generated coding challenges"
  ON public.coding_challenges FOR INSERT TO authenticated
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
