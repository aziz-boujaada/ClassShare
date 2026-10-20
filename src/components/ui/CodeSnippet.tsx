import React, { useState, useEffect, useRef } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';

interface CodeSnippetProps {
  language: string;
  code: string;
  title?: string | null;
  explanation?: string;
}

export const CodeSnippet: React.FC<CodeSnippetProps> = ({
  language,
  code,
  title,
  explanation,
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) Prism.highlightElement(codeRef.current);
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const normalizedLang = (language || 'typescript').toLowerCase();

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-md">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">
            {title || `Extrait de code (${normalizedLang})`}
          </span>
          <span className="rounded bg-indigo-950/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-indigo-300 border border-indigo-800/50">
            {normalizedLang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          aria-label="Copier le code"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <div className="p-4 overflow-x-auto text-sm font-mono leading-relaxed bg-slate-900 text-slate-100">
        <pre className="!m-0 !p-0 !bg-transparent">
          <code ref={codeRef} className={`language-${normalizedLang}`}>{code.trim()}</code>
        </pre>
      </div>

      {/* Optional Explanation footer */}
      {explanation && (
        <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-400 flex items-start gap-2">
          <span className="font-medium text-indigo-400 shrink-0">💡 Note :</span>
          <span>{explanation}</span>
        </div>
      )}
    </div>
  );
};
