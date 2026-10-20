import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, LoaderCircle, Search, UsersRound } from 'lucide-react';
import { api } from '../services/api.ts';
import type { Profile } from '../types/index.ts';

export const UsersDirectoryPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void api.getAllProfiles()
      .then((items) => { if (active) setProfiles(items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger les membres.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return profiles;
    return profiles.filter((profile) =>
      [profile.full_name, profile.username, profile.study_program || '']
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [profiles, search]);

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400"><UsersRound className="h-4 w-4" /> Communauté ClassShare</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Membres de la plateforme</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Consultez les profils des étudiants et découvrez leurs contributions.</p>
          </div>
          <label className="relative block w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, identifiant ou formation"
              aria-label="Rechercher un membre"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </header>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Chargement des membres…</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{filteredProfiles.length} membre{filteredProfiles.length === 1 ? '' : 's'}{search.trim() ? ' trouvé' : ' inscrit'}{filteredProfiles.length === 1 ? '' : 's'}</p>
            {filteredProfiles.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProfiles.map((profile) => (
                  <Link
                    key={profile.id}
                    to={`/profile/${encodeURIComponent(profile.username)}`}
                    className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
                  >
                    <img
                      src={profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile.username)}`}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover dark:border-slate-700 dark:bg-slate-800"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">{profile.full_name || profile.username}</span>
                      <span className="mt-0.5 block truncate text-xs text-indigo-600 dark:text-indigo-400">@{profile.username}</span>
                      <span className="mt-2 flex items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400"><GraduationCap className="h-3.5 w-3.5 shrink-0" />{profile.study_program || 'Formation non renseignée'}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
                <UsersRound className="mx-auto h-9 w-9 text-slate-400" />
                <h2 className="mt-3 font-bold text-slate-900 dark:text-white">Aucun membre trouvé</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Essayez un autre nom, identifiant ou programme d’études.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
