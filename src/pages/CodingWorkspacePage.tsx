import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Check, Clipboard, Download, Lightbulb, Play, RotateCcw, Send, ShieldCheck, Terminal } from 'lucide-react';
import { api } from '../services/api.ts';
import { executeCode, type ExecutionResult } from '../services/codeExecution.ts';
import type { CodingChallenge } from '../types/index.ts';

export const CodingWorkspacePage: React.FC = () => {
  const { challengeId } = useParams<{ challengeId: string }>();
  const [challenge, setChallenge] = useState<CodingChallenge | null>(null);
  const [sourceCode, setSourceCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState<'ready' | 'saving' | 'saved' | 'error'>('ready');
  const [copied, setCopied] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [executionError, setExecutionError] = useState('');
  const [participationError, setParticipationError] = useState('');
  const [executing, setExecuting] = useState(false);
  const [darkTheme, setDarkTheme] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => setDarkTheme(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!challengeId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const item = await api.getCodingChallenge(challengeId);
        if (!item) throw new Error('Ce défi est introuvable ou n’est pas accessible.');
        try {
          await api.enrollInCodingChallenge(item.id);
        } catch {
          if (active) setParticipationError('Votre participation n’a pas pu être enregistrée. Rechargez la page pour réessayer.');
        }
        const draft = await api.getCodingDraft(challengeId).catch(() => null);
        if (active) {
          setChallenge(item);
          setSourceCode(draft ?? item.starter_code);
          setStdin(item.examples[0]?.input ?? item.public_test_cases[0]?.input ?? '');
          setDraftStatus(draft === null ? 'ready' : 'saved');
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger ce défi.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [challengeId]);

  useEffect(() => {
    if (!challenge) return;
    const timer = window.setTimeout(async () => {
      setDraftStatus('saving');
      try {
        await api.saveCodingDraft(challenge.id, sourceCode);
        setDraftStatus('saved');
      } catch {
        setDraftStatus('error');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [challenge, sourceCode]);

  const handleReset = () => {
    if (!challenge) return;
    setSourceCode(challenge.starter_code);
    setExecution(null);
    setExecutionError('');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sourceCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Impossible d’accéder au presse-papiers dans ce navigateur.');
    }
  };

  const handleDownload = () => {
    if (!challenge) return;
    const extensions: Record<string, string> = { java: 'java', python: 'py', typescript: 'ts', javascript: 'js', sql: 'sql' };
    const extension = extensions[challenge.language] || 'txt';
    const blob = new Blob([sourceCode], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = challenge.language === 'java' ? 'Main.java' : `solution.${extension}`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleExecute = async (mode: 'run' | 'submit') => {
    if (!challenge) return;
    setExecuting(true);
    setExecution(null);
    setExecutionError('');
    try {
      setExecution(await executeCode({ challengeId: challenge.id, language: challenge.language, sourceCode, stdin, mode }));
    } catch (cause) {
      setExecutionError(cause instanceof Error ? cause.message : 'Le service d’exécution est indisponible.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <main className="mx-auto min-h-[60vh] max-w-7xl animate-pulse px-4 py-10"><div className="h-10 w-2/3 rounded-xl bg-slate-200 dark:bg-slate-800" /><div className="mt-6 h-[60vh] rounded-2xl bg-slate-200 dark:bg-slate-800" /></main>;
  }

  if (error || !challenge) {
    return <main className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-xl font-bold text-slate-900 dark:text-white">Défi indisponible</h1><p className="mt-2 text-sm text-rose-600">{error || 'Ce défi est introuvable.'}</p><Link to="/presentations" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><ArrowLeft className="h-4 w-4" /> Retour aux présentations</Link></main>;
  }

  const visibleHints = challenge.hints.slice(0, hintCount);
  const homePath = challenge.presentation_slug ? `/presentations/${challenge.presentation_slug}` : '/presentations';
  const executionLabel: Record<ExecutionResult['status'], string> = {
    success: 'Exécution terminée',
    wrong_answer: 'Certains tests échouent',
    compile_error: 'Erreur de compilation',
    runtime_error: 'Erreur à l’exécution',
    time_limit: 'Limite de temps atteinte',
    service_error: 'Erreur du service d’exécution',
  };
  // Hide successful-run diagnostics (including JVM startup warnings) from the
  // user-facing output. Keep stderr visible for failed executions.
  const executionOutput = execution && (execution.status === 'success' || execution.status === 'wrong_answer')
    ? execution.stdout
    : execution?.stderr || execution?.stdout;

  return (
    <main className="min-h-screen bg-slate-50 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-[1600px] space-y-5 px-3 sm:px-5 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={homePath} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"><ArrowLeft className="h-3.5 w-3.5" /> Retour à la présentation</Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">{challenge.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{challenge.language}</span>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-300">{challenge.difficulty}</span>
              <span className="text-slate-500">{challenge.runtime}</span>
              <span className={`ml-auto text-[11px] ${draftStatus === 'error' ? 'text-rose-600' : draftStatus === 'saving' ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>{draftStatus === 'saving' ? 'Enregistrement…' : draftStatus === 'error' ? 'Brouillon non enregistré' : draftStatus === 'ready' ? 'Prêt à coder' : 'Brouillon enregistré'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</button>
            <button type="button" onClick={() => void handleExecute('run')} disabled={executing} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"><Play className="h-3.5 w-3.5" /> Exécuter</button>
            <button type="button" onClick={() => void handleExecute('submit')} disabled={executing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"><Send className="h-3.5 w-3.5" /> Soumettre</button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,2fr)]">
          <aside className="order-last max-h-[calc(100vh-150px)] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:order-first">
            <section><p className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Énoncé</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{challenge.problem}</p></section>
            <section><h2 className="text-sm font-bold text-slate-900 dark:text-white">Concepts du cours</h2><div className="mt-2 flex flex-wrap gap-1.5">{challenge.concepts.map((concept) => <span key={concept} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{concept}</span>)}</div></section>
            <section><h2 className="text-sm font-bold text-slate-900 dark:text-white">Exigences</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600 dark:text-slate-300">{challenge.requirements.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
            {challenge.constraints.length > 0 && <section><h2 className="text-sm font-bold text-slate-900 dark:text-white">Contraintes</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600 dark:text-slate-300">{challenge.constraints.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
            {challenge.examples.length > 0 && <section><h2 className="text-sm font-bold text-slate-900 dark:text-white">Exemples</h2><div className="mt-2 space-y-2">{challenge.examples.map((example, i) => <div key={i} className="rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-200"><div className="mb-1 text-slate-500">Entrée</div><pre className="whitespace-pre-wrap">{example.input}</pre><div className="mb-1 mt-2 text-slate-500">Sortie attendue</div><pre className="whitespace-pre-wrap">{example.expected_output}</pre></div>)}</div></section>}
            {challenge.public_test_cases.length > 0 && <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><summary className="cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">Tests publics ({challenge.public_test_cases.length})</summary><div className="mt-3 space-y-2">{challenge.public_test_cases.map((testCase, i) => <div key={i} className="rounded-lg bg-slate-950 p-2.5 font-mono text-[10px] text-slate-300"><span className="text-slate-500">Entrée</span><pre className="whitespace-pre-wrap">{testCase.input}</pre><span className="mt-2 block text-slate-500">Sortie attendue</span><pre className="whitespace-pre-wrap">{testCase.expected_output}</pre></div>)}</div></details>}
            <section><h2 className="text-sm font-bold text-slate-900 dark:text-white">Évaluation</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600 dark:text-slate-300">{challenge.evaluation_criteria.map((item, i) => <li key={i}>{item}</li>)}</ul></section>
            <section className="border-t border-slate-100 pt-4 dark:border-slate-800"><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" /> Indices</h2><button type="button" onClick={() => setHintCount((count) => Math.min(challenge.hints.length, count + 1))} disabled={hintCount >= challenge.hints.length} className="text-xs font-bold text-indigo-600 disabled:text-slate-400 dark:text-indigo-400">{hintCount >= challenge.hints.length ? 'Tous révélés' : 'Obtenir un indice'}</button></div><ol className="mt-2 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{visibleHints.map((hint, i) => <li key={i} className="rounded-lg bg-amber-50 p-2.5 dark:bg-amber-950/30"><span className="mr-1 font-bold text-amber-700 dark:text-amber-400">{i + 1}.</span>{hint}</li>)}</ol></section>
            <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500 dark:bg-slate-950"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />La solution de référence et les tests cachés restent côté serveur.</p>
          </aside>

            <section className="order-first min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:order-last">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800"><div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {challenge.language === 'java' ? 'Main.java' : `solution.${challenge.language === 'python' ? 'py' : challenge.language === 'typescript' ? 'ts' : challenge.language === 'javascript' ? 'js' : 'sql'}`}</div><div className="flex gap-1.5"><button type="button" onClick={() => void handleCopy()} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copié' : 'Copier'}</button><button type="button" onClick={handleDownload} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Download className="h-3.5 w-3.5" /> Télécharger</button></div></div>
            <Editor height="min(62vh, 680px)" loading={<div className="flex h-[min(62vh,680px)] items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">Chargement de l’éditeur…</div>} language={challenge.language} theme={darkTheme ? 'vs-dark' : 'light'} value={sourceCode} onChange={(value) => setSourceCode(value || '')} options={{ automaticLayout: true, minimap: { enabled: false }, lineNumbers: 'on', tabSize: 4, insertSpaces: true, wordWrap: 'on', scrollBeyondLastLine: false, fontSize: 14, fontFamily: "'JetBrains Mono', ui-monospace, monospace", padding: { top: 16 }, formatOnPaste: true, formatOnType: challenge.language === 'javascript' || challenge.language === 'typescript', suggestOnTriggerCharacters: true, quickSuggestions: true, readOnly: false, ariaLabel: 'Éditeur de code du défi' }} />
            <div className="border-t border-slate-200 dark:border-slate-800"><div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800"><Terminal className="h-3.5 w-3.5" /> Console et résultats</div><div className="grid gap-3 border-b border-slate-800 bg-slate-950 p-4 sm:grid-cols-2"><label className="text-[11px] font-semibold text-slate-400">Entrée standard<textarea value={stdin} onChange={(event) => setStdin(event.target.value)} maxLength={4096} rows={3} placeholder="Saisissez stdin ici…" className="mt-1.5 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 p-2.5 font-mono text-xs text-slate-200 outline-none focus:border-indigo-500" /></label><div aria-live="polite" className="min-h-28 space-y-2 font-mono text-xs text-slate-300">{executing && <p className="flex items-center gap-2 text-indigo-300"><ShieldCheck className="h-3.5 w-3.5 animate-pulse" />Exécution isolée en cours…</p>}{execution && <p className={`font-bold ${execution.status === 'success' ? 'text-emerald-300' : execution.status === 'wrong_answer' ? 'text-amber-300' : 'text-rose-300'}`}>{executionLabel[execution.status]}</p>}{participationError && <p className="text-amber-300">{participationError}</p>}{execution?.pointsMessage && <p className="font-bold text-amber-300">{execution.pointsMessage}</p>}<p className="whitespace-pre-wrap text-slate-400">{executionError || executionOutput || 'Les sorties du programme et le résultat des tests apparaîtront ici.'}</p>{execution && (execution.passedTests !== undefined || execution.failedTests !== undefined) && <p>{execution.passedTests ?? 0} tests réussis · {execution.failedTests ?? 0} échoués{execution.executionTimeMs !== undefined ? ` · ${execution.executionTimeMs} ms` : ''}{execution.memoryUsedKb !== undefined ? ` · ${execution.memoryUsedKb} Ko` : ''}</p>}</div></div></div>
          </section>
        </div>
      </div>
    </main>
  );
};
