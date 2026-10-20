import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50/50 py-12 flex flex-col justify-center dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            Class<span className="text-indigo-600 dark:text-indigo-400">Share</span>
          </span>
        </Link>
        <h2 className="text-center text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Connexion à votre espace étudiant
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Accédez à vos présentations et aux ressources de votre promotion.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Adresse email universitaire
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="etudiant@universite.fr"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mot de passe
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>Se connecter</span>
            </button>
          </form>

          <div className="text-center text-xs text-slate-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:underline dark:text-indigo-400">
              Inscrivez-vous gratuitement
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
