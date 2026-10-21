import test from 'node:test';
import assert from 'node:assert/strict';
import { createPdfCacheKey, effectiveMaxPdfPages, estimateTokens, hasPdfSignature, normalizePdfTextItems } from './pdf-utils.ts';

test('keeps PDF line boundaries and normalizes whitespace without flattening headings', () => {
  assert.equal(normalizePdfTextItems([
    { str: 'Chapitre 1', hasEOL: true },
    { str: 'Définition', hasEOL: true },
    { str: 'Une notion', hasEOL: false },
    { str: ' importante.', hasEOL: true },
  ]), 'Chapitre 1\nDéfinition\nUne notion importante.');
});

test('recognizes image-only pages as having no extractable text', () => {
  assert.equal(normalizePdfTextItems([]), '');
  assert.equal(normalizePdfTextItems([{ str: '  ', hasEOL: true }]), '');
});

test('checks PDF signature and rejects a corrupt header', () => {
  assert.equal(hasPdfSignature(new TextEncoder().encode('%PDF-1.7 data')), true);
  assert.equal(hasPdfSignature(new TextEncoder().encode('not a pdf')), false);
});

test('caps configured page limits at eighty and uses fifty for invalid config', () => {
  assert.equal(effectiveMaxPdfPages(100), 80);
  assert.equal(effectiveMaxPdfPages(80), 80);
  assert.equal(effectiveMaxPdfPages(12.8), 12);
  assert.equal(effectiveMaxPdfPages(Number.NaN), 50);
});

test('estimates a conservative token budget for extracted text', () => {
  assert.equal(estimateTokens('a'.repeat(100)), 50);
});

test('caches same PDF generation inputs but separates changed model or options', async () => {
  const base = { contentHash: 'abc', model: 'qwen/qwen3.8-27b', subject: '', audience: '', language: 'Français', sectionCount: 6, instructions: '' };
  const first = await createPdfCacheKey(base);
  assert.equal(first, await createPdfCacheKey(base));
  assert.notEqual(first, await createPdfCacheKey({ ...base, model: 'different-model' }));
  assert.notEqual(first, await createPdfCacheKey({ ...base, sectionCount: 8 }));
});
