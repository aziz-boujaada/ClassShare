import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2, LoaderCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api.ts';
import type { CodingChallenge } from '../types/index.ts';
import { ChallengeParticipants } from '../components/ui/ChallengeParticipants.tsx';

export const CodingChallengesPage: React.FC = () => {
  const [challenges, setChallenges] = useState<CodingChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void api.getCodingChallenges().then((items) => {
      if (active) setChallenges(items);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les défis.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400"><Code2 className="h-4 w-4" /> Espace de programmation</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Défis de code</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">Ouvrez un défi pour rejoindre les participants. Réussissez tous les tests cachés pour gagner 75 points.</p>
          </div>
          <Link to="/presentations/generate" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"><Sparkles className="h-4 w-4" /> Générer un défi depuis un cours</Link>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Chargement des défis…</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}<p className="mt-2 text-xs">Vérifiez que la migration des défis est appliquée dans Supabase.</p></div>
        ) : challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <Code2 className="mx-auto h-10 w-10 text-indigo-500" />
            <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Aucun défi pour le moment</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">Générez une présentation sur un sujet de programmation ou de bases de données. Un défi de code sera ajouté quand le contenu s’y prête.</p>
            <Link to="/presentations/generate" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Créer une présentation <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {challenges.map((challenge) => (
              <article key={challenge.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{challenge.title}</h2><p className="mt-1 text-xs text-slate-500">{challenge.linked_section || 'Défi de programmation'}</p></div><span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{challenge.language}</span></div>
                <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{challenge.problem}</p>
                <div className="mt-5 flex items-center justify-between gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{challenge.difficulty}</span><Link to={`/challenges/${challenge.id}`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700">Ouvrir l’éditeur <ArrowRight className="h-3.5 w-3.5" /></Link></div>
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><ChallengeParticipants participants={challenge.participants} /></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
