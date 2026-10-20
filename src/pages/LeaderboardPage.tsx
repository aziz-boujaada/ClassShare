import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Flame, Heart, MessageSquare, BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import type { LeaderboardEntry } from '../types/index.ts';

export const LeaderboardPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const data = await api.getLeaderboard(timeframe);
        setLeaderboard(data);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [timeframe]);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header banner */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 mb-3 border border-amber-200 dark:border-amber-900">
            <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Classement des Contributeurs Universitaires</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Les Meilleurs Partages de Connaissances
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Les défis de code réussis rapportent 75 points, en plus des points gagnés avec vos présentations, likes et commentaires.
          </p>

          {/* Timeframe Filter Pills */}
          <div className="mt-6 inline-flex rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <button
              onClick={() => setTimeframe('all')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                timeframe === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Tout le temps
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                timeframe === 'month'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Ce mois-ci
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                timeframe === 'week'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Cette semaine
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 max-w-3xl mx-auto animate-pulse">
            <div className="h-48 bg-slate-200 rounded-3xl dark:bg-slate-800" />
            <div className="h-16 bg-slate-200 rounded-2xl dark:bg-slate-800" />
            <div className="h-16 bg-slate-200 rounded-2xl dark:bg-slate-800" />
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 2 && (
              <div className="mb-12 grid grid-cols-3 items-end gap-3 sm:gap-6 max-w-3xl mx-auto pt-6">
                {/* 2nd Place (Silver) */}
                {top2 && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <img
                        src={
                          top2.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${top2.username}`
                        }
                        alt={top2.full_name}
                        className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-cover border-4 border-slate-300 shadow-md"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 text-xs font-black text-slate-800 shadow">
                        2
                      </span>
                    </div>
                    <Link
                      to={`/profile/${top2.username}`}
                      className="font-bold text-xs sm:text-sm text-center text-slate-900 dark:text-white hover:text-indigo-600 truncate max-w-[120px]"
                    >
                      {top2.full_name}
                    </Link>
                    <span className="text-[10px] sm:text-xs text-slate-400 text-center truncate max-w-[110px]">
                      {top2.study_program}
                    </span>

                    <div className="mt-3 w-full rounded-2xl bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-800/60 p-4 text-center h-32 sm:h-40 flex flex-col justify-center border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {top2.published_presentations_count} exposés
                      </span>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>❤️ {top2.total_likes_received}</span>
                        <span>💬 {top2.total_comments_received}</span>
                      </div>
                      <span className="mt-2 text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {top2.score} pts
                      </span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold) */}
                {top1 && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <Trophy className="h-6 w-6 text-amber-500 animate-bounce" />
                      </div>
                      <img
                        src={
                          top1.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${top1.username}`
                        }
                        alt={top1.full_name}
                        className="h-18 w-18 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-amber-400 shadow-xl ring-4 ring-amber-300/30"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-amber-950 shadow-md">
                        1
                      </span>
                    </div>
                    <Link
                      to={`/profile/${top1.username}`}
                      className="font-bold text-sm sm:text-base text-center text-slate-900 dark:text-white hover:text-indigo-600 truncate max-w-[140px]"
                    >
                      {top1.full_name}
                    </Link>
                    <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-semibold text-center truncate max-w-[130px]">
                      Major de Promotion
                    </span>

                    <div className="mt-3 w-full rounded-2xl bg-gradient-to-t from-amber-100 to-amber-50 dark:from-amber-950/60 dark:to-amber-900/30 p-4 text-center h-40 sm:h-48 flex flex-col justify-center border-2 border-amber-300 dark:border-amber-700/60 shadow-lg">
                      <span className="text-sm font-black text-amber-900 dark:text-amber-200">
                        {top1.published_presentations_count} exposés
                      </span>
                      <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-300 mt-1">
                        <span>❤️ {top1.total_likes_received}</span>
                        <span>💬 {top1.total_comments_received}</span>
                      </div>
                      <span className="mt-2 text-sm font-black text-indigo-700 dark:text-indigo-300">
                        {top1.score} pts
                      </span>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3 && (
                  <div className="flex flex-col items-center">
                    <div className="relative mb-3">
                      <img
                        src={
                          top3.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${top3.username}`
                        }
                        alt={top3.full_name}
                        className="h-14 w-14 sm:h-20 sm:w-20 rounded-full object-cover border-4 border-amber-700/60 shadow-md"
                      />
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-black text-white shadow">
                        3
                      </span>
                    </div>
                    <Link
                      to={`/profile/${top3.username}`}
                      className="font-bold text-xs sm:text-sm text-center text-slate-900 dark:text-white hover:text-indigo-600 truncate max-w-[120px]"
                    >
                      {top3.full_name}
                    </Link>
                    <span className="text-[10px] sm:text-xs text-slate-400 text-center truncate max-w-[110px]">
                      {top3.study_program}
                    </span>

                    <div className="mt-3 w-full rounded-2xl bg-gradient-to-t from-orange-100/70 to-orange-50/50 dark:from-orange-950/40 dark:to-orange-900/20 p-4 text-center h-28 sm:h-36 flex flex-col justify-center border border-orange-200 dark:border-orange-800/40">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {top3.published_presentations_count} exposés
                      </span>
                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span>❤️ {top3.total_likes_received}</span>
                        <span>💬 {top3.total_comments_received}</span>
                      </div>
                      <span className="mt-2 text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {top3.score} pts
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete Ranking Table */}
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-4xl mx-auto">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Classement complet ({leaderboard.length} contributeurs)
                </span>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Règle de départage : Exposés &gt; Likes &gt; Commentaires
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user_id}
                    className="flex items-center justify-between p-4 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                          index === 0
                            ? 'bg-amber-400 text-amber-950'
                            : index === 1
                            ? 'bg-slate-300 text-slate-800'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </span>

                      {/* Avatar & Name */}
                      <Link
                        to={`/profile/${entry.username}`}
                        className="flex items-center gap-3 group"
                      >
                        <img
                          src={
                            entry.avatar_url ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`
                          }
                          alt={entry.full_name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 block">
                            {entry.full_name}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {entry.study_program || 'Étudiant'} • @{entry.username}
                          </span>
                        </div>
                      </Link>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 sm:gap-6 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                          {entry.published_presentations_count}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">Exposés</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-rose-500" />
                          {entry.total_likes_received}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">Likes</span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                          {entry.total_comments_received}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">Commentaires</span>
                      </div>

                      <div className="rounded-xl bg-indigo-50 px-3 py-1.5 font-black text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-xs">
                        {entry.score} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
