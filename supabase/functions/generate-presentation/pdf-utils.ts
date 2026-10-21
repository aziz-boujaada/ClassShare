export type PdfTextItem = { str?: unknown; hasEOL?: unknown };

export function normalizePdfTextItems(items: PdfTextItem[]): string {
  const joined = items.map((item) => {
    const value = typeof item.str === 'string' ? item.str : '';
    return value + (item.hasEOL ? '\n' : ' ');
  }).join('');
  return joined
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
}

export function effectiveMaxPdfPages(configured: number): number {
  return Number.isFinite(configured) ? Math.min(20, Math.max(1, Math.floor(configured))) : 20;
}

export function estimateTokens(text: string): number {
  // Conservative multilingual estimate for prompt-budget checks.
  return Math.ceil(text.length / 2);
}

export async function createPdfCacheKey(params: {
  contentHash: string;
  model: string;
  subject: string;
  audience: string;
  language: string;
  sectionCount: number;
  instructions: string;
}): Promise<string> {
  const serialized = JSON.stringify({ pipeline: 'pdf-presentation-v2-qwen', ...params });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
