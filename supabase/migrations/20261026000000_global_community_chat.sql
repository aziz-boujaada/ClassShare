CREATE TABLE IF NOT EXISTS public.global_community (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  name TEXT NOT NULL DEFAULT 'Communauté ClassShare' CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.global_community (id, name)
VALUES (TRUE, 'Communauté ClassShare')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.global_community ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.global_community FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.global_community TO authenticated;
GRANT UPDATE (name, image_url, updated_at) ON TABLE public.global_community TO authenticated;

DROP POLICY IF EXISTS "Signed-in members can view the global community" ON public.global_community;
CREATE POLICY "Signed-in members can view the global community"
  ON public.global_community FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Every signed-in member can update the global community" ON public.global_community;
CREATE POLICY "Every signed-in member can update the global community"
  ON public.global_community FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.global_community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_community_messages_created
  ON public.global_community_messages(created_at DESC);

ALTER TABLE public.global_community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_community_messages REPLICA IDENTITY FULL;
REVOKE ALL ON TABLE public.global_community_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.global_community_messages TO authenticated;
GRANT INSERT (sender_id, content) ON TABLE public.global_community_messages TO authenticated;

DROP POLICY IF EXISTS "Signed-in members can read global community messages" ON public.global_community_messages;
CREATE POLICY "Signed-in members can read global community messages"
  ON public.global_community_messages FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Members can send global messages as themselves" ON public.global_community_messages;
CREATE POLICY "Members can send global messages as themselves"
  ON public.global_community_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('community-images', 'community-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Global community images are publicly viewable" ON storage.objects;
CREATE POLICY "Global community images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

DROP POLICY IF EXISTS "Members can upload global community images" ON storage.objects;
CREATE POLICY "Members can upload global community images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'global_community_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_community_messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'global_community'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.global_community;
  END IF;
END;
$$;
