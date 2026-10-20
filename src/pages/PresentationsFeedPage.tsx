import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, BookOpen, Sparkles, Tag } from 'lucide-react';
import { api } from '../services/api.ts';
import { SUBJECT_CATEGORIES } from '../services/mockData.ts';
import type { Presentation } from '../types/index.ts';
import { PresentationCard } from '../components/ui/PresentationCard.tsx';

export const PresentationsFeedPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialSubject = searchParams.get('subject') || 'all';
  const initialSort = (searchParams.get('sort') as any) || 'newest';

  const [search, setSearch] = useState(initialSearch);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedSort, setSelectedSort] = useState<'newest' | 'oldest' | 'most_liked' | 'most_commented'>(initialSort);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state with URL params
  useEffect(() => {
    const s = searchParams.get('search') || '';
    const sub = searchParams.get('subject') || 'all';
    const srt = (searchParams.get('sort') as any) || 'newest';
    setSearch(s);
    setSelectedSubject(sub);
    setSelectedSort(srt);
  }, [searchParams]);

  // Load presentations
  useEffect(() => {
    const fetchPres = async () => {
      setLoading(true);
      try {
        const data = await api.getPresentations({
          search: search.trim() || undefined,
          subject: selectedSubject !== 'all' ? selectedSubject : undefined,
          tag: selectedTag || undefined,
          sort: selectedSort,
        });
        setPresentations(data);
      } catch (err) {
        console.error('Error fetching feed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPres();
  }, [search, selectedSubject, selectedSort, selectedTag]);

  const handleSubjectChange = (cat: string) => {
    setSelectedSubject(cat);
    setSearchParams((prev) => {
      if (cat === 'all') prev.delete('subject');
      else prev.set('subject', cat);
      return prev;
    });
  };

  const handleSortChange = (sort: 'newest' | 'oldest' | 'most_liked' | 'most_commented') => {
    setSelectedSort(sort);
    setSearchParams((prev) => {
      prev.set('sort', sort);
      return prev;
    });
  };

  // Extract all unique tags
  const allTags = Array.from(
    new Set(presentations.flatMap((p) => p.tags || []))
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Découvrir les Présentations
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Explorez le savoir universitaire partagé par vos camarades d'études.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchParams((prev) => {
                  if (e.target.value) prev.set('search', e.target.value);
                  else prev.delete('search');
                  return prev;
                });
              }}
              placeholder="Titre, tag, auteur..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => handleSubjectChange('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
              selectedSubject === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
            }`}
          >
            Tous les thèmes
          </button>
          {SUBJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleSubjectChange(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                selectedSubject === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters & Sorting Row */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          {/* Active Tag pill if selected */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {presentations.length} présentation{presentations.length > 1 ? 's' : ''} trouvée{presentations.length > 1 ? 's' : ''}
            </span>
            {selectedTag && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                #{selectedTag}
                <button onClick={() => setSelectedTag(null)} className="hover:text-rose-500">
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Trier par :
            </span>
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="newest">Plus récentes</option>
              <option value="most_liked">Les plus aimées (Likes)</option>
              <option value="most_commented">Les plus commentées</option>
              <option value="oldest">Plus anciennes</option>
            </select>
          </div>
        </div>

        {/* Presentations Grid or Empty State */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-72 rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-800" />
            ))}
          </div>
        ) : presentations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900 max-w-lg mx-auto">
            <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Aucune présentation trouvée
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Essayez de modifier votre mot-clé de recherche ou de réinitialiser les filtres par matière.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedSubject('all');
                setSelectedTag(null);
                setSearchParams({});
              }}
              className="mt-4 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {presentations.map((presentation) => (
              <PresentationCard key={presentation.id} presentation={presentation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
