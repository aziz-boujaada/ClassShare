import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Database, ShieldCheck, Heart, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-12 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                Class<span className="text-indigo-600 dark:text-indigo-400">Share</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              La plateforme collaborative universitaire pour archiver, explorer et valoriser les exposés et projets informatiques des étudiants.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/presentations" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Toutes les présentations
                </Link>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Classement des étudiants
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Espace personnel
                </Link>
              </li>
              <li>
                <Link to="/presentations/new" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Publier un exposé
                </Link>
              </li>
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Filières & Thèmes
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/presentations?subject=Génie Logiciel" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Génie Logiciel & Architecture
                </Link>
              </li>
              <li>
                <Link to="/presentations?subject=Intelligence Artificielle" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Intelligence Artificielle & Data
                </Link>
              </li>
              <li>
                <Link to="/presentations?subject=Cybersécurité & Réseaux" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Cybersécurité & OWASP
                </Link>
              </li>
              <li>
                <Link to="/presentations?subject=Algorithmes & Structures" className="hover:text-indigo-600 dark:hover:text-indigo-400">
                  Algorithmes & Graphes
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Security */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Infrastructure
            </h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>Supabase PostgreSQL + RLS</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <span>Triggers & Fonctions de Sécurité</span>
              </div>
              <p className="text-[11px] pt-2 text-slate-400">
                Conçu avec React 19, TypeScript strict, TanStack Query et Tailwind CSS.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ClassShare. Plateforme étudiante d'apprentissage collaboratif.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Fait avec rigueur pédagogique <Heart className="h-3 w-3 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
