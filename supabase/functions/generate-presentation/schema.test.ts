import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGroqResponse, validateResult, type Result } from './schema.ts';

const emptyCode = { language: '', code: '', explanation: '' };

function section(title: string, code: unknown = emptyCode) {
  return {
    title,
    explanation: `Explication de ${title}.`,
    key_points: ['Point important'],
    source_pages: [1],
    code,
  };
}

function rawResult(firstSection: unknown = section('Concept A'), secondSection: unknown = section('Concept B')): Record<string, unknown> {
  return {
    title: 'Présentation test',
    description: 'Une présentation conforme au schéma.',
    subject: 'Informatique',
    tags: ['test'],
    summary: 'Résumé pédagogique du contenu.',
    objectives: ['Comprendre le sujet'],
    sections: [firstSection, secondSection],
    conclusion: 'Conclusion pédagogique.',
    checklist: ['Relire'],
    challenge: {
      available: false,
      title: '',
      difficulty: 'none',
      concepts: [],
      problem: '',
      requirements: [],
      constraints: [],
      examples: [],
      language: 'none',
      runtime: '',
      starter_code: '',
      hints: [],
      evaluation_criteria: [],
      public_test_cases: [],
      hidden_test_cases: [],
      reference_solution: '',
      solution_explanation: '',
      linked_section: '',
    },
  };
}

test('valide une section avec un exemple de code', () => {
  const result = validateResult(rawResult(section('Concept A', {
    language: 'typescript',
    code: 'const answer = 42;',
    explanation: 'Déclare une constante.',
  })), 6, new Set([1])) as Result;

  assert.deepEqual(result.sections[0].code, {
    language: 'typescript',
    code: 'const answer = 42;',
    explanation: 'Déclare une constante.',
  });
});

test('valide une section sans code avec l’objet vide défini par le contrat', () => {
  const result = validateResult(rawResult(), 6, new Set([1])) as Result;
  assert.equal('code' in result.sections[0], false);
});

test('normalise code null vers l’objet vide puis omet le bloc de code', () => {
  const result = validateResult(rawResult(section('Concept A', null)), 6, new Set([1])) as Result;
  assert.equal('code' in result.sections[0], false);
});

test('accepte une réponse fournisseur conforme au schéma', () => {
  const payload = {
    choices: [{ message: { content: JSON.stringify(rawResult()) } }],
  };
  const result = validateResult(parseGroqResponse(payload), 6, new Set([1])) as Result;
  assert.equal(result.sections.length, 2);
  assert.equal(result.title, 'Présentation test');
});

test('rejette explicitement une réponse invalide du fournisseur', () => {
  assert.throws(
    () => parseGroqResponse({ choices: [{ message: { content: '{bad json' } }] }),
    /ne contient pas un JSON valide/,
  );
  assert.throws(
    () => parseGroqResponse({ choices: [{ message: { content: null } }] }),
    /ne contient pas de contenu JSON/,
  );
});

test('rejette les null et types incorrects dans les autres champs de section', () => {
  assert.throws(() => validateResult(rawResult(section('Concept A', { ...emptyCode, language: null })), 6, new Set([1])), /code\.language.*chaîne/);
  assert.throws(() => validateResult(rawResult({ ...section('Concept A'), key_points: null }), 6, new Set([1])), /key_points.*tableau/);
  assert.throws(() => validateResult(rawResult({ ...section('Concept A'), source_pages: ['1'] }), 6, new Set([1])), /source_pages\[0\].*entier/);
  assert.throws(() => validateResult({ ...rawResult(), sections: [null, section('Concept B')] }, 6, new Set([1])), /sections\[0\].*objet/);
});
