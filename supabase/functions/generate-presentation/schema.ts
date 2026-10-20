export type Section = {
  title: string;
  explanation: string;
  key_points: string[];
  code?: { language: string; code: string; explanation: string };
  source_pages: number[];
};

export type Result = {
  title: string;
  description: string;
  subject: string;
  tags: string[];
  summary: string;
  objectives: string[];
  sections: Section[];
  conclusion: string;
  checklist: string[];
  challenge: GeneratedChallenge;
};

export type ChallengeCase = { input: string; expected_output: string };
export type GeneratedChallenge = {
  available: boolean;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'none';
  concepts: string[];
  problem: string;
  requirements: string[];
  constraints: string[];
  examples: ChallengeCase[];
  language: 'java' | 'python' | 'typescript' | 'javascript' | 'sql' | 'none';
  runtime: string;
  starter_code: string;
  hints: string[];
  evaluation_criteria: string[];
  public_test_cases: ChallengeCase[];
  hidden_test_cases: ChallengeCase[];
  reference_solution: string;
  solution_explanation: string;
  linked_section: string;
};

export const outlineSchema = {
  type: 'object', required: ['subject', 'summary', 'concepts', 'outline'], additionalProperties: false, properties: {
    subject: { type: 'string' }, summary: { type: 'string' }, concepts: { type: 'array', items: { type: 'string' } }, outline: { type: 'array', items: { type: 'string' } },
  },
};

export const resultSchema = {
  type: 'object', required: ['title', 'description', 'subject', 'tags', 'summary', 'objectives', 'sections', 'conclusion', 'checklist', 'challenge'], additionalProperties: false, properties: {
    title: { type: 'string' }, description: { type: 'string' }, subject: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' },
    objectives: { type: 'array', items: { type: 'string' } }, conclusion: { type: 'string' }, checklist: { type: 'array', items: { type: 'string' } },
    challenge: { type: 'object', required: ['available', 'title', 'difficulty', 'concepts', 'problem', 'requirements', 'constraints', 'examples', 'language', 'runtime', 'starter_code', 'hints', 'evaluation_criteria', 'public_test_cases', 'hidden_test_cases', 'reference_solution', 'solution_explanation', 'linked_section'], additionalProperties: false, properties: {
      available: { type: 'boolean' }, title: { type: 'string' }, difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'none'] }, concepts: { type: 'array', items: { type: 'string' } },
      problem: { type: 'string' }, requirements: { type: 'array', items: { type: 'string' } }, constraints: { type: 'array', items: { type: 'string' } },
      examples: { type: 'array', items: { type: 'object', required: ['input', 'expected_output'], additionalProperties: false, properties: { input: { type: 'string' }, expected_output: { type: 'string' } } } },
      language: { type: 'string', enum: ['java', 'python', 'typescript', 'javascript', 'sql', 'none'] }, runtime: { type: 'string' }, starter_code: { type: 'string' }, hints: { type: 'array', items: { type: 'string' } },
      evaluation_criteria: { type: 'array', items: { type: 'string' } },
      public_test_cases: { type: 'array', items: { type: 'object', required: ['input', 'expected_output'], additionalProperties: false, properties: { input: { type: 'string' }, expected_output: { type: 'string' } } } },
      hidden_test_cases: { type: 'array', items: { type: 'object', required: ['input', 'expected_output'], additionalProperties: false, properties: { input: { type: 'string' }, expected_output: { type: 'string' } } } },
      reference_solution: { type: 'string' }, solution_explanation: { type: 'string' }, linked_section: { type: 'string' },
    } },
    sections: { type: 'array', items: { type: 'object', required: ['title', 'explanation', 'key_points', 'source_pages', 'code'], additionalProperties: false, properties: {
      title: { type: 'string' }, explanation: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } }, source_pages: { type: 'array', items: { type: 'integer' } },
      code: { type: 'object', required: ['language', 'code', 'explanation'], additionalProperties: false, properties: { language: { type: 'string' }, code: { type: 'string' }, explanation: { type: 'string' } } },
    } } },
  },
};

// Reuse the exact challenge contract when generating a challenge for an existing presentation.
export const challengeSchema = resultSchema.properties.challenge;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`Réponse Groq invalide : « ${path} » doit être un objet.`);
  return value;
}

function requireKeys(record: Record<string, unknown>, keys: string[], path: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new Error(`Réponse Groq invalide : « ${path}.${key} » est manquant.`);
  }
}

function rejectExtraKeys(record: Record<string, unknown>, keys: string[], path: string): void {
  const extra = Object.keys(record).find((key) => !keys.includes(key));
  if (extra) throw new Error(`Réponse Groq invalide : « ${path}.${extra} » n’est pas autorisé.`);
}

function requireString(record: Record<string, unknown>, key: string, path: string, max: number): string {
  const value = record[key];
  if (typeof value !== 'string') throw new Error(`Réponse Groq invalide : « ${path}.${key} » doit être une chaîne de caractères.`);
  return value.trim().slice(0, max);
}

function requireStringArray(record: Record<string, unknown>, key: string, path: string, maxItem: number, maxItems: number): string[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`Réponse Groq invalide : « ${path}.${key} » doit être un tableau.`);
  return value.map((item, index) => {
    if (typeof item !== 'string') throw new Error(`Réponse Groq invalide : « ${path}.${key}[${index}] » doit être une chaîne de caractères.`);
    return item.trim().slice(0, maxItem);
  }).filter(Boolean).slice(0, maxItems);
}

export function parseGroqResponse(payload: unknown): unknown {
  const response = requireRecord(payload, 'réponse');
  const choices = response.choices;
  if (!Array.isArray(choices) || choices.length === 0) throw new Error('La réponse Groq ne contient aucun choix.');
  const choice = requireRecord(choices[0], 'choices[0]');
  const message = requireRecord(choice.message, 'choices[0].message');
  if (typeof message.content !== 'string' || !message.content.trim()) throw new Error('La réponse Groq ne contient pas de contenu JSON.');
  try {
    return JSON.parse(message.content);
  } catch {
    throw new Error('La réponse Groq ne contient pas un JSON valide.');
  }
}

export function validateResult(raw: unknown, requestedSections: number, validPages: Set<number>): Result {
  const item = requireRecord(raw, 'racine');
  const rootKeys = ['title', 'description', 'subject', 'tags', 'summary', 'objectives', 'sections', 'conclusion', 'checklist', 'challenge'];
  requireKeys(item, rootKeys, 'résultat');
  rejectExtraKeys(item, rootKeys, 'résultat');

  const rawSections = item.sections;
  if (!Array.isArray(rawSections)) throw new Error('Réponse Groq invalide : « sections » doit être un tableau.');
  const sections = rawSections.map((rawSection, index): Section | null => {
    const path = `sections[${index}]`;
    const section = requireRecord(rawSection, path);
    const sectionKeys = ['title', 'explanation', 'key_points', 'source_pages', 'code'];
    requireKeys(section, sectionKeys, path);
    rejectExtraKeys(section, sectionKeys, path);

    const title = requireString(section, 'title', path, 180);
    const explanation = requireString(section, 'explanation', path, 4000);
    const key_points = requireStringArray(section, 'key_points', path, 500, 8);
    const rawPages = section.source_pages;
    if (!Array.isArray(rawPages)) throw new Error(`Réponse Groq invalide : « ${path}.source_pages » doit être un tableau.`);
    const source_pages = rawPages.map((page, pageIndex) => {
      if (!Number.isInteger(page)) throw new Error(`Réponse Groq invalide : « ${path}.source_pages[${pageIndex}] » doit être un entier.`);
      return page as number;
    }).filter((page) => validPages.has(page)).slice(0, 8);

    // The schema requires an object. Normalize only null to the documented empty-object representation.
    const rawCode = section.code === null
      ? { language: '', code: '', explanation: '' }
      : requireRecord(section.code, `${path}.code`);
    const codeKeys = ['language', 'code', 'explanation'];
    requireKeys(rawCode, codeKeys, `${path}.code`);
    rejectExtraKeys(rawCode, codeKeys, `${path}.code`);
    const language = requireString(rawCode, 'language', `${path}.code`, 40);
    const codeText = requireString(rawCode, 'code', `${path}.code`, 5000);
    const codeExplanation = requireString(rawCode, 'explanation', `${path}.code`, 1000);
    const hasLanguage = Boolean(language);
    const hasCode = Boolean(codeText);
    if (hasLanguage !== hasCode || (!hasLanguage && codeExplanation)) {
      throw new Error(`Réponse Groq invalide : « ${path}.code » doit contenir language et code, ou trois chaînes vides en l’absence d’exemple.`);
    }

    if (!title || !explanation) return null;
    return {
      title,
      explanation,
      key_points,
      source_pages,
      ...(hasLanguage ? { code: { language, code: codeText, explanation: codeExplanation } } : {}),
    };
  }).filter((section): section is Section => section !== null);

  const rawChallenge = requireRecord(item.challenge, 'challenge');
  const challengeKeys = ['available', 'title', 'difficulty', 'concepts', 'problem', 'requirements', 'constraints', 'examples', 'language', 'runtime', 'starter_code', 'hints', 'evaluation_criteria', 'public_test_cases', 'hidden_test_cases', 'reference_solution', 'solution_explanation', 'linked_section'];
  requireKeys(rawChallenge, challengeKeys, 'challenge');
  rejectExtraKeys(rawChallenge, challengeKeys, 'challenge');
  if (typeof rawChallenge.available !== 'boolean') throw new Error('Réponse Groq invalide : « challenge.available » doit être un booléen.');
  const challengeCaseArray = (key: 'examples' | 'public_test_cases' | 'hidden_test_cases'): ChallengeCase[] => {
    const rawCases = rawChallenge[key];
    if (!Array.isArray(rawCases)) throw new Error(`Réponse Groq invalide : « challenge.${key} » doit être un tableau.`);
    return rawCases.slice(0, 20).map((rawCase, index) => {
      const path = `challenge.${key}[${index}]`;
      const challengeCase = requireRecord(rawCase, path);
      requireKeys(challengeCase, ['input', 'expected_output'], path);
      rejectExtraKeys(challengeCase, ['input', 'expected_output'], path);
      return { input: requireString(challengeCase, 'input', path, 2000), expected_output: requireString(challengeCase, 'expected_output', path, 2000) };
    });
  };
  const challenge: GeneratedChallenge = {
    available: rawChallenge.available,
    title: requireString(rawChallenge, 'title', 'challenge', 180),
    difficulty: requireString(rawChallenge, 'difficulty', 'challenge', 20) as GeneratedChallenge['difficulty'],
    concepts: requireStringArray(rawChallenge, 'concepts', 'challenge', 120, 12),
    problem: requireString(rawChallenge, 'problem', 'challenge', 5000),
    requirements: requireStringArray(rawChallenge, 'requirements', 'challenge', 500, 12),
    constraints: requireStringArray(rawChallenge, 'constraints', 'challenge', 300, 12),
    examples: challengeCaseArray('examples'),
    language: requireString(rawChallenge, 'language', 'challenge', 20) as GeneratedChallenge['language'],
    runtime: requireString(rawChallenge, 'runtime', 'challenge', 120),
    starter_code: requireString(rawChallenge, 'starter_code', 'challenge', 8000),
    hints: requireStringArray(rawChallenge, 'hints', 'challenge', 500, 8),
    evaluation_criteria: requireStringArray(rawChallenge, 'evaluation_criteria', 'challenge', 500, 12),
    public_test_cases: challengeCaseArray('public_test_cases'),
    hidden_test_cases: challengeCaseArray('hidden_test_cases'),
    reference_solution: requireString(rawChallenge, 'reference_solution', 'challenge', 8000),
    solution_explanation: requireString(rawChallenge, 'solution_explanation', 'challenge', 3000),
    linked_section: requireString(rawChallenge, 'linked_section', 'challenge', 180),
  };
  if (challenge.available) {
    if (!['easy', 'medium', 'hard'].includes(challenge.difficulty) || !['java', 'python', 'typescript', 'javascript', 'sql'].includes(challenge.language)) {
      throw new Error('Le défi généré utilise une difficulté ou un langage non pris en charge.');
    }
    if (!challenge.title || !challenge.problem || !challenge.starter_code || !challenge.runtime || !challenge.reference_solution || !challenge.hidden_test_cases.length || !challenge.public_test_cases.length || challenge.hints.length < 2 || !challenge.concepts.length || !challenge.requirements.length || !challenge.evaluation_criteria.length) {
      throw new Error('Le défi généré est incomplet. Réessayez avec un support plus détaillé.');
    }
    if (!sections.some((section) => section.title.toLocaleLowerCase() === challenge.linked_section.toLocaleLowerCase())) {
      throw new Error('Le défi généré ne renvoie pas à une section de la présentation. Réessayez.');
    }
  } else if (challenge.difficulty !== 'none' || challenge.language !== 'none') {
    throw new Error('Le défi indisponible doit utiliser les valeurs neutres du schéma.');
  } else if (challenge.title || challenge.problem || challenge.starter_code || challenge.reference_solution || challenge.hidden_test_cases.length) {
    throw new Error('Le défi indisponible ne doit pas contenir de contenu de défi ou de solution.');
  }

  const result: Result = {
    title: requireString(item, 'title', 'résultat', 180),
    description: requireString(item, 'description', 'résultat', 600),
    subject: requireString(item, 'subject', 'résultat', 120),
    tags: requireStringArray(item, 'tags', 'résultat', 40, 8),
    summary: requireString(item, 'summary', 'résultat', 2500),
    objectives: requireStringArray(item, 'objectives', 'résultat', 300, 8),
    sections,
    conclusion: requireString(item, 'conclusion', 'résultat', 3000),
    checklist: requireStringArray(item, 'checklist', 'résultat', 300, 8),
    challenge,
  };

  if (!result.title || !result.description || !result.summary || result.sections.length < 2 || !result.conclusion) throw new Error('La présentation générée est incomplète. Réessayez ou réduisez le nombre de sections.');
  if (result.sections.length > requestedSections) result.sections = result.sections.slice(0, requestedSections);
  if (result.objectives.length) result.objectives = [...new Set(result.objectives)];
  const seen = new Set<string>();
  result.sections = result.sections.filter((section) => {
    const key = section.title.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (result.sections.length < 2) throw new Error('La présentation contient trop peu de sections distinctes. Réessayez.');
  return result;
}

export function validateGeneratedChallenge(raw: unknown, sectionTitles: string[]): GeneratedChallenge {
  const titles = [...new Set(sectionTitles.map((title) => title.trim()).filter(Boolean))];
  if (!titles.length) throw new Error('La présentation choisie ne contient pas de section exploitable pour créer un défi.');
  // Reuse the same strict challenge validation and completeness checks as normal generation.
  const sections = (titles.length > 1 ? titles : [...titles, 'Contexte de la présentation']).map((title) => ({
    title,
    explanation: 'Section de référence.',
    key_points: [],
    source_pages: [],
    code: { language: '', code: '', explanation: '' },
  }));
  const result = validateResult({
    title: 'Défi depuis une présentation',
    description: 'Défi généré à partir d’une présentation existante.',
    subject: 'Programmation',
    tags: [],
    summary: 'Défi de programmation.',
    objectives: [],
    sections,
    conclusion: 'Défi de programmation.',
    checklist: [],
    challenge: raw,
  }, 2, new Set());
  if (!result.challenge.available) throw new Error('Ce contenu ne permet pas de générer un défi de code pertinent.');
  if (!titles.some((title) => title.toLocaleLowerCase() === result.challenge.linked_section.toLocaleLowerCase())) {
    throw new Error('Le défi généré ne renvoie pas à une section de la présentation choisie. Réessayez.');
  }
  return result.challenge;
}
