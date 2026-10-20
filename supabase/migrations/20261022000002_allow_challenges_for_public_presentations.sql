-- Let authenticated students attach a generated challenge to any published
-- presentation, while keeping private drafts limited to their author.
DROP POLICY IF EXISTS "Students can save their generated coding challenges"
  ON public.coding_challenges;

CREATE POLICY "Students can save their generated coding challenges"
  ON public.coding_challenges FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      presentation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.presentations p
        WHERE p.id = presentation_id
          AND (p.status = 'published' OR p.author_id = (SELECT auth.uid()))
      )
    )
  );
