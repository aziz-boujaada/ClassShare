CREATE TABLE IF NOT EXISTS public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  CONSTRAINT community_messages_different_users CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_community_messages_sender_recipient_created
  ON public.community_messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_recipient_sender_created
  ON public.community_messages(recipient_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_unread_recipient
  ON public.community_messages(recipient_id, created_at DESC) WHERE read_at IS NULL;

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_messages REPLICA IDENTITY FULL;
REVOKE ALL ON TABLE public.community_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_messages TO authenticated;
GRANT INSERT (sender_id, recipient_id, content) ON public.community_messages TO authenticated;
GRANT UPDATE (read_at) ON public.community_messages TO authenticated;

DROP POLICY IF EXISTS "Participants can read their direct messages" ON public.community_messages;
CREATE POLICY "Participants can read their direct messages"
  ON public.community_messages FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (sender_id, recipient_id));

DROP POLICY IF EXISTS "Members can send direct messages as themselves" ON public.community_messages;
CREATE POLICY "Members can send direct messages as themselves"
  ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND recipient_id <> (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Recipients can mark their messages as read" ON public.community_messages;
CREATE POLICY "Recipients can mark their messages as read"
  ON public.community_messages FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'community_messages'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
  END IF;
END;
$$;
