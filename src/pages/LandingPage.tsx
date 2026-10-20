import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  Code2,
  BookOpen,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Heart,
  MessageSquare,
  Users,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { SUBJECT_CATEGORIES } from '../services/mockData.ts';
import type { Presentation } from '../types/index.ts';
import { PresentationCard } from '../components/ui/PresentationCard.tsx';

export const LandingPage: React.FC = () => {
  const [featured, setFeatured] = useState<Presentation[]>([]);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const pres = await api.getPresentations({ sort: 'most_liked' });
        setFeatured(pres.slice(0, 3));
      } catch (e) {
        console.error(e);
      }
    };
    loadFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Plateforme Universitaire Collaborative</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Le savoir académique qui ne reste plus dans un tiroir.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Publiez vos exposés, synthétisez vos projets avec des snippets de code et découvrez les présentations les plus inspirantes de vos camarades.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/presentations"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-all hover:scale-105"
              >
                <span>Découvrir les présentations</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/presentations/new"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-all"
              >
                <span>Publier mon exposé</span>
              </Link>
            </div>

            {/* Quick Metrics */}
            <div className="pt-10 grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-200/60 dark:border-slate-800/80 max-w-lg mx-auto text-center">
              <div>
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white block">100%</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Pédagogique</span>
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 block truncate">PostgreSQL</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">Supabase & RLS</span>
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white block">React 19</span>
                <span className="text-[10px] sm:text-[11px] text-slate-500">TypeScript Pur</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Presentations */}
      {featured.length > 0 && (
        <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                  Les Favoris de la Promotion
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Présentations Populaires
                </h2>
              </div>
              <Link
                to="/presentations"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Voir tout le catalogue <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <PresentationCard key={p.id} presentation={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              Conçu pour l'Excellence Universitaire
            </h2>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Tout ce dont vous avez besoin pour structurer un support pédagogique clair et mémorable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <Code2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Blocs de Code & Coloration
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Snippets en TypeScript, Python, SQL ou Bash avec coloration syntaxique Prism, explications en marge et copie en 1 clic.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Entraide & Commentaires
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Appréciez les exposés de vos camarades, posez des questions précises sur le code et recevez des notifications instantanées.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Classement & Podium Étudiant
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Valorisez votre investissement académique avec un podium dynamique calculé sur la qualité et la fréquence de vos partages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subject Categories Explorer */}
      <section className="py-16 bg-slate-100/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Explorez par Filière
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Des cours d'algorithmique aux architectures cloud distribuées.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUBJECT_CATEGORIES.map((subject) => (
              <Link
                key={subject}
                to={`/presentations?subject=${encodeURIComponent(subject)}`}
                className="group flex flex-col items-center justify-center p-5 rounded-2xl bg-white border border-slate-200 text-center hover:border-indigo-400 hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700"
              >
                <BookOpen className="h-6 w-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                  {subject}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
