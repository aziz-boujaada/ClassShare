import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, FileText, Link2, LoaderCircle, Sparkles, UploadCloud, X } from 'lucide-react';
import { api } from '../services/api.ts';
import { requireSupabase, supabasePublishableKey, supabaseUrl } from '../lib/supabase.ts';
import { SUBJECT_CATEGORIES } from '../services/mockData.ts';
import type { BlockType, Presentation, Profile } from '../types/index.ts';
import type { CodingChallenge } from '../types/index.ts';

type InputMode = 'url' | 'pdf' | 'notes' | 'existing';
type Stage = 'import' | 'analysis' | 'concepts' | 'generation' | 'preview';
type GeneratedBlock = { block_type: BlockType; title: string | null; content: unknown; position: number };
type GeneratedChallenge = Omit<CodingChallenge, 'id' | 'author_id' | 'presentation_id' | 'created_at'>;
type GeneratedPresentation = { title: string; description: string; subject: string; tags: string[]; blocks: GeneratedBlock[]; challenge_id: string | null; challenge: GeneratedChallenge | null };
type ChallengePresentationOption = Pick<Presentation, 'id' | 'title' | 'subject' | 'status' | 'updated_at'> & {
  author: Pick<Profile, 'full_name' | 'username'> | null;
  blocks: Array<Pick<NonNullable<Presentation['blocks']>[number], 'title' | 'position'>>;
};

const stages: { id: Stage; label: string }[] = [
  { id: 'import', label: 'Importation du contenu' },
  { id: 'analysis', label: 'Analyse du support' },
  { id: 'concepts', label: 'Extraction des concepts importants' },
  { id: 'generation', label: 'Génération de la présentation' },
  { id: 'preview', label: "Préparation de l'aperçu" },
];

const stageOrder: Stage[] = stages.map(({ id }) => id);

export const AiGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>('notes');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState('');
  const [language, setLanguage] = useState('Français');
  const [sectionCount, setSectionCount] = useState('6');
  const [instructions, setInstructions] = useState('');
  const [challengeLanguage, setChallengeLanguage] = useState('auto');
  const [presentations, setPresentations] = useState<ChallengePresentationOption[]>([]);
  const [presentationsLoading, setPresentationsLoading] = useState(false);
  const [presentationLoadError, setPresentationLoadError] = useState('');
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'existing') return;
    let active = true;
    setPresentationsLoading(true);
    setPresentationLoadError('');
    void api.getPresentationsForChallenge().then((items) => {
      if (!active) return;
      setPresentations(items);
      setSelectedPresentationId((selected) => items.some((item) => item.id === selected) ? selected : items[0]?.id || '');
    }).catch((cause) => {
      if (active) setPresentationLoadError(cause instanceof Error ? cause.message : 'Impossible de charger vos présentations.');
    }).finally(() => {
      if (active) setPresentationsLoading(false);
    });
    return () => { active = false; };
  }, [mode]);

  const runGeneration = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (mode === 'notes' && !notes.trim()) return setError('Collez vos notes pour commencer.');
    if (mode === 'url' && !url.trim()) return setError('Ajoutez un lien de présentation.');
    if (mode === 'pdf' && !file) return setError('Choisissez un fichier PDF.');
    if (mode === 'existing' && !selectedPresentationId) return setError('Choisissez une présentation disponible.');
    if (file && file.size > 30 * 1024 * 1024) return setError('Le PDF dépasse la limite de 30 Mo.');

    setLoading(true);
    setStage(null);
    try {
      const client = requireSupabase();
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError || !session) throw new Error('Votre session a expiré. Connectez-vous puis réessayez.');

      const body = new FormData();
      body.set('mode', mode === 'existing' ? 'challenge' : mode);
      body.set('outputType', mode === 'existing' ? 'challenge' : 'presentation');
      body.set('subject', subject);
      body.set('audience', audience);
      body.set('language', language);
      body.set('sectionCount', sectionCount);
      body.set('instructions', instructions);
      if (mode === 'existing') {
        body.set('presentationId', selectedPresentationId);
        body.set('challengeLanguage', challengeLanguage);
      }
      if (mode === 'url') body.set('url', url.trim());
      if (mode === 'notes') body.set('notes', notes.trim());
      if (mode === 'pdf' && file) body.set('file', file, file.name);

      const functionUrl = new URL('/functions/v1/generate-presentation', `${supabaseUrl.replace(/\/+$/, '')}/`);
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { apikey: supabasePublishableKey, Authorization: `Bearer ${session.access_token}`, Accept: 'text/event-stream' },
        body,
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Le service de génération a répondu (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let generated: GeneratedPresentation | null = null;
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';
        for (const message of messages) {
          const dataLine = message.split('\n').find((line) => line.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6));
          if (payload.stage) setStage(payload.stage as Stage);
          if (payload.error) throw new Error(payload.error);
          if (payload.result) generated = payload.result as GeneratedPresentation;
        }
        if (done) break;
      }
      if (!generated) throw new Error("La génération n'a pas retourné de présentation. Réessayez.");
      if (mode === 'existing') {
        if (!generated.challenge_id) throw new Error('Le service n’a pas retourné le défi généré. Réessayez.');
        navigate(`/challenges/${generated.challenge_id}`, { replace: true });
        return;
      }
      if (generated.challenge_id) throw new Error('Le service a retourné un défi au lieu de respecter votre choix de présentation. Réessayez.');
      if (!generated.title?.trim() || !Array.isArray(generated.blocks) || generated.blocks.length === 0) {
        throw new Error('Le service n’a pas retourné une présentation complète. Réessayez.');
      }
      const saved = await api.createPresentation({
        title: generated.title,
        description: generated.description,
        subject: subject || SUBJECT_CATEGORIES.find((item) => item.toLocaleLowerCase() === generated.subject?.toLocaleLowerCase()) || SUBJECT_CATEGORIES[0],
        tags: generated.tags || [],
        presentation_date: null,
        original_url: mode === 'url' ? url.trim() : null,
        cover_image_url: null,
        status: 'draft',
        author_id: '',
      }, generated.blocks);
      navigate(`/presentations/${saved.id}/edit`, { replace: true });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Une erreur est survenue pendant la génération.';
      setError(message.includes('Failed to fetch')
        ? "Le service Supabase n'a pas répondu. Vérifiez que la fonction « generate-presentation » est déployée sur le même projet que VITE_SUPABASE_URL et que son origine CORS correspond au domaine de l'application."
        : message);
    } finally {
      setLoading(false);
      setStage(null);
    }
  };

  const activeStages = mode === 'existing'
    ? [{ id: 'import' as Stage, label: 'Lecture de la présentation' }, { id: 'generation' as Stage, label: 'Génération du défi' }, stages[4]]
    : stages;
  const currentStageIndex = stage ? activeStages.findIndex((item) => item.id === stage) : -1;
  const modeClass = (selected: boolean) => `flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${selected ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`;
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-950';

  return (
    <main className="min-h-screen bg-slate-50 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-4 w-4" /> Tableau de bord</Link>
        <div className="mb-8">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><Sparkles className="h-3.5 w-3.5" /> Assistant pédagogique</span>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">Générer avec l'IA</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Transformez vos cours en une présentation structurée, puis relisez-la et modifiez-la avant publication.</p>
        </div>

        {loading ? (
          <section aria-live="polite" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="mb-6 flex items-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin text-indigo-600" /><div><h2 className="font-bold text-slate-900 dark:text-white">{mode === 'existing' ? 'Création de votre défi de code' : 'Création de votre présentation'}</h2><p className="text-sm text-slate-500">Étapes reçues du service de traitement</p></div></div>
            <ol className="space-y-3">{activeStages.map((item, index) => <li key={item.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${index === currentStageIndex ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : index < currentStageIndex ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">{index < currentStageIndex ? '✓' : index + 1}</span>{item.label}</li>)}</ol>
            <p className="mt-5 text-xs text-slate-500">La durée dépend du document et du service IA. Aucun pourcentage estimé n'est affiché.</p>
          </section>
        ) : (
          <form onSubmit={runGeneration} className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">1. Choisissez votre source</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" className={modeClass(mode === 'url')} onClick={() => setMode('url')}><Link2 className="h-4 w-4" /> Importer depuis un lien</button>
                <button type="button" className={modeClass(mode === 'pdf')} onClick={() => setMode('pdf')}><UploadCloud className="h-4 w-4" /> Importer un PDF</button>
                <button type="button" className={modeClass(mode === 'notes')} onClick={() => setMode('notes')}><FileText className="h-4 w-4" /> Coller mes notes</button>
                <button type="button" className={modeClass(mode === 'existing')} onClick={() => setMode('existing')}><Code2 className="h-4 w-4" /> Créer un défi de code</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Le choix du contenu détermine le résultat : les notes, liens et PDF créent une présentation; le mode défi crée uniquement un défi à partir de la présentation sélectionnée.</p>
              <div className="mt-5">
                {mode === 'url' && <div><label htmlFor="source-url" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Lien public Google Slides ou Canva</label><input id="source-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/presentation/d/..." className={inputClass} type="url" /><p className="mt-2 text-xs leading-5 text-slate-500">Les présentations Google Slides publiques accessibles via leur export PDF sont prises en charge. Les liens Canva nécessitant une autorisation ne peuvent pas être lus ici : exportez-les en PDF puis importez le fichier.</p></div>}
                {mode === 'pdf' && <div><label htmlFor="source-pdf" className="sr-only">Sélectionner un fichier PDF</label><input ref={fileInput} id="source-pdf" type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /><button type="button" onClick={() => fileInput.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const dropped = e.dataTransfer.files[0]; if (dropped) setFile(dropped); }} className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-950"><UploadCloud className="mb-2 h-8 w-8 text-indigo-500" /><span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Déposez un PDF ici ou parcourez vos fichiers</span><span className="mt-1 text-xs text-slate-500">PDF, 30 Mo maximum, 50 pages par défaut (80 maximum)</span></button>{file && <div className="mt-3 flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200"><span className="truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} Mo</span><button type="button" aria-label="Retirer le PDF" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }}><X className="h-4 w-4" /></button></div>}</div>}
                {mode === 'notes' && <div><label htmlFor="source-notes" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Notes, cours ou explications</label><textarea id="source-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={10} maxLength={60000} placeholder="Collez votre contenu ici. L'IA organisera les idées sans ajouter de faits non étayés…" className={inputClass + ' resize-y'} /><p className="mt-1 text-right text-xs text-slate-400">{notes.length.toLocaleString('fr-FR')} / 60 000</p></div>}
                {mode === 'existing' && <div><label htmlFor="existing-presentation" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">Présentation source</label><select id="existing-presentation" value={selectedPresentationId} onChange={(e) => setSelectedPresentationId(e.target.value)} disabled={presentationsLoading || presentations.length === 0} className={inputClass}><option value="">{presentationsLoading ? 'Chargement…' : presentations.length ? 'Choisissez une présentation' : 'Aucune présentation disponible'}</option>{presentations.map((presentation) => <option key={presentation.id} value={presentation.id}>{presentation.title} · {presentation.subject} · @{presentation.author?.username || 'étudiant'} · {presentation.status === 'draft' ? 'Brouillon' : 'Publiée'}</option>)}</select>{presentationLoadError && <p role="alert" className="mt-2 text-xs text-rose-600">{presentationLoadError}</p>}<p className="mt-2 text-xs text-slate-500">Les présentations publiées de la communauté et vos brouillons sont disponibles. Le défi sera lié à la présentation sélectionnée.</p></div>}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">{mode === 'existing' ? '2. Personnalisez le défi' : '2. Personnalisez la présentation'} <span className="font-normal text-slate-400">(facultatif)</span></h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {mode === 'existing' ? <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Langage de programmation<select value={challengeLanguage} onChange={(e) => setChallengeLanguage(e.target.value)} className={`${inputClass} mt-2`}><option value="auto">Choisir selon le cours</option><option value="java">Java</option><option value="python">Python</option><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="sql">SQL</option></select></label> : <>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Matière<select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} mt-2`}><option value="">Déduire du contenu</option>{SUBJECT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Niveau / public<input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Ex. Licence 2, lycée…" className={`${inputClass} mt-2`} maxLength={120} /></label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Langue<select value={language} onChange={(e) => setLanguage(e.target.value)} className={`${inputClass} mt-2`}><option>Français</option><option>English</option><option>العربية</option></select></label>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre de sections<select value={sectionCount} onChange={(e) => setSectionCount(e.target.value)} className={`${inputClass} mt-2`}>{[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n} sections</option>)}</select></label>
                </>}
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Consignes complémentaires<textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} maxLength={1000} className={`${inputClass} mt-2 resize-y`} placeholder="Ex. Insister sur les définitions et ajouter un exercice de révision." /></label>
              </div>
            </section>
            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}{mode === 'url' && /Canva|lien|URL|export|public/i.test(error) && <p className="mt-2"><button type="button" onClick={() => setMode('pdf')} className="font-bold underline">Importer plutôt un PDF</button></p>}</div>}
            <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row"><Link to="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700">Annuler</Link><button type="submit" disabled={mode === 'existing' && (presentationsLoading || !selectedPresentationId)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" /> {mode === 'existing' ? 'Générer le défi de code' : 'Générer ma présentation'}</button></div>
          </form>
        )}
      </div>
    </main>
  );
};
