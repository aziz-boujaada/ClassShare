import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, LoaderCircle, MessageCircle, Save, Send, UsersRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { requireSupabase } from '../lib/supabase.ts';
import { api } from '../services/api.ts';
import type { GlobalCommunity, GlobalCommunityMessage } from '../types/index.ts';

function memberAvatar(username: string, avatarUrl: string | null) {
  return avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
}

function formatMessageDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const GlobalCommunityPage: React.FC = () => {
  const { user } = useAuth();
  const [community, setCommunity] = useState<GlobalCommunity | null>(null);
  const [messages, setMessages] = useState<GlobalCommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;

  useEffect(() => {
    let active = true;
    Promise.all([api.getGlobalCommunity(), api.getGlobalCommunityMessages()])
      .then(([room, history]) => {
        if (!active) return;
        setCommunity(room);
        setName(room.name);
        setMessages(history);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger le chat.'); })
      .finally(() => { if (active) setLoading(false); });

    const client = requireSupabase();
    const channel = client.channel('global-community-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_community' }, () => {
        void api.getGlobalCommunity().then((room) => {
          if (!active) return;
          setCommunity(room);
          if (!editingRef.current) setName(room.name);
        }).catch(() => undefined);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_community_messages' }, () => {
        void api.getGlobalCommunityMessages().then((history) => { if (active) setMessages(history); }).catch(() => undefined);
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const preview = URL.createObjectURL(imageFile);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [imageFile]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      await api.sendGlobalCommunityMessage(draft);
      setDraft('');
      setMessages(await api.getGlobalCommunityMessages());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le message n’a pas pu être envoyé.');
    } finally {
      setSending(false);
    }
  };

  const saveCommunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const image_url = imageFile ? await api.uploadGlobalCommunityImage(imageFile) : community?.image_url || null;
      const updated = await api.updateGlobalCommunity({ name, image_url });
      setCommunity(updated);
      setName(updated.name);
      setImageFile(null);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Les changements n’ont pas pu être enregistrés.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(community?.name || '');
    setImageFile(null);
    setEditing(false);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400"><UsersRound className="h-4 w-4" /> Communauté ClassShare</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Chat global</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Discutez en direct avec tous les membres de la communauté.</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
        <header className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white sm:p-6 dark:border-slate-800">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white/15">
            {imagePreview || community?.image_url ? <img src={imagePreview || community?.image_url || ''} alt="Image de la communauté" className="h-full w-full object-cover" /> : <MessageCircle className="h-8 w-8" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-extrabold">{editing ? 'Modifier la communauté' : community?.name || 'Communauté ClassShare'}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-indigo-100"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> Chat en direct · visible par tous les membres</p>
          </div>
          {!editing && <button type="button" onClick={() => { setName(community?.name || ''); setEditing(true); setError(''); }} className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><Camera className="h-4 w-4" /> Modifier le nom et l’image</button>}
        </header>

        {editing && (
          <form onSubmit={(event) => void saveCommunity(event)} className="grid gap-4 border-b border-slate-100 bg-indigo-50/50 p-4 sm:grid-cols-[1fr_auto] sm:items-end dark:border-slate-800 dark:bg-indigo-950/20">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Nom de la communauté
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <ImagePlus className="h-4 w-4 text-indigo-600" /> Choisir une image
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
              </label>
              {imageFile && <p className="text-xs text-indigo-600 dark:text-indigo-400">{imageFile.name}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelEditing} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300"><X className="h-4 w-4" /> Annuler</button>
              <button type="submit" disabled={saving || !name.trim()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        )}

        <div ref={listRef} aria-live="polite" className="h-[min(58vh,620px)] min-h-80 space-y-5 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 dark:bg-slate-950/50">
          {loading ? <div className="flex h-full items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Chargement du chat…</div> : messages.length ? messages.map((message) => {
            const mine = message.sender_id === user?.id;
            return <article key={message.id} className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
              <img src={memberAvatar(message.author?.username || 'member', message.author?.avatar_url || null)} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-cover dark:border-slate-700" />
              <div className={`max-w-[min(80%,640px)] ${mine ? 'text-right' : ''}`}>
                <div className={`mb-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 ${mine ? 'justify-end' : ''}`}><span className="font-bold text-slate-700 dark:text-slate-200">{mine ? 'Vous' : message.author?.full_name || 'Membre'}</span><time>{formatMessageDate(message.created_at)}</time></div>
                <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-left text-sm leading-6 ${mine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'}`}>{message.content}</p>
              </div>
            </article>;
          }) : <div className="flex h-full flex-col items-center justify-center text-center"><MessageCircle className="h-10 w-10 text-slate-300 dark:text-slate-700" /><p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">Soyez le premier à écrire</p><p className="mt-1 text-xs text-slate-500">Lancez la conversation avec toute la communauté.</p></div>}
        </div>

        <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-3 border-t border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} rows={2} placeholder="Écrire à toute la communauté…" aria-label="Votre message pour la communauté" className="max-h-36 min-h-12 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800" />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Envoyer le message" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
        </form>
        {error && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      </section>
      <p className="mt-3 text-center text-[11px] text-slate-400">Les 200 messages les plus récents sont affichés.</p>
    </main>
  );
};
