import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, MessageSquare, ArrowLeft, Search, Send, X, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { requireSupabase } from '../../lib/supabase.ts';
import type { CommunityConversation, CommunityMessage, Profile } from '../../types/index.ts';

function avatarUrl(profile: Pick<Profile, 'avatar_url' | 'username'>) {
  return profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username)}`;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export const CommunityChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [conversations, setConversations] = useState<CommunityConversation[]>([]);
  const [activeProfile, setActiveProfile] = useState<CommunityConversation['profile'] | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);
  const activeProfileRef = useRef<CommunityConversation['profile'] | null>(null);
  activeProfileRef.current = activeProfile;

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setMessages([]);
      setUnreadCount(0);
      setProfiles([]);
      setProfilesLoaded(false);
      setActiveProfile(null);
      setOpen(false);
      return;
    }

    let active = true;
    const refresh = async () => {
      try {
        const [items, unread] = await Promise.all([
          api.getCommunityConversations(),
          api.getCommunityUnreadMessageCount(),
        ]);
        if (active) {
          setConversations(items);
          setUnreadCount(unread);
        }
      } catch {
        // The widget is optional; show errors when it is open rather than
        // breaking navigation on pages that do not use chat.
      }
    };
    void refresh();

    const client = requireSupabase();
    const channel = client.channel(`community-messages-${user.id}`);
    const handleMessage = (payload: { new: Record<string, unknown> }) => {
      const message = payload.new as unknown as CommunityMessage;
      void refresh();
      const selected = activeProfileRef.current;
      if (selected && (message.sender_id === selected.id || message.recipient_id === selected.id)) {
        void api.getCommunityMessages(selected.id).then(setMessages).catch(() => undefined);
        if (message.recipient_id === user.id && message.sender_id === selected.id) {
          void api.markCommunityMessagesRead(selected.id).then(() => api.getCommunityUnreadMessageCount()).then(setUnreadCount).catch(() => undefined);
        }
      }
    };
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `recipient_id=eq.${user.id}` }, handleMessage)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `sender_id=eq.${user.id}` }, handleMessage)
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!open || !user || profilesLoaded) return;
    let active = true;
    void api.getAllProfiles()
      .then((items) => { if (active) setProfiles(items.filter((profile) => profile.id !== user.id)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les membres.'); })
      .finally(() => { if (active) setProfilesLoaded(true); });
    return () => { active = false; };
  }, [open, user?.id, profilesLoaded]);

  useEffect(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, activeProfile]);

  const matchingProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return [];
    return profiles.filter((profile) =>
      [profile.full_name, profile.username, profile.study_program || '']
        .some((value) => value.toLocaleLowerCase().includes(query)),
    ).slice(0, 8);
  }, [profiles, search]);

  const openConversation = async (profile: CommunityConversation['profile']) => {
    setActiveProfile(profile);
    setSearch('');
    setDraft('');
    setError('');
    setLoading(true);
    try {
      const history = await api.getCommunityMessages(profile.id);
      setMessages(history);
      await api.markCommunityMessagesRead(profile.id);
      const [items, unread] = await Promise.all([
        api.getCommunityConversations(),
        api.getCommunityUnreadMessageCount(),
      ]);
      setConversations(items);
      setUnreadCount(unread);
    } catch (cause) {
      setMessages([]);
      setError(cause instanceof Error ? cause.message : 'Impossible de charger cette conversation.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProfile || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const sent = await api.sendCommunityMessage(activeProfile.id, draft);
      setMessages((current) => [...current, sent]);
      setDraft('');
      setConversations(await api.getCommunityConversations());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le message n’a pas pu être envoyé.');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <section aria-label="Messagerie de la communauté" className="mb-3 flex h-[min(620px,calc(100dvh-6rem))] w-[min(390px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center gap-3 bg-indigo-600 px-4 py-3 text-white">
            {activeProfile ? (
              <button type="button" onClick={() => { setActiveProfile(null); setMessages([]); setError(''); }} aria-label="Retour aux conversations" className="rounded-lg p-1.5 hover:bg-white/15"><ArrowLeft className="h-4 w-4" /></button>
            ) : <span className="rounded-lg bg-white/15 p-2"><MessageSquare className="h-4 w-4" /></span>}
            {activeProfile ? (
              <img src={avatarUrl(activeProfile)} alt="" className="h-9 w-9 rounded-full border border-white/30 object-cover" />
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold">{activeProfile?.full_name || 'Messages communautaires'}</h2>
              <p className="truncate text-[11px] text-indigo-100">{activeProfile ? `@${activeProfile.username}` : 'Échangez en privé avec les membres'}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer la messagerie" className="rounded-lg p-1.5 hover:bg-white/15"><X className="h-4 w-4" /></button>
          </header>

          {!activeProfile ? (
            <>
              <div className="border-b border-slate-100 p-3 dark:border-slate-800">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chercher un membre…" aria-label="Chercher un membre à contacter" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800" />
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {search.trim() ? matchingProfiles.length ? matchingProfiles.map((profile) => (
                  <button key={profile.id} type="button" onClick={() => void openConversation(profile)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <img src={avatarUrl(profile)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profile.full_name}</span><span className="block truncate text-xs text-slate-500">@{profile.username} · {profile.study_program || 'Membre'}</span></span>
                  </button>
                )) : <p className="px-3 py-6 text-center text-xs text-slate-500">Aucun membre trouvé.</p> : conversations.length ? conversations.map((conversation) => (
                  <button key={conversation.profile.id} type="button" onClick={() => void openConversation(conversation.profile)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <img src={avatarUrl(conversation.profile)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{conversation.profile.full_name}</span><span className="text-[10px] text-slate-400">{formatMessageTime(conversation.last_message_at)}</span></span><span className="mt-0.5 flex items-center justify-between gap-2"><span className="truncate text-xs text-slate-500">{conversation.last_message}</span>{conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</span></span>
                  </button>
                )) : <div className="px-4 py-12 text-center"><MessageCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Aucune conversation</p><p className="mt-1 text-xs leading-5 text-slate-500">Recherchez un membre ci-dessus pour commencer à discuter.</p></div>}
                {open && !profilesLoaded && <p className="flex justify-center py-3 text-xs text-slate-400"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Chargement des membres…</p>}
              </div>
            </>
          ) : (
            <>
              <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 dark:bg-slate-950">
                {loading ? <div className="flex h-full items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Chargement…</div> : messages.length ? messages.map((message) => {
                  const mine = message.sender_id === user.id;
                  return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.content}</p><p className={`mt-1 text-right text-[10px] ${mine ? 'text-indigo-100' : 'text-slate-400'}`}>{formatMessageTime(message.created_at)}</p></div></div>;
                }) : <p className="py-10 text-center text-xs text-slate-500">Envoyez le premier message.</p>}
              </div>
              <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Écrire un message…" aria-label="Votre message" className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800" />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Envoyer le message" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </form>
            </>
          )}
          {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">{error}</p>}
        </section>
      )}

      <button type="button" onClick={() => setOpen((current) => !current)} aria-label={open ? 'Fermer la messagerie' : 'Ouvrir la messagerie'} className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-900/25 transition hover:scale-105 hover:bg-indigo-700">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
    </div>
  );
};
