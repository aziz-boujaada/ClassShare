import { createClient } from 'npm:@supabase/supabase-js@2';
import { getJudgeLanguageId, hasAuthenticatedSession, mapJudgeResult, normalizeJudgeBaseUrl, parseExecutionRequest, runJudge0Batch, type JudgeCase } from './judge0.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
};
const MAX_SOURCE_BYTES = 32_768;
const MAX_INPUT_BYTES = 4_096;
const MAX_TESTS = 20;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function getAdminKey(): string | null {
  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyKey) return legacyKey;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    return typeof keys.default === 'string' ? keys.default : null;
  } catch {
    return null;
  }
}

function serviceKey(): string | null {
  return getAdminKey();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Méthode non prise en charge.' }, 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !authorization) return json({ error: 'Connexion requise.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (!hasAuthenticatedSession(authorization, user, authError)) return json({ error: 'Votre session a expiré. Reconnectez-vous.' }, 401);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: 'La requête d’exécution est invalide.' }, 400);
  }
  const body = parseExecutionRequest(rawBody);
  if (!body) return json({ error: 'Les champs challengeId, language, sourceCode, stdin et mode sont obligatoires et doivent avoir le bon type.' }, 400);
  const { challengeId, sourceCode, language, mode, stdin } = body;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(challengeId)) return json({ error: 'Défi invalide.' }, 400);
  if (!['run', 'submit'].includes(String(mode))) return json({ error: 'Action d’exécution invalide.' }, 400);
  if (!['java', 'python', 'javascript', 'typescript'].includes(language)) return json({ error: 'Ce langage ne peut pas encore être exécuté dans le sandbox.' }, 422);
  if (!sourceCode.trim() || new TextEncoder().encode(sourceCode).byteLength > MAX_SOURCE_BYTES) return json({ error: 'Le code est vide ou dépasse la limite de 32 Ko.' }, 400);
  if (new TextEncoder().encode(stdin).byteLength > MAX_INPUT_BYTES) return json({ error: 'L’entrée standard dépasse la limite de 4 Ko.' }, 400);

  const adminKey = serviceKey();
  if (!adminKey) return json({ error: 'L’exécution est indisponible : la clé serveur Supabase manque.' }, 503);
  let judgeBaseUrl: string;
  try {
    judgeBaseUrl = normalizeJudgeBaseUrl(Deno.env.get('JUDGE0_URL') || undefined);
  } catch {
    return json({ error: 'JUDGE0_URL doit pointer vers https://ce.judge0.com.' }, 503);
  }

  const { data: publicChallenge, error: publicError } = await userClient
    .from('coding_challenges')
    .select('id,public_content')
    .eq('id', challengeId)
    .maybeSingle();
  if (publicError || !publicChallenge) return json({ error: 'Défi introuvable ou inaccessible.' }, 404);

  const adminClient = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: privateChallenge, error: privateError } = await adminClient
    .from('coding_challenges')
    .select('private_content')
    .eq('id', challengeId)
    .maybeSingle();
  if (privateError || !privateChallenge) return json({ error: 'Les tests du défi ne sont pas disponibles.' }, 503);
  const publicContent = publicChallenge.public_content as Record<string, unknown>;
  const privateContent = privateChallenge.private_content as Record<string, unknown>;
  if (publicContent.language !== language) return json({ error: 'Le langage ne correspond pas à ce défi.' }, 400);

  const publicCases = Array.isArray(publicContent.public_test_cases) ? publicContent.public_test_cases as JudgeCase[] : [];
  const hiddenCases = Array.isArray(privateContent.hidden_test_cases) ? privateContent.hidden_test_cases as JudgeCase[] : [];
  const cases: JudgeCase[] = mode === 'run' ? [{ input: stdin, expected_output: '' }] : [...publicCases, ...hiddenCases];
  const selectedCases = cases.slice(0, MAX_TESTS);
  if (!selectedCases.length || selectedCases.some((item) => !item || typeof item.input !== 'string' || typeof item.expected_output !== 'string' || new TextEncoder().encode(item.input).byteLength > MAX_INPUT_BYTES)) {
    return json({ error: 'Le défi ne contient pas de tests valides à exécuter.' }, 422);
  }

  const { data: withinQuota, error: quotaError } = await userClient.rpc('consume_code_execution_quota');
  if (quotaError) {
    console.error('Code execution quota failed:', quotaError.code || 'database error');
    return json({ error: 'Le quota d’exécution est indisponible. Appliquez les migrations Supabase.' }, 503);
  }
  if (!withinQuota) return json({ error: 'Limite de 30 exécutions par heure atteinte. Réessayez plus tard.' }, 429);

  try {
    const languageId = getJudgeLanguageId(language, Deno.env.get('JUDGE0_LANGUAGE_IDS') || undefined);
    const results = await runJudge0Batch(judgeBaseUrl, languageId, sourceCode, selectedCases);
    const executionResult = mapJudgeResult(results, selectedCases, mode);
    if (mode === 'submit' && executionResult.status === 'success') {
      const { data: newlyAwarded, error: pointsError } = await adminClient.rpc('award_coding_challenge_points', {
        p_challenge_id: challengeId,
        p_user_id: user.id,
      });
      if (pointsError) {
        console.error('Challenge points award failed:', pointsError.code || 'database error');
        return json({ ...executionResult, pointsAwarded: 0, pointsMessage: 'Défi réussi, mais les points n’ont pas pu être enregistrés. Soumettez à nouveau pour réessayer.' });
      }
      return json({
        ...executionResult,
        pointsAwarded: newlyAwarded ? 75 : 0,
        pointsMessage: newlyAwarded ? 'Défi réussi : +75 points !' : 'Défi déjà réussi : les 75 points ont déjà été attribués.',
      });
    }
    return json(executionResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Le sandbox est indisponible.';
    return json({ status: 'service_error', stdout: '', stderr: message.slice(0, 500) }, message.toLowerCase().includes('judge0') ? 503 : 502);
  }
});
