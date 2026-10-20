import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ExternalLink,
  Share2,
  Bookmark,
  MessageSquare,
  ArrowLeft,
  Edit,
  Trash2,
  Check,
  Send,
  User,
  ShieldAlert,
  Code2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Presentation, Comment, CodingChallenge } from '../types/index.ts';
import { estimateReadingTime } from '../lib/logic.ts';
import { ContentBlockRenderer } from '../components/ui/ContentBlockRenderer.tsx';
import { LikeButton } from '../components/ui/LikeButton.tsx';
import { ChallengeParticipants } from '../components/ui/ChallengeParticipants.tsx';
import { PresentationCard } from '../components/ui/PresentationCard.tsx';

export const PresentationDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [related, setRelated] = useState<Presentation[]>([]);
  const [codingChallenges, setCodingChallenges] = useState<CodingChallenge[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchPres = async () => {
      setLoading(true);
      try {
        const p = await api.getPresentationBySlug(slug);
        setPresentation(p);

        if (p) {
          // Load comments
          const cmts = await api.getComments(p.id);
          setComments(cmts);

          // Load related presentations
          const rel = await api.getPresentations({ subject: p.subject });
          setRelated(rel.filter((r) => r.id !== p.id).slice(0, 3));

          const challenges = await api.getCodingChallengesForPresentation(p.id).catch(() => []);
          setCodingChallenges(challenges);
        }
      } catch (e) {
        console.error('Error fetching presentation details:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPres();
  }, [slug]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: presentation?.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleDeletePresentation = async () => {
    if (!presentation) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement cette présentation ?')) {
      await api.deletePresentation(presentation.id);
      navigate('/dashboard');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Veuillez vous connecter pour participer à la discussion.');
      return;
    }
    if (!commentInput.trim() || !presentation) return;

    setSubmittingComment(true);
    try {
      const newCmt = await api.addComment(presentation.id, commentInput);
      setComments([...comments, newCmt]);
      setCommentInput('');
      setPresentation((prev) =>
        prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null
      );
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l’envoi');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      const updated = await api.updateComment(commentId, editContent);
      setComments(comments.map((c) => (c.id === commentId ? updated : c)));
      setEditingCommentId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Supprimer ce commentaire ?')) {
      await api.deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      setPresentation((prev) =>
        prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) } : null
      );
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 animate-pulse space-y-4">
        <div className="h-6 w-32 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="h-10 w-3/4 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="h-4 w-1/2 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="h-64 bg-slate-200 rounded-2xl dark:bg-slate-800 mt-8" />
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Présentation Introuvable</h2>
        <p className="text-sm text-slate-500 mt-2">
          Cette présentation n'existe pas ou est actuellement un brouillon réservé à son auteur.
        </p>
        <Link
          to="/presentations"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Explorer les présentations
        </Link>
      </div>
    );
  }

  const isAuthor = user?.id === presentation.author_id;
  const readingTime = estimateReadingTime(presentation.blocks || []);
  const formattedDate = presentation.published_at || presentation.created_at
    ? new Date(presentation.published_at || presentation.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  // Generate Table of Contents
  const tocItems = (presentation.blocks || [])
    .filter((b) => b.title)
    .map((b, i) => ({ id: `block-${b.id}`, title: b.title, type: b.block_type, index: i }));

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          to="/presentations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux présentations
        </Link>

        {/* Presentation Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-10">
          {/* Top metadata row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                {presentation.subject}
              </span>
              {presentation.status === 'draft' && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                  Brouillon privé
                </span>
              )}
            </div>

            {/* Author actions if current user is owner */}
            {isAuthor && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/presentations/${presentation.id}/edit`}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <Edit className="h-3.5 w-3.5" /> Modifier
                </Link>
                <button
                  onClick={handleDeletePresentation}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {presentation.title}
          </h1>

          {/* Description */}
          {presentation.description && (
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
              {presentation.description}
            </p>
          )}

          {/* Tags */}
          {presentation.tags && presentation.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {presentation.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author Card & Meta Details */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <Link
              to={`/profile/${presentation.author?.username || 'user'}`}
              className="flex items-center gap-3 group hover:opacity-90"
            >
              <img
                src={
                  presentation.author?.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${presentation.author?.username || 'user'}`
                }
                alt={presentation.author?.full_name}
                className="h-11 w-11 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800"
              />
              <div>
                <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 block">
                  {presentation.author?.full_name}
                </span>
                <span className="text-xs text-slate-400 block">
                  {presentation.author?.study_program || 'Étudiant'} • @{presentation.author?.username}
                </span>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                ~{readingTime} min de lecture
              </span>

              {/* Original slides external link */}
              {presentation.original_url && (
                <a
                  href={presentation.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <ExternalLink className="h-4 w-4" />
                  Diaporama original
                </a>
              )}

              {/* Action Buttons: Like & Share */}
              <div className="flex items-center gap-2 pl-2">
                <LikeButton
                  presentationId={presentation.id}
                  initialLiked={presentation.is_liked}
                  initialCount={presentation.likes_count}
                  size="md"
                />
                <button
                  onClick={handleShare}
                  aria-label="Partager la présentation"
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Lien copié !</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Partager</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout: Sticky Table of Contents on left + Content Blocks on right */}
        {codingChallenges.length > 0 && (
          <section className="mb-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 dark:border-indigo-900/70 dark:from-indigo-950/40 dark:to-violet-950/30 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white"><Code2 className="h-5 w-5" /></span>
                <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Mise en pratique</p><h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Défi lié à cette présentation</h2><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Mettez en pratique les concepts de « {codingChallenges[0].linked_section} » et gagnez 75 points.</p><div className="mt-3"><ChallengeParticipants participants={codingChallenges[0].participants} /></div></div>
              </div>
              <Link to={`/challenges/${codingChallenges[0].id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">Ouvrir le défi <Code2 className="h-4 w-4" /></Link>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar TOC */}
          {tocItems.length > 0 && (
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Sommaire de l'exposé
                </h3>
                <nav className="space-y-1.5 text-xs">
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 truncate"
                    >
                      {item.title}
                    </a>
                  ))}
                  <a
                    href="#comments"
                    className="block rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800"
                  >
                    💬 Commentaires ({comments.length})
                  </a>
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <main className={tocItems.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="space-y-6">
              {(presentation.blocks || []).map((block, idx) => (
                <div key={block.id} id={`block-${block.id}`}>
                  <ContentBlockRenderer block={block} index={idx} />
                </div>
              ))}
            </div>

            {/* Comments Section */}
            <section
              id="comments"
              className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Questions & Commentaires ({comments.length})
                  </h3>
                </div>
              </div>

              {/* Comment submission form */}
              {user ? (
                <form onSubmit={handleAddComment} className="mb-8 space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={
                        user.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                      }
                      alt={user.full_name}
                      className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                    <div className="flex-1">
                      <textarea
                        rows={3}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Posez une question sur le code ou partagez un retour constructif..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={submittingComment || !commentInput.trim()}
                          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Publier le commentaire</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="mb-8 rounded-2xl bg-indigo-50/60 p-4 text-center text-xs text-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                  <Link to="/login" className="font-bold underline">
                    Connectez-vous
                  </Link>{' '}
                  pour poser une question ou commenter cette présentation.
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                {comments.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">
                    Aucun commentaire pour l'instant. Soyez le premier étudiant à réagir !
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isCommentAuthor = user?.id === comment.author_id;
                    const canModerate = isCommentAuthor || isAuthor;

                    return (
                      <div key={comment.id} className="pt-4 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <img
                              src={
                                comment.author?.avatar_url ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.author?.username || 'user'}`
                              }
                              alt=""
                              className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {comment.author?.full_name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  @{comment.author?.username}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  •{' '}
                                  {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              {editingCommentId === comment.id ? (
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    rows={2}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdateComment(comment.id)}
                                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white"
                                    >
                                      Enregistrer
                                    </button>
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="text-xs text-slate-500 hover:underline"
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                  {comment.content}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Moderation actions */}
                          {canModerate && (
                            <div className="flex items-center gap-1 shrink-0">
                              {isCommentAuthor && editingCommentId !== comment.id && (
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditContent(comment.content);
                                  }}
                                  aria-label="Modifier le commentaire"
                                  className="p-1 text-slate-400 hover:text-indigo-600 text-xs"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                aria-label="Supprimer le commentaire"
                                className="p-1 text-slate-400 hover:text-rose-600 text-xs"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Related Presentations */}
            {related.length > 0 && (
              <section className="mt-14">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">
                  Autres présentations en {presentation.subject}
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((relPres) => (
                    <PresentationCard key={relPres.id} presentation={relPres} />
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
