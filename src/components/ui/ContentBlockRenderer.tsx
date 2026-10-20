import React from 'react';
import { BookOpen, CheckCircle2, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import type { PresentationBlock } from '../../types/index.ts';
import { CodeSnippet } from './CodeSnippet.tsx';

interface ContentBlockRendererProps {
  block: PresentationBlock;
  index: number;
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ block }) => {
  const { block_type, title, content } = block;

  if (block_type === 'summary') {
    return (
      <section className="my-6 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-6 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2.5 mb-3 text-indigo-700 dark:text-indigo-400">
          <BookOpen className="h-5 w-5" />
          <h3 className="text-lg font-bold tracking-tight">
            {title || 'Résumé Pédagogique'}
          </h3>
        </div>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base">
          {content?.text}
        </p>
      </section>
    );
  }

  if (block_type === 'key_points') {
    const points: string[] = content?.points || [];
    return (
      <section className="my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-4 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {title || 'Points Clés à Retenir'}
          </h3>
        </div>
        <ul className="space-y-3">
          {points.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                {i + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-300 leading-normal text-sm md:text-base">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block_type === 'explanation') {
    return (
      <section className="my-6">
        {title && (
          <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          </div>
        )}
        <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* Render formatted paragraphs */}
          {(content?.markdown || '')
            .split('\n\n')
            .map((paragraph: string, idx: number) => {
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                const items = paragraph.split('\n').map((l) => l.replace(/^[-*]\s*/, ''));
                return (
                  <ul key={idx} className="my-3 list-disc pl-5 space-y-1">
                    {items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="my-3 whitespace-pre-line">
                  {paragraph}
                </p>
              );
            })}
        </div>
      </section>
    );
  }

  if (block_type === 'code_snippet') {
    return (
      <CodeSnippet
        language={content?.language || 'typescript'}
        code={content?.code || ''}
        title={title}
        explanation={content?.explanation}
      />
    );
  }

  if (block_type === 'resource') {
    const resources = content?.resources || [];
    return (
      <section className="my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          {title || 'Ressources & Liens Recommandés'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((res: any, idx: number) => (
            <a
              key={idx}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-indigo-700 dark:hover:bg-slate-800"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {res.title}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-500" />
                </div>
                {res.description && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {res.description}
                  </p>
                )}
              </div>
              <span className="mt-3 truncate text-[11px] font-mono text-slate-400 group-hover:text-indigo-500">
                {res.url.replace(/^https?:\/\//, '')}
              </span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (block_type === 'image') {
    return (
      <figure className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative max-h-96 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={content?.url}
            alt={content?.alt || title || 'Schéma de présentation'}
            className="w-full h-auto object-cover max-h-96"
            loading="lazy"
          />
        </div>
        {(title || content?.caption) && (
          <figcaption className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
            {title && <span className="font-semibold text-slate-700 dark:text-slate-300 mr-2">{title} :</span>}
            {content?.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
};
