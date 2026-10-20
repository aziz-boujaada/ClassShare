import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  sanitizeExternalUrl,
  calculateLeaderboardRanking,
  validateContentBlock,
  estimateReadingTime,
} from './logic.ts';

test('slugify generates clean URL friendly slugs with French accents stripped', () => {
  assert.equal(
    slugify('Introduction aux Réseaux de Neurones & PyTorch !'),
    'introduction-aux-reseaux-de-neurones-pytorch'
  );
  assert.equal(slugify('  TypeScript: Les Meilleurs Design Patterns 2026 '), 'typescript-les-meilleurs-design-patterns-2026');
});

test('sanitizeExternalUrl validates safe http/https URLs', () => {
  assert.equal(sanitizeExternalUrl('https://slides.google.com/test'), 'https://slides.google.com/test');
  assert.equal(sanitizeExternalUrl('http://example.com/slides.pdf'), 'http://example.com/slides.pdf');
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeExternalUrl(''), null);
  assert.equal(sanitizeExternalUrl(null), null);
});

test('calculateLeaderboardRanking correctly ranks students with tie-breaking rules', () => {
  const students = [
    {
      user_id: 'user-1',
      username: 'alice',
      full_name: 'Alice Martin',
      avatar_url: null,
      study_program: 'Master Informatique',
      published_presentations_count: 3,
      total_likes_received: 15,
      total_comments_received: 5,
    },
    {
      user_id: 'user-2',
      username: 'bob',
      full_name: 'Bob Dupont',
      avatar_url: null,
      study_program: 'Licence 3',
      published_presentations_count: 5,
      total_likes_received: 10,
      total_comments_received: 2,
    },
    {
      user_id: 'user-3',
      username: 'charlie',
      full_name: 'Charlie Benali',
      avatar_url: null,
      study_program: 'Master Cyber',
      published_presentations_count: 3,
      total_likes_received: 20, // Same presentations as Alice, but more likes
      total_comments_received: 4,
    },
  ];

  const ranked = calculateLeaderboardRanking(students);

  // Bob has 5 presentations -> 1st
  assert.equal(ranked[0].username, 'bob');
  assert.equal(ranked[0].rank, 1);

  // Charlie has 3 presentations, 20 likes -> 2nd
  assert.equal(ranked[1].username, 'charlie');
  assert.equal(ranked[1].rank, 2);

  // Alice has 3 presentations, 15 likes -> 3rd
  assert.equal(ranked[2].username, 'alice');
  assert.equal(ranked[2].rank, 3);
});

test('validateContentBlock properly validates each block type', () => {
  // Valid summary
  const validSummary = validateContentBlock({
    block_type: 'summary',
    content: { text: 'Présentation de TypeScript 5.5' },
  });
  assert.equal(validSummary.valid, true);

  // Empty summary should fail
  const emptySummary = validateContentBlock({
    block_type: 'summary',
    content: { text: '   ' },
  });
  assert.equal(emptySummary.valid, false);

  // Code snippet without code
  const invalidCode = validateContentBlock({
    block_type: 'code_snippet',
    content: { language: 'typescript', code: '' },
  });
  assert.equal(invalidCode.valid, false);

  // Code snippet with code
  const validCode = validateContentBlock({
    block_type: 'code_snippet',
    content: { language: 'typescript', code: 'const x: number = 42;' },
  });
  assert.equal(validCode.valid, true);
});

test('estimateReadingTime calculates realistic minutes', () => {
  const blocks: any[] = [
    { block_type: 'summary', content: { text: 'Un résumé concis.' } },
    { block_type: 'code_snippet', content: { language: 'typescript', code: 'console.log("hello");' } },
  ];
  const minutes = estimateReadingTime(blocks);
  assert.ok(minutes >= 1);
});
