-- ==============================================================================
-- ClassShare - PostgreSQL Database Schema & Security Policies (Supabase)
-- ==============================================================================

-- 1. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  study_program TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRESENTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  presentation_date DATE,
  original_url TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- 3. PRESENTATION BLOCKS TABLE (Structured content blocks)
CREATE TABLE IF NOT EXISTS public.presentation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('summary', 'key_points', 'explanation', 'code_snippet', 'resource', 'image')),
  title TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LIKES TABLE (Unique like per user per presentation)
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_presentation_user_like UNIQUE (presentation_id, user_id)
);

-- 5. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  presentation_id UUID REFERENCES public.presentations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'milestone', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_presentations_author ON public.presentations(author_id);
CREATE INDEX IF NOT EXISTS idx_presentations_status_published ON public.presentations(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_presentations_slug ON public.presentations(slug);
CREATE INDEX IF NOT EXISTS idx_presentations_subject ON public.presentations(subject);
CREATE INDEX IF NOT EXISTS idx_presentation_blocks_order ON public.presentation_blocks(presentation_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_likes_presentation ON public.likes(presentation_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_presentation ON public.comments(presentation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read, created_at DESC);

-- ==============================================================================
-- TRIGGERS & FUNCTIONS
-- ==============================================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_presentations_modtime ON public.presentations;
CREATE TRIGGER update_presentations_modtime
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_blocks_modtime ON public.presentation_blocks;
CREATE TRIGGER update_blocks_modtime
  BEFORE UPDATE ON public.presentation_blocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_comments_modtime ON public.comments;
CREATE TRIGGER update_comments_modtime
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Keep account roles immutable through the public client. Service-role migrations can still manage them.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Profile roles cannot be changed by users';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change ON public.profiles;
CREATE TRIGGER prevent_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();

-- Automatically create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  base_username TEXT;
  chosen_username TEXT;
  counter INT := 0;
BEGIN
  -- Derive default username from metadata or email
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  IF base_username IS NULL OR LENGTH(base_username) < 3 THEN
    base_username := 'student_' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;

  chosen_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = chosen_username) LOOP
    counter := counter + 1;
    chosen_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    chosen_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', INITCAP(base_username)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || chosen_username),
    'student'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for notifications when a like occurs
CREATE OR REPLACE FUNCTION public.handle_like_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pres_author_id UUID;
BEGIN
  SELECT author_id INTO pres_author_id FROM public.presentations WHERE id = NEW.presentation_id;
  -- Do not notify if user liked their own presentation
  IF pres_author_id IS NOT NULL AND pres_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, presentation_id, type)
    VALUES (pres_author_id, NEW.user_id, NEW.presentation_id, 'like');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_notification();

-- Trigger for notifications when a comment is added
CREATE OR REPLACE FUNCTION public.handle_comment_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  pres_author_id UUID;
BEGIN
  SELECT author_id INTO pres_author_id FROM public.presentations WHERE id = NEW.presentation_id;
  -- Do not notify if author comments on their own presentation
  IF pres_author_id IS NOT NULL AND pres_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, presentation_id, type)
    VALUES (pres_author_id, NEW.author_id, NEW.presentation_id, 'comment');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_notification();

-- ==============================================================================
-- LEADERBOARD VIEW
-- ==============================================================================
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
  MIN(pres.published_at) AS first_published_at
FROM public.profiles p
LEFT JOIN public.presentations pres
  ON pres.author_id = p.id AND pres.status = 'published'
LEFT JOIN public.likes l
  ON l.presentation_id = pres.id
LEFT JOIN public.comments c
  ON c.presentation_id = pres.id
GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.study_program
HAVING COUNT(DISTINCT pres.id) > 0
ORDER BY
  published_presentations_count DESC,
  total_likes_received DESC,
  total_comments_received DESC,
  first_published_at ASC;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Explicit API grants; RLS policies below constrain every row-level operation.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles, public.presentations, public.presentation_blocks, public.likes, public.comments TO anon, authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.presentations, public.presentation_blocks, public.comments TO authenticated;
GRANT INSERT, DELETE ON public.likes TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Presentations Policies
DROP POLICY IF EXISTS "Published presentations are viewable by everyone" ON public.presentations;
CREATE POLICY "Published presentations are viewable by everyone"
  ON public.presentations FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);

DROP POLICY IF EXISTS "Authenticated users can create presentations" ON public.presentations;
CREATE POLICY "Authenticated users can create presentations"
  ON public.presentations FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update their own presentations" ON public.presentations;
CREATE POLICY "Authors can update their own presentations"
  ON public.presentations FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete their own presentations" ON public.presentations;
CREATE POLICY "Authors can delete their own presentations"
  ON public.presentations FOR DELETE
  USING (auth.uid() = author_id);

-- 3. Presentation Blocks Policies
DROP POLICY IF EXISTS "Blocks of visible presentations are viewable" ON public.presentation_blocks;
CREATE POLICY "Blocks of visible presentations are viewable"
  ON public.presentation_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = presentation_blocks.presentation_id
      AND (pres.status = 'published' OR pres.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can insert blocks to their presentations" ON public.presentation_blocks;
CREATE POLICY "Authors can insert blocks to their presentations"
  ON public.presentation_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = presentation_blocks.presentation_id
      AND pres.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can update blocks of their presentations" ON public.presentation_blocks;
CREATE POLICY "Authors can update blocks of their presentations"
  ON public.presentation_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = presentation_blocks.presentation_id
      AND pres.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can delete blocks of their presentations" ON public.presentation_blocks;
CREATE POLICY "Authors can delete blocks of their presentations"
  ON public.presentation_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = presentation_blocks.presentation_id
      AND pres.author_id = auth.uid()
    )
  );

-- 4. Likes Policies
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert like for themselves" ON public.likes;
CREATE POLICY "Authenticated users can insert like for themselves"
  ON public.likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = likes.presentation_id AND pres.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own like" ON public.likes;
CREATE POLICY "Users can delete their own like"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Comments Policies
DROP POLICY IF EXISTS "Comments of published presentations are viewable by everyone" ON public.comments;
CREATE POLICY "Comments of published presentations are viewable by everyone"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = comments.presentation_id
      AND (pres.status = 'published' OR pres.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can post comments as themselves" ON public.comments;
CREATE POLICY "Authenticated users can post comments as themselves"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = comments.presentation_id
      AND (pres.status = 'published' OR pres.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can update their own comments" ON public.comments;
CREATE POLICY "Authors can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors or presentation owners can delete comments" ON public.comments;
CREATE POLICY "Authors or presentation owners can delete comments"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.presentations pres
      WHERE pres.id = comments.presentation_id
      AND pres.author_id = auth.uid()
    )
  );

-- 6. Notifications Policies
DROP POLICY IF EXISTS "Users can only view their own notifications" ON public.notifications;
CREATE POLICY "Users can only view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update read status of their own notifications" ON public.notifications;
CREATE POLICY "Users can update read status of their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
