import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ArrowLeft, Save, Check, RefreshCw, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

export const EditProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [studyProgram, setStudyProgram] = useState(user?.study_program || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setBio(user.bio || '');
      setStudyProgram(user.study_program || '');
      setAvatarUrl(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const handleGenerateAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    setAvatarFile(null);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Choisissez une image JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('L’image doit faire 5 Mo maximum.');
      e.target.value = '';
      return;
    }
    setAvatarFile(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      alert('Le nom complet est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const savedAvatarUrl = avatarFile ? await api.uploadAvatar(avatarFile) : avatarUrl.trim() || null;
      await updateProfile({
        full_name: fullName.trim(),
        bio: bio.trim(),
        study_program: studyProgram.trim(),
        avatar_url: savedAvatarUrl,
      });
      setAvatarFile(null);
      setAvatarUrl(savedAvatarUrl || '');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link
          to={user ? `/profile/${user.username}` : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à mon profil
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Paramètres du Profil
            </h1>
          </div>

          {success && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Profil mis à jour avec succès !</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile photo preview and upload */}
            <div className="flex items-center gap-5">
              <img
                src={
                  avatarPreview || avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username || 'user'}`
                }
                alt="Aperçu de la photo de profil"
                className="h-20 w-20 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700">
                  <Upload className="h-3.5 w-3.5" />
                  Choisir une photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarFileChange}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Générer un nouvel avatar
                </button>
                <span className="w-full text-[11px] text-slate-400">
                  JPG, PNG ou WebP · 5 Mo maximum
                  {avatarFile && <span className="block text-indigo-600 dark:text-indigo-400">{avatarFile.name}</span>}
                </span>
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                URL de l'avatar
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => {
                  setAvatarFile(null);
                  setAvatarUrl(e.target.value);
                }}
                placeholder="https://..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Study Program */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Filière / Programme d’études
              </label>
              <input
                type="text"
                value={studyProgram}
                onChange={(e) => setStudyProgram(e.target.value)}
                placeholder="Ex: Master Génie Logiciel (M2), Licence Informatique..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Biographie / Présentation
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Vos centres d’intérêt informatiques, projets ou technologies favorites..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all"
              >
                <Save className="h-4 w-4" />
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
