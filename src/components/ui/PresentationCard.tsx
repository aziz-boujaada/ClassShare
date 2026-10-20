import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, ArrowUpRight, Tag } from 'lucide-react';
import type { Presentation } from '../../types/index.ts';
import { LikeButton } from './LikeButton.tsx';

interface PresentationCardProps {
  presentation: Presentation;
}

export const PresentationCard: React.FC<PresentationCardProps> = ({ presentation }) => {
  const authorName = presentation.author?.full_name || 'Étudiant anonyme';
  const authorUsername = presentation.author?.username || 'user';
  const authorAvatar =
    presentation.author?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${authorUsername}`;

  const formattedDate = presentation.published_at || presentation.created_at
    ? new Date(presentation.published_at || presentation.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-700">
      <div>
        {/* Top bar: Category badge & status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
            {presentation.subject}
          </span>
          {presentation.status === 'draft' && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
              Brouillon
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-white dark:group-hover:text-indigo-400">
          <Link to={`/presentations/${presentation.slug}`} className="focus:outline-none">
            <span className="absolute inset-0 z-0" aria-hidden="true" />
            {presentation.title}
          </Link>
        </h3>

        {/* Short Summary */}
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {presentation.description || 'Aucune description fournie.'}
        </p>

        {/* Tags */}
        {presentation.tags && presentation.tags.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 z-10 relative">
            {presentation.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <Tag className="h-2.5 w-2.5 opacity-60" />
                {tag}
              </span>
            ))}
            {presentation.tags.length > 3 && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{presentation.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Author & Stats */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 z-10 relative">
        <Link
          to={`/profile/${authorUsername}`}
          className="flex items-center gap-2.5 group/author hover:opacity-80 transition-opacity"
        >
          <img
            src={authorAvatar}
            alt={authorName}
            className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover/author:text-indigo-500">
              {authorName}
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {formattedDate}
            </span>
          </div>
        </Link>

        {/* Actions & Metrics */}
        <div className="flex items-center gap-2">
          <Link
            to={`/presentations/${presentation.slug}#comments`}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-1"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{presentation.comments_count || 0}</span>
          </Link>

          <LikeButton
            presentationId={presentation.id}
            initialLiked={presentation.is_liked}
            initialCount={presentation.likes_count}
            size="sm"
          />

          <Link
            to={`/presentations/${presentation.slug}`}
            aria-label={`Lire ${presentation.title}`}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
};
