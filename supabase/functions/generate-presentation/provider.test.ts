import test from 'node:test';
import assert from 'node:assert/strict';
import { groqCompletion } from './provider.ts';
import { validateResult } from './schema.ts';

const schema = { type: 'object', required: ['title'], additionalProperties: false, properties: { title: { type: 'string' } } };
const success = () => new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"OK"}' } }] }), { status: 200 });
const options = (fetcher: typeof fetch, wait = async (_ms: number) => {}) => ({
  apiKey: 'secret-test-key', model: 'qwen/qwen3.8-27b', timeoutMs: 1000, maxCompletionTokens: 100, fetcher, wait,
});

test('sends Qwen with strict JSON Schema and parses its response', async () => {
  let requestBody: Record<string, any> | null = null;
  const result = await groqCompletion('prompt', schema, 'generation', options(async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return success();
  }));
  assert.deepEqual(result, { title: 'OK' });
  assert.equal(requestBody?.model, 'qwen/qwen3.8-27b');
  assert.equal(requestBody?.response_format.json_schema.strict, true);
  assert.equal(requestBody?.reasoning_effort, 'none');
});

test('retries a transient provider 503 with bounded exponential delay', async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await groqCompletion('prompt', schema, 'analysis', options(async () => {
    calls += 1;
    return calls === 1 ? new Response('{}', { status: 503 }) : success();
  }, async (ms) => { delays.push(ms); }));
  assert.deepEqual(result, { title: 'OK' });
  assert.equal(calls, 2);
  assert.deepEqual(delays, [300]);
});

test('retries a 429 only when the provider gives a short retry-after', async () => {
  let calls = 0;
  const result = await groqCompletion('prompt', schema, 'analysis', options(async () => {
    calls += 1;
    return calls === 1 ? new Response('{"error":{"message":"slow down"}}', { status: 429, headers: { 'retry-after': '1' } }) : success();
  }, async () => {}));
  assert.deepEqual(result, { title: 'OK' });
  assert.equal(calls, 2);
});

test('does not retry quota-like 429 responses without a short retry-after', async () => {
  let calls = 0;
  await assert.rejects(groqCompletion('prompt', schema, 'analysis', options(async () => {
    calls += 1;
    return new Response('{"error":{"message":"daily quota"}}', { status: 429 });
  })), /quota Groq/);
  assert.equal(calls, 1);
});

test('handles invalid provider JSON and missing required response keys safely', async () => {
  await assert.rejects(groqCompletion('prompt', schema, 'generation', options(async () => new Response(
    JSON.stringify({ choices: [{ message: { content: '```json\n{bad json}\n```' } }] }), { status: 200 },
  ))), /JSON valide/);
  await assert.rejects(groqCompletion('prompt', schema, 'generation', options(async () => new Response(
    JSON.stringify({ choices: [{ message: { content: '{}' } }] }), { status: 200 },
  ))).then((value) => validateResult(value, 3, new Set())), /title.*manquant/);
});

test('reports timeouts without leaking secrets or retrying timed-out requests', async () => {
  let calls = 0;
  await assert.rejects(groqCompletion('prompt', schema, 'generation', options(async () => {
    calls += 1;
    throw new DOMException('timed out', 'TimeoutError');
  })), /Groq met trop de temps/);
  assert.equal(calls, 1);
});

test('handles provider authentication errors without exposing the API key', async () => {
  await assert.rejects(groqCompletion('prompt', schema, 'generation', options(async () => new Response(
    JSON.stringify({ error: { message: 'bad secret-test-key' } }), { status: 401 },
  ))), (error: unknown) => error instanceof Error && /clé Groq est invalide/.test(error.message) && !error.message.includes('secret-test-key'));
});
