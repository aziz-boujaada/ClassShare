export type JudgeCase = { input: string; expected_output: string };

export type JudgeSubmission = {
  token?: string;
  status_id?: number;
  status?: { id?: number; description?: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
};

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

const LANGUAGE_IDS: Record<string, number> = {
  java: 91, // Java (JDK 17.0.6)
  python: 71,
  javascript: 63,
  typescript: 74,
};

export function normalizeJudgeBaseUrl(configuredUrl?: string): string {
  let url: URL;
  try {
    url = new URL(configuredUrl?.trim() || 'https://ce.judge0.com');
  } catch {
    throw new Error('JUDGE0_URL doit pointer vers https://ce.judge0.com.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (url.protocol !== 'https:' || url.hostname !== 'ce.judge0.com' || url.username || url.password || url.hash || (path !== '' && path !== '/submissions')) {
    throw new Error('JUDGE0_URL doit pointer vers https://ce.judge0.com, éventuellement suivi de /submissions.');
  }
  // Discard endpoint paths and query parameters; the submission route is appended once below.
  return url.origin;
}

export function parseExecutionRequest(value: unknown): ExecutionRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.challengeId !== 'string' || typeof body.language !== 'string' ||
      typeof body.sourceCode !== 'string' || typeof body.stdin !== 'string' ||
      (body.mode !== 'run' && body.mode !== 'submit')) return null;
  return {
    challengeId: body.challengeId,
    language: body.language,
    sourceCode: body.sourceCode,
    stdin: body.stdin,
    mode: body.mode,
  };
}

export function hasAuthenticatedSession(authorization: string | null, user: unknown, authError: unknown): boolean {
  return Boolean(authorization && user && !authError);
}

export function getJudgeLanguageId(language: string, configured?: string): number {
  if (configured) {
    let ids: Record<string, unknown>;
    try {
      ids = JSON.parse(configured);
    } catch {
      throw new Error('JUDGE0_LANGUAGE_IDS doit être un objet JSON avec les identifiants des langages.');
    }
    const id = Number(ids[language]);
    if (Number.isInteger(id) && id > 0) return id;
  }
  const id = LANGUAGE_IDS[language];
  if (!id) throw new Error(`Le sandbox configuré ne prend pas en charge ${language}.`);
  return id;
}

export function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[\t ]+$/gm, '').trim();
}

export function submissionPayload(languageId: number, sourceCode: string, stdin: string) {
  const isJava = languageId === LANGUAGE_IDS.java;
  return {
    language_id: languageId,
    source_code: sourceCode,
    stdin,
    cpu_time_limit: 2,
    cpu_extra_time: 0.5,
    wall_time_limit: 5,
    // A HotSpot JVM needs more native address space than most small scripts,
    // before user heap allocations are counted. Keep this bounded at 256 MB.
    memory_limit: isJava ? 256_000 : 128_000,
    stack_limit: 64_000,
    // Leave room for JVM service/compiler/GC threads without allowing an
    // unbounded thread fan-out. 60 is Judge0 CE's documented default.
    max_processes_and_or_threads: isJava ? 60 : 20,
    max_file_size: 1_024,
    enable_network: false,
    redirect_stderr_to_stdout: false,
  };
}

function redactSubmittedText(value: string, sourceCode: string, stdin: string): string {
  let safe = value;
  for (const submitted of [sourceCode, stdin]) {
    if (submitted) safe = safe.replaceAll(submitted, '[redacted]');
  }
  return safe.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
}

export async function readJudgeResponse(response: Response, hostname: string, sourceCode: string, stdin: string): Promise<unknown> {
  const text = await response.text();
  let diagnosticBody = '';
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (response.ok) {
      const status = parsed.status && typeof parsed.status === 'object' ? parsed.status as Record<string, unknown> : {};
      diagnosticBody = JSON.stringify({ status: status.id ?? parsed.status_id, description: status.description, time: parsed.time, memory: parsed.memory });
    } else {
      const error = typeof parsed.error === 'string' ? parsed.error : typeof parsed.message === 'string' ? parsed.message : parsed.errors ? JSON.stringify(parsed.errors) : '';
      diagnosticBody = redactSubmittedText(error, sourceCode, stdin);
    }
  } catch {
    diagnosticBody = response.ok ? '[unparseable response body omitted]' : redactSubmittedText(text, sourceCode, stdin);
  }
  console.info('Judge0 response', { hostname, status: response.status, body: diagnosticBody });
  if (!response.ok) {
    const detail = redactSubmittedText(diagnosticBody, sourceCode, stdin).slice(0, 240);
    throw new Error(`Judge0 HTTP ${response.status}${detail ? `: ${detail}` : response.status === 429 ? ': quota temporaire atteinte' : ': soumission refusée'}`);
  }
  try { return JSON.parse(text); } catch { throw new Error('Le sandbox a renvoyé une réponse illisible.'); }
}

export async function runJudge0Batch(
  baseUrl: string,
  languageId: number,
  sourceCode: string,
  testCases: JudgeCase[],
  fetcher: typeof fetch = fetch,
): Promise<JudgeSubmission[]> {
  const results: JudgeSubmission[] = new Array(testCases.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < testCases.length) {
      const index = nextIndex++;
      const submitUrl = new URL('/submissions/', baseUrl);
      submitUrl.searchParams.set('base64_encoded', 'false');
      submitUrl.searchParams.set('wait', 'true');
      console.info('Judge0 request', { hostname: submitUrl.hostname, method: 'POST', pathname: submitUrl.pathname });
      const response = await fetcher(submitUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload(languageId, sourceCode, testCases[index].input)),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      const payload = await readJudgeResponse(response, submitUrl.hostname, sourceCode, testCases[index].input) as JudgeSubmission | null;
      const statusId = payload?.status_id ?? payload?.status?.id;
      if (!payload || typeof payload !== 'object' || typeof statusId !== 'number') {
        throw new Error('Le sandbox a renvoyé un résultat de soumission malformé.');
      }
      results[index] = { ...payload, status_id: statusId };
    }
  };
  // A single invocation can otherwise start three JVMs at once. Keep Java
  // submissions serial per request; other lighter runtimes remain bounded at 3.
  const concurrency = languageId === LANGUAGE_IDS.java ? 1 : 3;
  await Promise.all(Array.from({ length: Math.min(concurrency, testCases.length) }, worker));
  return results;
}

function diagnostics(result: JudgeSubmission): string {
  return [result.compile_output, result.stderr]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join('\n')
    .slice(0, 4_000);
}

export function mapJudgeResult(results: JudgeSubmission[], testCases: JudgeCase[], mode: 'run' | 'submit'): ExecutionResult {
  const compileError = results.find((result) => result.status_id === 6);
  if (compileError) return { status: 'compile_error', stdout: '', stderr: diagnostics(compileError) };
  const timeLimit = results.find((result) => result.status_id === 5);
  if (timeLimit) return { status: 'time_limit', stdout: '', stderr: 'Le code a dépassé la limite de temps autorisée.' };
  const internalError = results.find((result) => result.status_id === 13);
  if (internalError) {
    return {
      status: 'service_error', stdout: '',
      stderr: String(internalError.message || diagnostics(internalError) || 'Erreur interne du sandbox.').slice(0, 4_000),
    };
  }
  const runtimeError = results.find((result) => result.status_id !== 3);
  if (runtimeError) {
    const label = runtimeError.status_id === 11 ? 'Erreur d’exécution interne au sandbox.' : 'Le programme a terminé avec une erreur.';
    return {
      status: 'runtime_error',
      stdout: (runtimeError.stdout || '').slice(0, 4_000),
      stderr: (diagnostics(runtimeError) || label).slice(0, 4_000),
    };
  }
  const outputs = results.map((result) => typeof result.stdout === 'string' ? result.stdout : '');
  // Judge0 reports stdout, stderr and compiler output separately. Only stdout
  // participates in the answer comparison; diagnostics remain visible on stderr.
  const stderr = results.map(diagnostics).filter(Boolean).join('\n').slice(0, 4_000);
  const passing = results.reduce((count, result, index) => count + (normalizeOutput(outputs[index]) === normalizeOutput(testCases[index].expected_output) ? 1 : 0), 0);
  const failed = results.length - passing;
  const executionTimeMs = Math.round(Math.max(...results.map((result) => Number(result.time || 0))) * 1000);
  const memoryUsedKb = Math.max(...results.map((result) => Number(result.memory || 0)));
  if (mode === 'submit') {
    return {
      status: failed ? 'wrong_answer' : 'success',
      stdout: failed ? `${passing}/${results.length} tests passed.` : 'All tests passed.',
      stderr, passedTests: passing, failedTests: failed, executionTimeMs, memoryUsedKb,
    };
  }
  return {
    status: 'success',
    stdout: outputs.map((output, index) => `Test ${index + 1}:\n${output}`).join('\n\n').slice(0, 8_000),
    stderr, executionTimeMs, memoryUsedKb,
  };
}
