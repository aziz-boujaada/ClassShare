import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit3,
  Save,
  CheckCircle,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileText,
  Code,
  Link2,
  Image as ImageIcon,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { SUBJECT_CATEGORIES } from '../services/mockData.ts';
import type { PresentationBlock, BlockType, PresentationStatus } from '../types/index.ts';
import { validateContentBlock, slugify } from '../lib/logic.ts';
import { ContentBlockRenderer } from '../components/ui/ContentBlockRenderer.tsx';

export const PresentationEditorPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = Boolean(id);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState(SUBJECT_CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>(['TypeScript', 'Architecture']);
  const [tagInput, setTagInput] = useState('');
  const [presentationDate, setPresentationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [originalUrl, setOriginalUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState(
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'
  );
  const [status, setStatus] = useState<PresentationStatus>('published');

  // Blocks state
  const [blocks, setBlocks] = useState<Array<Omit<PresentationBlock, 'id' | 'presentation_id'> & { tempId: string }>>([
    {
      tempId: 'b-init-1',
      block_type: 'summary',
      title: 'Résumé synthétique',
      content: { text: "Présentation des concepts clés abordés durant l'exposé en classe." },
      position: 0,
    },
    {
      tempId: 'b-init-2',
      block_type: 'key_points',
      title: 'Points fondamentaux',
      content: { points: ['Premier concept essentiel', 'Deuxième principe à retenir', 'Troisième axe de réflexion'] },
      position: 1,
    },
    {
      tempId: 'b-init-3',
      block_type: 'code_snippet',
      title: 'Extrait de code commenté',
      content: {
        language: 'typescript',
        code: `// Exemple démonstratif\nexport function example() {\n  return "Code propre et maintenable";\n}`,
        explanation: 'Illustration concrète de l’implémentation.',
      },
      position: 2,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load existing presentation if editing
  useEffect(() => {
    if (isEditMode && id) {
      const loadPres = async () => {
        try {
          const pres = await api.getPresentationById(id);
          if (pres) {
            setTitle(pres.title);
            setDescription(pres.description || '');
            setSubject(pres.subject);
            setTags(pres.tags || []);
            setPresentationDate(pres.presentation_date || '');
            setOriginalUrl(pres.original_url || '');
            setCoverImageUrl(pres.cover_image_url || '');
            setStatus(pres.status);

            if (pres.blocks && pres.blocks.length > 0) {
              setBlocks(
                pres.blocks.map((b) => ({
                  tempId: b.id,
                  block_type: b.block_type,
                  title: b.title,
                  content: b.content,
                  position: b.position,
                }))
              );
            }
          }
        } catch (e) {
          console.error('Failed to load presentation:', e);
        }
      };
      loadPres();
    }
  }, [id, isEditMode]);

  // Warn before unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Tag addition
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
    setHasUnsavedChanges(true);
  };

  // Block management
  const addBlock = (type: BlockType) => {
    let initialContent: any = {};
    let defaultTitle = '';

    switch (type) {
      case 'summary':
        defaultTitle = 'Résumé Pédagogique';
        initialContent = { text: '' };
        break;
      case 'key_points':
        defaultTitle = 'Points Clés à Retenir';
        initialContent = { points: [''] };
        break;
      case 'explanation':
        defaultTitle = 'Explication Approfondie';
        initialContent = { markdown: '' };
        break;
      case 'code_snippet':
        defaultTitle = 'Snippet de Code';
        initialContent = { language: 'typescript', code: '', explanation: '' };
        break;
      case 'resource':
        defaultTitle = 'Ressources et Documentation';
        initialContent = { resources: [{ title: '', url: '', description: '' }] };
        break;
      case 'image':
        defaultTitle = 'Schéma ou Diagramme';
        initialContent = { url: '', alt: '', caption: '' };
        break;
    }

    const newBlock = {
      tempId: 'b-' + Math.random().toString(36).substring(2, 9),
      block_type: type,
      title: defaultTitle,
      content: initialContent,
      position: blocks.length,
    };

    setBlocks([...blocks, newBlock]);
    setHasUnsavedChanges(true);
  };

  const removeBlock = (index: number) => {
    const next = blocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, position: i }));
    setBlocks(next);
    setHasUnsavedChanges(true);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...blocks];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    setBlocks(next.map((b, i) => ({ ...b, position: i })));
    setHasUnsavedChanges(true);
  };

  const updateBlockContent = (index: number, field: string, value: any) => {
    const next = [...blocks];
    next[index] = {
      ...next[index],
      content: {
        ...next[index].content,
        [field]: value,
      },
    };
    setBlocks(next);
    setHasUnsavedChanges(true);
  };

  const updateBlockTitle = (index: number, title: string) => {
    const next = [...blocks];
    next[index] = {
      ...next[index],
      title,
    };
    setBlocks(next);
    setHasUnsavedChanges(true);
  };

  // Submission
  const handleSave = async (targetStatus: PresentationStatus) => {
    if (!user) {
      alert('Veuillez vous connecter pour créer une présentation.');
      return;
    }

    const errors: string[] = [];

    if (!title.trim()) {
      errors.push('Le titre de la présentation est obligatoire.');
    }
    if (!description.trim()) {
      errors.push('La description synthétique est obligatoire.');
    }
    if (blocks.length === 0) {
      errors.push('Vous devez ajouter au moins un bloc de contenu.');
    }

    // Validate each block
    blocks.forEach((b, idx) => {
      const v = validateContentBlock(b);
      if (!v.valid) {
        errors.push(`Bloc #${idx + 1} (${b.title || b.block_type}) : ${v.error}`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setSaving(true);

    try {
      const payloadData = {
        title: title.trim(),
        description: description.trim(),
        subject,
        tags,
        presentation_date: presentationDate || null,
        original_url: originalUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        status: targetStatus,
        author_id: user.id,
      };

      const blocksPayload = blocks.map((b, i) => ({
        block_type: b.block_type,
        title: b.title || null,
        content: b.content,
        position: i,
      }));

      let result;
      if (isEditMode && id) {
        result = await api.updatePresentation(id, payloadData, blocksPayload);
      } else {
        result = await api.createPresentation(payloadData, blocksPayload);
      }

      setHasUnsavedChanges(false);
      navigate(`/presentations/${result.slug}`);
    } catch (err: any) {
      console.error('Save failed:', err);
      setValidationErrors([err.message || 'Une erreur est survenue lors de l’enregistrement.']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header & Back Link */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour au tableau de bord
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isEditMode ? 'Modifier la présentation' : 'Créer une nouvelle présentation'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Partagez le savoir issu de vos soutenances et projets d'études avec vos pairs.
            </p>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <Link
                to="/presentations/generate"
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> Générer avec l'IA
              </Link>
            )}
            <div className="flex rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'editor'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Éditeur
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Aperçu en direct
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Sauvegarder brouillon
            </button>
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-all hover:scale-[1.02]"
            >
              <Save className="h-4 w-4" />
              <span>Publier</span>
            </button>
          </div>
        </div>

        {/* Validation Errors banner */}
        {validationErrors.length > 0 && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="flex items-center gap-2 font-bold mb-1 text-rose-900 dark:text-rose-100">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>Merci de corriger les éléments suivants avant de sauvegarder :</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 1: PREVIEW */}
        {activeTab === 'preview' ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900 max-w-4xl mx-auto">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
              <span className="inline-block rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-3">
                {subject}
              </span>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                {title || 'Titre de la présentation'}
              </h1>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {description || 'Description courte.'}
              </p>
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {blocks.map((block, idx) => (
                <ContentBlockRenderer
                  key={block.tempId}
                  block={{
                    id: block.tempId,
                    presentation_id: 'preview',
                    block_type: block.block_type,
                    title: block.title,
                    content: block.content,
                    position: idx,
                  }}
                  index={idx}
                />
              ))}
            </div>
          </div>
        ) : (
          /* TAB 2: EDITOR */
          <div className="space-y-8">
            {/* General Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Informations Générales
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Titre de la présentation *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Ex: Clean Architecture & Design Patterns en TypeScript"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {title && (
                    <span className="text-[11px] font-mono text-slate-400 mt-1 block">
                      Slug URL : /presentations/{slugify(title)}
                    </span>
                  )}
                </div>

                {/* Short Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Résumé / Description courte *
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Synthèse claire pour le flux de découverte (1 à 2 phrases)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Subject / Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matière / Filière *
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {SUBJECT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Presentation Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date de soutenance / exposé
                  </label>
                  <input
                    type="date"
                    value={presentationDate}
                    onChange={(e) => {
                      setPresentationDate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Original Slides URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lien vers les slides originaux (Google Slides, Canva, PDF)
                  </label>
                  <input
                    type="url"
                    value={originalUrl}
                    onChange={(e) => {
                      setOriginalUrl(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="https://docs.google.com/presentation/d/..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Cover image URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Image de couverture (URL)
                  </label>
                  <input
                    type="url"
                    value={coverImageUrl}
                    onChange={(e) => {
                      setCoverImageUrl(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (Appuyez sur Entrée pour ajouter)
                  </label>
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder={tags.length === 0 ? 'Ajouter des tags...' : ''}
                      className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Blocks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Blocs de Contenu Pédagogique ({blocks.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ordonnez vos explications, extraits de code, points clés et ressources.
                  </p>
                </div>
              </div>

              {/* Render Block Editors */}
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div
                    key={block.tempId}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all"
                  >
                    {/* Block Toolbar */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {block.block_type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveBlock(index, 'up')}
                          disabled={index === 0}
                          aria-label="Monter le bloc"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(index, 'down')}
                          disabled={index === blocks.length - 1}
                          aria-label="Descendre le bloc"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(index)}
                          aria-label="Supprimer le bloc"
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Title */}
                    <div className="mb-3">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Titre de la section
                      </label>
                      <input
                        type="text"
                        value={block.title || ''}
                        onChange={(e) => updateBlockTitle(index, e.target.value)}
                        placeholder="Ex: Concepts fondamentaux"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>

                    {/* Block Type Specific Form */}
                    {block.block_type === 'summary' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Texte du résumé pédagogique *
                        </label>
                        <textarea
                          rows={3}
                          value={block.content?.text || ''}
                          onChange={(e) => updateBlockContent(index, 'text', e.target.value)}
                          placeholder="Présentez les objectifs et les conclusions de la présentation..."
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </div>
                    )}

                    {block.block_type === 'key_points' && (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Liste des points clés *
                        </label>
                        {(block.content?.points || []).map((point: string, pIdx: number) => (
                          <div key={pIdx} className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 font-bold">•</span>
                            <input
                              type="text"
                              value={point}
                              onChange={(e) => {
                                const nextPts = [...block.content.points];
                                nextPts[pIdx] = e.target.value;
                                updateBlockContent(index, 'points', nextPts);
                              }}
                              placeholder={`Point clé #${pIdx + 1}...`}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextPts = block.content.points.filter((_: any, i: number) => i !== pIdx);
                                updateBlockContent(index, 'points', nextPts);
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextPts = [...(block.content?.points || []), ''];
                            updateBlockContent(index, 'points', nextPts);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:underline pt-1"
                        >
                          + Ajouter un point clé
                        </button>
                      </div>
                    )}

                    {block.block_type === 'explanation' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Explication détaillée (Supporte paragraphes, listes à puces) *
                        </label>
                        <textarea
                          rows={5}
                          value={block.content?.markdown || ''}
                          onChange={(e) => updateBlockContent(index, 'markdown', e.target.value)}
                          placeholder="Expliquez la logique métier, les contraintes et les solutions retenues..."
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 font-sans focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </div>
                    )}

                    {block.block_type === 'code_snippet' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Langage de programmation *
                            </label>
                            <select
                              value={block.content?.language || 'typescript'}
                              onChange={(e) => updateBlockContent(index, 'language', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                            >
                              <option value="typescript">TypeScript</option>
                              <option value="javascript">JavaScript</option>
                              <option value="java">Java</option>
                              <option value="python">Python</option>
                              <option value="sql">SQL (PostgreSQL)</option>
                              <option value="bash">Bash / Shell</option>
                              <option value="json">JSON</option>
                              <option value="css">CSS</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                              Explication du snippet
                            </label>
                            <input
                              type="text"
                              value={block.content?.explanation || ''}
                              onChange={(e) => updateBlockContent(index, 'explanation', e.target.value)}
                              placeholder="Que fait ce bout de code ?"
                              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Code source *
                          </label>
                          <textarea
                            rows={6}
                            value={block.content?.code || ''}
                            onChange={(e) => updateBlockContent(index, 'code', e.target.value)}
                            placeholder="// Tapez ou collez votre code ici..."
                            className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs font-mono text-emerald-400 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {block.block_type === 'resource' && (
                      <div className="space-y-3">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Liens et références
                        </label>
                        {(block.content?.resources || []).map((res: any, rIdx: number) => (
                          <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                            <input
                              type="text"
                              value={res.title || ''}
                              onChange={(e) => {
                                const nextRes = [...block.content.resources];
                                nextRes[rIdx] = { ...nextRes[rIdx], title: e.target.value };
                                updateBlockContent(index, 'resources', nextRes);
                              }}
                              placeholder="Titre du lien (ex: Doc officielle)"
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                            />
                            <input
                              type="url"
                              value={res.url || ''}
                              onChange={(e) => {
                                const nextRes = [...block.content.resources];
                                nextRes[rIdx] = { ...nextRes[rIdx], url: e.target.value };
                                updateBlockContent(index, 'resources', nextRes);
                              }}
                              placeholder="https://..."
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={res.description || ''}
                                onChange={(e) => {
                                  const nextRes = [...block.content.resources];
                                  nextRes[rIdx] = { ...nextRes[rIdx], description: e.target.value };
                                  updateBlockContent(index, 'resources', nextRes);
                                }}
                                placeholder="Description (optionnel)"
                                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextRes = block.content.resources.filter((_: any, i: number) => i !== rIdx);
                                  updateBlockContent(index, 'resources', nextRes);
                                }}
                                className="text-rose-500 hover:text-rose-700 px-1 text-xs"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextRes = [...(block.content?.resources || []), { title: '', url: '', description: '' }];
                            updateBlockContent(index, 'resources', nextRes);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          + Ajouter un lien
                        </button>
                      </div>
                    )}

                    {block.block_type === 'image' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            URL de l'image *
                          </label>
                          <input
                            type="url"
                            value={block.content?.url || ''}
                            onChange={(e) => updateBlockContent(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Légende
                          </label>
                          <input
                            type="text"
                            value={block.content?.caption || ''}
                            onChange={(e) => updateBlockContent(index, 'caption', e.target.value)}
                            placeholder="Figure 1 : Schéma d'architecture"
                            className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Block Menu Bar */}
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Ajouter un bloc de contenu
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => addBlock('summary')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    Résumé
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('key_points')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Points Clés
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('explanation')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <FileText className="h-4 w-4 text-blue-500" />
                    Explication
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('code_snippet')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Code className="h-4 w-4 text-amber-500" />
                    Snippet Code
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('resource')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Link2 className="h-4 w-4 text-purple-500" />
                    Ressources
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock('image')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <ImageIcon className="h-4 w-4 text-rose-500" />
                    Schéma / Image
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
