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
};

export const outlineSchema = {
  type: 'object', required: ['subject', 'summary', 'concepts', 'outline'], additionalProperties: false, properties: {
    subject: { type: 'string' }, summary: { type: 'string' }, concepts: { type: 'array', items: { type: 'string' } }, outline: { type: 'array', items: { type: 'string' } },
  },
};

export const resultSchema = {
  type: 'object', required: ['title', 'description', 'subject', 'tags', 'summary', 'objectives', 'sections', 'conclusion', 'checklist'], additionalProperties: false, properties: {
    title: { type: 'string' }, description: { type: 'string' }, subject: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' },
    objectives: { type: 'array', items: { type: 'string' } }, conclusion: { type: 'string' }, checklist: { type: 'array', items: { type: 'string' } },
    sections: { type: 'array', items: { type: 'object', required: ['title', 'explanation', 'key_points', 'source_pages', 'code'], additionalProperties: false, properties: {
      title: { type: 'string' }, explanation: { type: 'string' }, key_points: { type: 'array', items: { type: 'string' } }, source_pages: { type: 'array', items: { type: 'integer' } },
      code: { type: 'object', required: ['language', 'code', 'explanation'], additionalProperties: false, properties: { language: { type: 'string' }, code: { type: 'string' }, explanation: { type: 'string' } } },
    } } },
  },
};

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
  const rootKeys = ['title', 'description', 'subject', 'tags', 'summary', 'objectives', 'sections', 'conclusion', 'checklist'];
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
