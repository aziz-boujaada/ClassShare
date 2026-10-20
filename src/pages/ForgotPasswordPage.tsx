import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
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
          Récupération de mot de passe
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {submitted ? (
            <div className="rounded-2xl bg-emerald-50 p-6 text-center text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-sm">Email de récupération envoyé !</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Si un compte existe pour {email}, un lien de réinitialisation a été transmis.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block text-xs font-bold text-emerald-800 underline"
              >
                Retour à la page de connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse email du compte
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

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>Envoyer le lien de réinitialisation</span>
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
