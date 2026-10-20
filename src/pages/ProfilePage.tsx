import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  GraduationCap,
  BookOpen,
  Heart,
  MessageSquare,
  Edit,
  Shield,
  ArrowLeft,
  Share2,
  Check,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import type { Profile, Presentation } from '../types/index.ts';
import { PresentationCard } from '../components/ui/PresentationCard.tsx';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const p = await api.getProfile(username);
        setProfile(p);

        if (p) {
          const pres = await api.getPresentations({ author_id: p.id, status: 'published' });
          setPresentations(pres);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 animate-pulse space-y-4">
        <div className="h-28 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-8 w-48 bg-slate-200 rounded dark:bg-slate-800" />
        <div className="h-16 w-full bg-slate-200 rounded-2xl dark:bg-slate-800" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Profil introuvable</h2>
        <p className="text-xs text-slate-500 mt-2">
          Aucun étudiant ne correspond au nom d'utilisateur @{username}.
        </p>
        <Link
          to="/leaderboard"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" /> Voir le classement
        </Link>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const totalLikes = presentations.reduce((acc, p) => acc + (p.likes_count || 0), 0);
  const totalComments = presentations.reduce((acc, p) => acc + (p.comments_count || 0), 0);

  const formattedDate = new Date(profile.created_at).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <img
                src={
                  profile.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`
                }
                alt={profile.full_name}
                className="h-24 w-24 rounded-full object-cover border-4 border-indigo-100 shadow-md dark:border-indigo-900"
              />
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                    {profile.full_name}
                  </h1>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    @{profile.username}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <GraduationCap className="h-4 w-4 text-indigo-600" />
                    {profile.study_program || 'Programme d’études non spécifié'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Membre depuis {formattedDate}
                  </span>
                </div>

                {profile.bio && (
                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex items-center gap-2 self-center sm:self-start">
              {isOwnProfile ? (
                <Link
                  to="/settings/profile"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Modifier profil
                </Link>
              ) : (
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copié
                    </>
                  ) : (
                    <>
                      <Share2 className="h-3.5 w-3.5" /> Partager profil
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Aggregate Student Stats */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white block">
                {presentations.length}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Exposés Publiés</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xl sm:text-2xl font-black text-rose-600 block">
                {totalLikes}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Likes Reçus</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 block">
                {totalComments}
              </span>
              <span className="text-[11px] font-semibold text-slate-500">Commentaires</span>
            </div>
          </div>
        </div>

        {/* Presentations List */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Présentations publiées ({presentations.length})
          </h2>

          {presentations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-400">
                Cet étudiant n'a pas encore publié de présentation publique.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {presentations.map((p) => (
                <PresentationCard key={p.id} presentation={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
