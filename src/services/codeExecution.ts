import { requireSupabase } from '../lib/supabase.ts';

export type ExecutionRequest = {
  challengeId: string;
  language: string;
  sourceCode: string;
  stdin: string;
  mode: 'run' | 'submit';
};

export type ExecutionResult = {
  status: 'success' | 'wrong_answer' | 'compile_error' | 'runtime_error' | 'time_limit' | 'service_error';
  stdout: string;
  stderr: string;
  passedTests?: number;
  failedTests?: number;
  executionTimeMs?: number;
  memoryUsedKb?: number;
  pointsAwarded?: number;
  pointsMessage?: string;
};

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const { data, error } = await requireSupabase().functions.invoke('execute-code', { body: request });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      const payload = await context.json().catch(() => null) as { error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
    }
    throw new Error(error.message || 'Le service d’exécution est indisponible.');
  }
  if (!data || typeof data.status !== 'string') throw new Error('Le service d’exécution a renvoyé une réponse invalide.');
  return data as ExecutionResult;
}
