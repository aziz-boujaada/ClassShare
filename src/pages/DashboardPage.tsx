import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  BookOpen,
  Heart,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  UserCheck,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import type { Presentation, Profile } from '../types/index.ts';
import { PresentationCard } from '../components/ui/PresentationCard.tsx';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [myPresentations, setMyPresentations] = useState<Presentation[]>([]);
  const [myDrafts, setMyDrafts] = useState<Presentation[]>([]);
  const [trending, setTrending] = useState<Presentation[]>([]);
  const [activePeers, setActivePeers] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'published' | 'drafts' | 'trending'>('published');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        if (user) {
          // My published presentations
          const pub = await api.getPresentations({ author_id: user.id, status: 'published' });
          setMyPresentations(pub);

          // My drafts
          const dft = await api.getPresentations({ author_id: user.id, status: 'draft' });
          setMyDrafts(dft);
        }

        // Trending community presentations
        const allPub = await api.getPresentations({ sort: 'most_liked' });
        setTrending(allPub.slice(0, 4));

        // Peers
        const peers = await api.getAllProfiles();
        setActivePeers(peers.filter((p) => p.id !== user?.id).slice(0, 4));
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Compute student stats
  const totalLikesReceived = myPresentations.reduce((acc, p) => acc + (p.likes_count || 0), 0);
  const totalCommentsReceived = myPresentations.reduce((acc, p) => acc + (p.comments_count || 0), 0);
  const userPoints = myPresentations.length * 50 + totalLikesReceived * 10 + totalCommentsReceived * 5;

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-8 sm:p-10 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white mb-3">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Espace Étudiant Actif
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
                Bonjour, {user?.full_name || 'Étudiant'} ! 👋
              </h1>
              <p className="mt-2 text-indigo-100 text-sm sm:text-base max-w-xl leading-relaxed">
                Prêt à partager votre dernière soutenance ou à explorer les travaux de vos camarades ?
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/presentations/generate"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-md backdrop-blur hover:bg-white/20 transition-all"
              >
                <Sparkles className="h-5 w-5 text-amber-300" />
                <span>Générer avec l'IA</span>
              </Link>
              <Link
                to="/presentations/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-md hover:bg-indigo-50 transition-all hover:scale-105"
              >
                <PlusCircle className="h-5 w-5 text-indigo-600" />
                <span>Publier un exposé</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Exposés Publiés
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {myPresentations.length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Likes Reçus
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {totalLikesReceived}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Commentaires Reçus
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {totalCommentsReceived}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Points
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {userPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout with Main Tabs & Active Peers Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
              <button
                onClick={() => setActiveTab('published')}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === 'published'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Mes Publications ({myPresentations.length})
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === 'drafts'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                Brouillons en cours ({myDrafts.length})
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`pb-3 text-sm font-bold transition-all relative ${
                  activeTab === 'trending'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                🔥 Tendance Communauté
              </button>
            </div>

            {/* Tab content */}
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="h-64 rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-800" />
                <div className="h-64 rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-800" />
              </div>
            ) : (
              <>
                {activeTab === 'published' && (
                  <div>
                    {myPresentations.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                        <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">
                          Aucune présentation publiée pour le moment
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Vous avez récemment réalisé un exposé ou un projet ? Partagez vos notes avec la promotion !
                        </p>
                        <Link
                          to="/presentations/new"
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Créer ma première présentation
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {myPresentations.map((p) => (
                          <PresentationCard key={p.id} presentation={p} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'drafts' && (
                  <div>
                    {myDrafts.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                        <Clock className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-200">
                          Aucun brouillon en attente
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Vos présentations en cours de rédaction apparaîtront ici en toute confidentialité.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {myDrafts.map((p) => (
                          <PresentationCard key={p.id} presentation={p} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'trending' && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {trending.map((p) => (
                      <PresentationCard key={p.id} presentation={p} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar: Active Peers */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Camarades Actifs
                </h3>
              </div>

              <div className="space-y-3">
                {activePeers.map((peer) => (
                  <Link
                    key={peer.id}
                    to={`/profile/${peer.username}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <img
                      src={
                        peer.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${peer.username}`
                      }
                      alt={peer.full_name}
                      className="h-9 w-9 rounded-full object-cover border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 block truncate">
                        {peer.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {peer.study_program}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  to="/leaderboard"
                  className="text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center justify-center gap-1"
                >
                  Voir tout le classement <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
