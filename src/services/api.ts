import { isSupabaseConfigured, requireSupabase } from '../lib/supabase.ts';
import { slugify } from '../lib/logic.ts';
import type {
  Profile,
  Presentation,
  PresentationBlock,
  Comment,
  Notification,
  LeaderboardEntry,
  CodingChallenge,
  CommunityConversation,
  CommunityMessage,
  FilterOptions,
} from '../types/index.ts';

type NewBlock = Omit<PresentationBlock, 'id' | 'presentation_id'>;

async function attachCodingChallengeParticipants(challenges: CodingChallenge[]): Promise<CodingChallenge[]> {
  if (!challenges.length) return challenges;
  const { data, error } = await requireSupabase()
    .from('coding_challenge_participants')
    .select('challenge_id,participant:profiles!coding_challenge_participants_user_id_fkey(id,username,full_name,avatar_url)')
    .in('challenge_id', challenges.map((challenge) => challenge.id));
  if (error) throw error;

  const participantsByChallenge = new Map<string, NonNullable<CodingChallenge['participants']>>();
  for (const row of data || []) {
    const participant = (row as any).participant;
    if (!participant) continue;
    const participants = participantsByChallenge.get((row as any).challenge_id) || [];
    participants.push(participant);
    participantsByChallenge.set((row as any).challenge_id, participants);
  }
  return challenges.map((challenge) => ({
    ...challenge,
    participants: participantsByChallenge.get(challenge.id) || [],
  }));
}

function createSlugSuffix(): string {
  const bytes = new Uint8Array(4);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function currentUserId(): Promise<string> {
  const client = requireSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Connexion requise');
  return user.id;
}

export const api = {
  isConfigured: isSupabaseConfigured,

  async getCurrentUser(): Promise<Profile | null> {
    const client = requireSupabase();
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    if (!user) return null;
    const { data, error: profileError } = await client.from('profiles').select('*').eq('id', user.id).single();
    if (profileError) throw profileError;
    return data as Profile;
  },

  async login(email: string, password = ''): Promise<Profile> {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await this.getCurrentUser();
    if (!profile) throw new Error('Profil utilisateur introuvable. Vérifiez la migration Supabase.');
    return profile;
  },

  async register(data: { full_name: string; email: string; password?: string; study_program?: string }): Promise<Profile> {
    const client = requireSupabase();
    if (!data.password) throw new Error('Un mot de passe est requis.');
    const { data: authData, error } = await client.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name, study_program: data.study_program } },
    });
    if (error) throw error;
    if (!authData.user) throw new Error('La création du compte a échoué.');
    if (!authData.session) {
      throw new Error('Compte créé. Confirmez votre adresse e-mail, puis connectez-vous.');
    }
    const { data: profile, error: profileError } = await client
      .from('profiles').select('*').eq('id', authData.user.id).single();
    if (profileError) throw profileError;
    return profile as Profile;
  },

  async logout(): Promise<void> {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw error;
  },

  async getProfile(username: string): Promise<Profile | null> {
    const { data, error } = await requireSupabase().from('profiles').select('*').ilike('username', username).maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const id = await currentUserId();
    const { data, error } = await requireSupabase().from('profiles').update({
      full_name: updates.full_name,
      bio: updates.bio,
      study_program: updates.study_program,
      avatar_url: updates.avatar_url,
    }).eq('id', id).select('*').single();
    if (error) throw error;
    return data as Profile;
  },

  async uploadAvatar(file: File): Promise<string> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024;
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Choisissez une image JPG, PNG ou WebP.');
    }
    if (file.size > maxSizeBytes) {
      throw new Error('L’image doit faire 5 Mo maximum.');
    }

    const userId = await currentUserId();
    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const path = `${userId}/${crypto.randomUUID()}.${extensionByType[file.type]}`;
    const client = requireSupabase();
    const { error } = await client.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;

    return client.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  },

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await requireSupabase().from('profiles').select('*').order('full_name');
    if (error) throw error;
    return (data || []) as Profile[];
  },

  async getPresentations(options: FilterOptions = {}): Promise<Presentation[]> {
    const client = requireSupabase();
    const { data: { user } } = await client.auth.getUser();
    let query = client.from('presentations').select(`
      *, author:profiles!author_id(*), likes_count:likes(count), comments_count:comments(count), user_likes:likes(user_id)
    `);
    if (options.author_id) query = query.eq('author_id', options.author_id);
    query = query.eq('status', options.status || 'published');
    if (options.subject && options.subject !== 'all') query = query.eq('subject', options.subject);
    if (options.tag) query = query.contains('tags', [options.tag]);
    if (options.search?.trim()) query = query.or(`title.ilike.%${options.search.trim()}%,description.ilike.%${options.search.trim()}%`);
    const sort = options.sort || 'newest';
    if (sort === 'oldest') query = query.order('published_at', { ascending: true, nullsFirst: true });
    else if (sort === 'most_liked') query = query.order('created_at', { ascending: false });
    else if (sort === 'most_commented') query = query.order('created_at', { ascending: false });
    else query = query.order('published_at', { ascending: false, nullsFirst: false });
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []).map((row: any) => ({
      ...row,
      likes_count: row.likes_count?.[0]?.count || 0,
      comments_count: row.comments_count?.[0]?.count || 0,
      is_liked: Boolean(user && row.user_likes?.some((like: { user_id: string }) => like.user_id === user.id)),
    })) as Presentation[];
    if (sort === 'most_liked') rows.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    if (sort === 'most_commented') rows.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
    return rows;
  },

  async getPresentationsForChallenge(): Promise<Array<Pick<Presentation, 'id' | 'title' | 'subject' | 'status' | 'updated_at'> & { author: Pick<Profile, 'full_name' | 'username'> | null; blocks: Array<Pick<PresentationBlock, 'title' | 'position'>> }>> {
    const { data, error } = await requireSupabase()
      .from('presentations')
      .select('id,title,subject,status,updated_at,author:profiles!author_id(full_name,username),blocks:presentation_blocks(title,position)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      blocks: (row.blocks || []).sort((a: any, b: any) => a.position - b.position),
    }));
  },

  async getPresentationBySlug(slug: string): Promise<Presentation | null> {
    const client = requireSupabase();
    const { data: { user } } = await client.auth.getUser();
    const { data, error } = await client.from('presentations').select(`
      *, author:profiles!author_id(*), blocks:presentation_blocks(*), likes_count:likes(count), comments_count:comments(count), user_likes:likes(user_id)
    `).eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as any;
    row.blocks?.sort((a: PresentationBlock, b: PresentationBlock) => a.position - b.position);
    return {
      ...row,
      likes_count: row.likes_count?.[0]?.count || 0,
      comments_count: row.comments_count?.[0]?.count || 0,
      is_liked: Boolean(user && row.user_likes?.some((like: { user_id: string }) => like.user_id === user.id)),
    } as Presentation;
  },

  async getPresentationById(id: string): Promise<Presentation | null> {
    const { data, error } = await requireSupabase().from('presentations').select(`
      *, author:profiles!author_id(*), blocks:presentation_blocks(*)
    `).eq('id', id).maybeSingle();
    if (error) throw error;
    const row = data as any;
    row?.blocks?.sort((a: PresentationBlock, b: PresentationBlock) => a.position - b.position);
    return row as Presentation | null;
  },

  async getCodingChallenge(id: string): Promise<CodingChallenge | null> {
    const { data, error } = await requireSupabase()
      .from('coding_challenges')
      .select('id,author_id,presentation_id,public_content,created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const presentation = data.presentation_id
      ? await requireSupabase().from('presentations').select('slug').eq('id', data.presentation_id).maybeSingle()
      : { data: null, error: null };
    if (presentation.error) throw presentation.error;
    return { ...data.public_content, id: data.id, author_id: data.author_id, presentation_id: data.presentation_id, presentation_slug: presentation.data?.slug ?? null, created_at: data.created_at } as CodingChallenge;
  },

  async getCodingChallengesForPresentation(presentationId: string): Promise<CodingChallenge[]> {
    const { data, error } = await requireSupabase()
      .from('coding_challenges')
      .select('id,author_id,presentation_id,public_content,created_at')
      .eq('presentation_id', presentationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const challenges = (data || []).map((row: any) => ({
      ...row.public_content,
      id: row.id,
      author_id: row.author_id,
      presentation_id: row.presentation_id,
      created_at: row.created_at,
    })) as CodingChallenge[];
    return attachCodingChallengeParticipants(challenges);
  },

  async getCodingChallenges(): Promise<CodingChallenge[]> {
    const { data, error } = await requireSupabase()
      .from('coding_challenges')
      .select('id,author_id,presentation_id,public_content,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const challenges = (data || []).map((row: any) => ({
      ...row.public_content,
      id: row.id,
      author_id: row.author_id,
      presentation_id: row.presentation_id,
      created_at: row.created_at,
    })) as CodingChallenge[];
    return attachCodingChallengeParticipants(challenges);
  },

  async enrollInCodingChallenge(challengeId: string): Promise<void> {
    const { error } = await requireSupabase().rpc('enroll_in_coding_challenge', {
      p_challenge_id: challengeId,
    });
    if (error) throw error;
  },

  async getCommunityConversations(): Promise<CommunityConversation[]> {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase()
      .from('community_messages')
      .select('id,sender_id,recipient_id,content,created_at,read_at,sender:profiles!community_messages_sender_id_fkey(id,username,full_name,avatar_url),recipient:profiles!community_messages_recipient_id_fkey(id,username,full_name,avatar_url)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;

    const conversations = new Map<string, CommunityConversation>();
    for (const row of (data || []) as any[]) {
      const isSent = row.sender_id === userId;
      const peer = (isSent ? row.recipient : row.sender) as CommunityConversation['profile'] | null;
      if (!peer || conversations.has(peer.id)) {
        if (!isSent && peer && conversations.has(peer.id) && !row.read_at) conversations.get(peer.id)!.unread_count++;
        continue;
      }
      conversations.set(peer.id, {
        profile: peer,
        last_message: row.content,
        last_message_at: row.created_at,
        unread_count: !isSent && !row.read_at ? 1 : 0,
      });
    }
    return Array.from(conversations.values());
  },

  async getCommunityMessages(otherUserId: string): Promise<CommunityMessage[]> {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase()
      .from('community_messages')
      .select('id,sender_id,recipient_id,content,created_at,read_at')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data || []) as CommunityMessage[];
  },

  async sendCommunityMessage(recipientId: string, content: string): Promise<CommunityMessage> {
    const userId = await currentUserId();
    const message = content.trim();
    if (!message || message.length > 5_000) throw new Error('Le message doit contenir entre 1 et 5 000 caractères.');
    if (recipientId === userId) throw new Error('Vous ne pouvez pas vous envoyer un message.');
    const { data, error } = await requireSupabase()
      .from('community_messages')
      .insert({ sender_id: userId, recipient_id: recipientId, content: message })
      .select('id,sender_id,recipient_id,content,created_at,read_at')
      .single();
    if (error) throw error;
    return data as CommunityMessage;
  },

  async markCommunityMessagesRead(senderId: string): Promise<void> {
    const userId = await currentUserId();
    const { error } = await requireSupabase()
      .from('community_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', senderId)
      .eq('recipient_id', userId)
      .is('read_at', null);
    if (error) throw error;
  },

  async getCommunityUnreadMessageCount(): Promise<number> {
    const userId = await currentUserId();
    const { count, error } = await requireSupabase()
      .from('community_messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null);
    if (error) throw error;
    return count || 0;
  },

  async getCodingDraft(challengeId: string): Promise<string | null> {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase()
      .from('coding_challenge_drafts')
      .select('source_code')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.source_code ?? null;
  },

  async saveCodingDraft(challengeId: string, sourceCode: string): Promise<void> {
    const userId = await currentUserId();
    const { error } = await requireSupabase().from('coding_challenge_drafts').upsert({
      challenge_id: challengeId,
      user_id: userId,
      source_code: sourceCode.slice(0, 32_768),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id' });
    if (error) throw error;
  },

  async createPresentation(
    data: Omit<Presentation, 'id' | 'created_at' | 'updated_at' | 'published_at' | 'slug'>,
    blocks: NewBlock[],
    challengeId?: string,
  ): Promise<Presentation> {
    const client = requireSupabase();
    const authorId = await currentUserId();
    const baseSlug = slugify(data.title) || 'presentation';
    const slug = `${baseSlug}-${createSlugSuffix()}`;
    const { data: presentation, error } = await client.from('presentations').insert({
      author_id: authorId,
      title: data.title,
      slug,
      description: data.description,
      subject: data.subject,
      tags: data.tags,
      presentation_date: data.presentation_date,
      original_url: data.original_url,
      cover_image_url: data.cover_image_url,
      status: data.status,
      published_at: data.status === 'published' ? new Date().toISOString() : null,
    }).select('*').single();
    if (error) throw error;
    if (blocks.length) {
      const { error: blocksError } = await client.from('presentation_blocks').insert(
        blocks.map((block, position) => ({ ...block, presentation_id: presentation.id, position })),
      );
      if (blocksError) throw blocksError;
    }
    if (challengeId) {
      const { error: challengeError } = await client.from('coding_challenges')
        .update({ presentation_id: presentation.id })
        .eq('id', challengeId);
      if (challengeError) throw challengeError;
    }
    return (await this.getPresentationById(presentation.id)) as Presentation;
  },

  async updatePresentation(id: string, updates: Partial<Presentation>, blocks?: NewBlock[]): Promise<Presentation> {
    const client = requireSupabase();
    const { data: current, error: currentError } = await client.from('presentations').select('status,published_at').eq('id', id).single();
    if (currentError) throw currentError;
    const updateData: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'subject', 'tags', 'presentation_date', 'original_url', 'cover_image_url', 'status'] as const) {
      if (updates[key] !== undefined) updateData[key] = updates[key];
    }
    if (updates.title) updateData.slug = `${slugify(updates.title) || 'presentation'}-${createSlugSuffix()}`;
    if (updates.status === 'published' && current.status !== 'published') updateData.published_at = new Date().toISOString();
    const { error } = await client.from('presentations').update(updateData).eq('id', id);
    if (error) throw error;
    if (blocks) {
      const { error: deleteError } = await client.from('presentation_blocks').delete().eq('presentation_id', id);
      if (deleteError) throw deleteError;
      if (blocks.length) {
        const { error: insertError } = await client.from('presentation_blocks').insert(
          blocks.map((block, position) => ({ ...block, presentation_id: id, position })),
        );
        if (insertError) throw insertError;
      }
    }
    return (await this.getPresentationById(id)) as Presentation;
  },

  async deletePresentation(id: string): Promise<boolean> {
    const { data, error } = await requireSupabase().from('presentations').delete().eq('id', id).select('id').single();
    if (error) throw error;
    return Boolean(data);
  },

  async toggleLike(presentationId: string): Promise<{ liked: boolean; count: number }> {
    const client = requireSupabase();
    const userId = await currentUserId();
    const { data: existing, error: lookupError } = await client.from('likes').select('id')
      .eq('presentation_id', presentationId).eq('user_id', userId).maybeSingle();
    if (lookupError) throw lookupError;
    let liked: boolean;
    if (existing) {
      const { error } = await client.from('likes').delete().eq('id', existing.id);
      if (error) throw error;
      liked = false;
    } else {
      const { error } = await client.from('likes').insert({ presentation_id: presentationId, user_id: userId });
      if (error) throw error;
      liked = true;
    }
    const { count, error } = await client.from('likes').select('id', { count: 'exact', head: true }).eq('presentation_id', presentationId);
    if (error) throw error;
    return { liked, count: count || 0 };
  },

  async getComments(presentationId: string): Promise<Comment[]> {
    const { data, error } = await requireSupabase().from('comments').select('*, author:profiles!author_id(*)')
      .eq('presentation_id', presentationId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as Comment[];
  },

  async addComment(presentationId: string, content: string): Promise<Comment> {
    const authorId = await currentUserId();
    const { data, error } = await requireSupabase().from('comments').insert({
      presentation_id: presentationId, author_id: authorId, content: content.trim(),
    }).select('*, author:profiles!author_id(*)').single();
    if (error) throw error;
    return data as Comment;
  },

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const { data, error } = await requireSupabase().from('comments').update({ content: content.trim() })
      .eq('id', commentId).select('*, author:profiles!author_id(*)').single();
    if (error) throw error;
    return data as Comment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const { data, error } = await requireSupabase().from('comments').delete().eq('id', commentId).select('id').single();
    if (error) throw error;
    return Boolean(data);
  },

  async getLeaderboard(_timeframe: 'all' | 'month' | 'week' = 'all'): Promise<LeaderboardEntry[]> {
    const { data, error } = await requireSupabase().from('leaderboard_view').select('*');
    if (error) throw error;
    const entries = (data || []).map((entry: any) => ({
      ...entry,
      score:
        Number(entry.published_presentations_count || 0) * 50 +
        Number(entry.total_likes_received || 0) * 10 +
        Number(entry.total_comments_received || 0) * 5 +
        Number(entry.solved_coding_challenges_count || 0) * 75,
    })) as LeaderboardEntry[];
    entries.sort((a, b) => b.score - a.score);
    return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
  },

  async getNotifications(): Promise<Notification[]> {
    const userId = await currentUserId();
    const { data, error } = await requireSupabase().from('notifications').select(`
      *, actor:profiles!actor_id(*), presentation:presentations(id,title,slug)
    `).eq('recipient_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Notification[];
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await requireSupabase().from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  async markAllNotificationsAsRead(): Promise<void> {
    const userId = await currentUserId();
    const { error } = await requireSupabase().from('notifications').update({ is_read: true })
      .eq('recipient_id', userId).eq('is_read', false);
    if (error) throw error;
  },

  async getUnreadCount(): Promise<number> {
    const userId = await currentUserId();
    const { count, error } = await requireSupabase().from('notifications').select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId).eq('is_read', false);
    if (error) throw error;
    return count || 0;
  },
};
