import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getJudgeLanguageId,
  hasAuthenticatedSession,
  mapJudgeResult,
  normalizeJudgeBaseUrl,
  parseExecutionRequest,
  readJudgeResponse,
  runJudge0Batch,
  submissionPayload,
  type JudgeCase,
} from './judge0.ts';

const cases: JudgeCase[] = [{ input: '4 5\n', expected_output: '9\n' }];

function fakeFetch(result: Record<string, unknown>, options: { malformed?: boolean; httpError?: boolean } = {}): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(init?.method, 'POST');
    assert.match(url.pathname, /submissions\/$/);
    assert.equal(url.searchParams.get('base64_encoded'), 'false');
    assert.equal(url.searchParams.get('wait'), 'true');
    if (options.httpError) return new Response(JSON.stringify({ error: 'queue is full' }), { status: 503 });
    const body = JSON.parse(String(init?.body));
    assert.equal(body.language_id, 91);
    assert.equal(typeof body.source_code, 'string');
    assert.equal(body.stdin, '4 5\n');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('content-type'), 'application/json');
    assert.deepEqual([...headers.keys()], ['content-type']);
    assert.equal(headers.has('x-auth-token'), false);
    assert.equal(headers.has('x-rapidapi-key'), false);
    return new Response(options.malformed ? '{bad' : JSON.stringify(result), { status: 201 });
  };
}

test('Java 17 uses language_id 91 and carries source code and stdin to Judge0', async () => {
  const request = {
    challengeId: '1f0f5425-0cf9-4ed0-b978-b652f2949cfe', language: 'java',
    sourceCode: 'public class Main { public static void main(String[] args) {} }', stdin: '4 5\n', mode: 'run',
  };
  assert.deepEqual(parseExecutionRequest(request), request);
  assert.equal(getJudgeLanguageId('java'), 91);
  assert.deepEqual(submissionPayload(91, request.sourceCode, request.stdin), {
    language_id: 91, source_code: request.sourceCode, stdin: request.stdin,
    cpu_time_limit: 2, cpu_extra_time: 0.5, wall_time_limit: 5, memory_limit: 256_000,
    stack_limit: 64_000, max_processes_and_or_threads: 60, max_file_size: 1_024, enable_network: false,
    redirect_stderr_to_stdout: false,
  });
  const results = await runJudge0Batch('https://ce.judge0.com', 91, request.sourceCode, cases, fakeFetch({ status: { id: 3, description: 'Accepted' }, stdout: '9\n', time: '0.02', memory: 12_000 }));
  assert.equal(mapJudgeResult(results, cases, 'submit').status, 'success');
  assert.equal(mapJudgeResult(results, cases, 'run').stdout, 'Test 1:\n9\n');
});

test('maps compilation and runtime errors returned by Judge0', async () => {
  const source = 'public class Main {}';
  const compile = await runJudge0Batch('https://ce.judge0.com', 91, source, cases, fakeFetch({ status: { id: 6, description: 'Compilation Error' }, compile_output: 'Compilation failed' }));
  assert.equal(mapJudgeResult(compile, cases, 'run').status, 'compile_error');

  const runtime = await runJudge0Batch('https://ce.judge0.com', 91, source, cases, fakeFetch({ status: { id: 11, description: 'Runtime Error (NZEC)' }, stderr: 'ArithmeticException' }));
  const mapped = mapJudgeResult(runtime, cases, 'run');
  assert.equal(mapped.status, 'runtime_error');
  assert.equal(mapped.stderr, 'ArithmeticException');
});

test('keeps Java stdout clean and captures JVM warnings separately from answer comparison', async () => {
  const source = 'public class Main { public static void main(String[] args) { System.out.println("9"); } }';
  const javaCases = [
    { input: '', expected_output: '9\n' },
    { input: 'another test', expected_output: '9' },
  ];
  const results = await runJudge0Batch('https://ce.judge0.com', 91, source, javaCases, async () => new Response(JSON.stringify({
    status: { id: 3, description: 'Accepted' }, stdout: '9\n',
    stderr: '[warning][os,thread] pthread_create failed (EAGAIN)',
    compile_output: 'Note: Main.java uses unchecked operations.',
  }), { status: 201 }));
  const submitted = mapJudgeResult(results, javaCases, 'submit');
  assert.equal(submitted.status, 'success');
  assert.equal(submitted.passedTests, 2);
  assert.match(submitted.stderr, /pthread_create failed/);
  assert.match(submitted.stderr, /unchecked operations/);
  assert.doesNotMatch(submitted.stdout, /pthread_create/);

  const wrong = mapJudgeResult([{ status_id: 3, stdout: '8\n', stderr: 'JVM warning' }], [javaCases[0]], 'submit');
  assert.equal(wrong.status, 'wrong_answer');
  assert.equal(wrong.passedTests, 0);
  assert.equal(wrong.stderr, 'JVM warning');
});

test('reports resource exhaustion as a runtime error and provider internal errors as service errors', () => {
  const exhausted = mapJudgeResult([{
    status_id: 11, stdout: '', stderr: 'pthread_create failed (EAGAIN): Resource temporarily unavailable',
  }], cases, 'run');
  assert.equal(exhausted.status, 'runtime_error');
  assert.match(exhausted.stderr, /EAGAIN/);
  assert.equal(exhausted.stdout, '');

  const outOfMemory = mapJudgeResult([{
    status_id: 11, stdout: '', stderr: 'java.lang.OutOfMemoryError: Java heap space',
  }], cases, 'run');
  assert.equal(outOfMemory.status, 'runtime_error');
  assert.match(outOfMemory.stderr, /OutOfMemoryError/);

  const providerFailure = mapJudgeResult([{ status_id: 13, message: 'worker unavailable' }], cases, 'run');
  assert.equal(providerFailure.status, 'service_error');
  assert.equal(providerFailure.stderr, 'worker unavailable');
});

test('serializes concurrent Java test cases to bound per-request JVM resource use', async () => {
  const javaCases = Array.from({ length: 5 }, (_, index) => ({ input: String(index), expected_output: '' }));
  let active = 0;
  let maxActive = 0;
  const fetcher: typeof fetch = async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return new Response(JSON.stringify({ status: { id: 3 }, stdout: '' }), { status: 201 });
  };
  await runJudge0Batch('https://ce.judge0.com', 91, 'class Main {}', javaCases, fetcher);
  assert.equal(maxActive, 1);
});

test('retains bounded parallelism for non-Java test cases', async () => {
  const scriptCases = Array.from({ length: 5 }, (_, index) => ({ input: String(index), expected_output: '' }));
  let active = 0;
  let maxActive = 0;
  const fetcher: typeof fetch = async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return new Response(JSON.stringify({ status: { id: 3 }, stdout: '' }), { status: 201 });
  };
  await runJudge0Batch('https://ce.judge0.com', 71, 'print("")', scriptCases, fetcher);
  assert.equal(maxActive, 3);
});

test('rejects malformed, unavailable, and invalid provider responses', async () => {
  await assert.rejects(runJudge0Batch('https://ce.judge0.com', 91, 'x', cases, fakeFetch({}, { malformed: true })), /réponse illisible/);
  await assert.rejects(runJudge0Batch('https://ce.judge0.com', 91, 'x', cases, fakeFetch({}, { httpError: true })), /Judge0 HTTP 503: queue is full/);
  await assert.rejects(readJudgeResponse(new Response('not json'), 'ce.judge0.com', 'source', 'stdin'), /réponse illisible/);
  assert.equal(parseExecutionRequest({ challengeId: 'x', language: 'java', sourceCode: '', mode: 'run' }), null);
  assert.equal(parseExecutionRequest({ challengeId: 'x', language: 'java', sourceCode: 'x', stdin: 42, mode: 'run' }), null);
  assert.equal(parseExecutionRequest({ challengeId: 'x', language: 'java', sourceCode: 'x', stdin: '', mode: 'run' })?.stdin, '');
});

test('normalizes configured Judge0 URLs to the CE origin and appends the route only once', () => {
  assert.equal(normalizeJudgeBaseUrl(), 'https://ce.judge0.com');
  assert.equal(normalizeJudgeBaseUrl('https://ce.judge0.com/'), 'https://ce.judge0.com');
  assert.equal(normalizeJudgeBaseUrl('https://ce.judge0.com/submissions/?wait=true'), 'https://ce.judge0.com');
  assert.throws(() => normalizeJudgeBaseUrl('https://proxy.example/submissions'), /ce\.judge0\.com/);
});

test('rejects unauthenticated requests and expired or invalid sessions', () => {
  assert.equal(hasAuthenticatedSession(null, { id: 'user' }, null), false);
  assert.equal(hasAuthenticatedSession('Bearer expired', null, null), false);
  assert.equal(hasAuthenticatedSession('Bearer invalid', { id: 'user' }, new Error('invalid token')), false);
  assert.equal(hasAuthenticatedSession('Bearer valid', { id: 'user' }, null), true);
});
