import type { Presentation, PresentationBlock, LeaderboardEntry, BlockType } from '../types/index.ts';

/**
 * Creates a clean URL slug from title
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove french accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates URLs ensuring safe protocols (http/https)
 */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Calculates student leaderboard score and sorts with precise tie-breaking:
 * 1. Number of published presentations (weight 50)
 * 2. Total likes received (weight 10)
 * 3. Total comments received (weight 5)
 */
export function calculateLeaderboardRanking(
  entries: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    study_program: string | null;
    published_presentations_count: number;
    total_likes_received: number;
    total_comments_received: number;
    solved_coding_challenges_count?: number;
    first_published_at?: string;
  }>
): LeaderboardEntry[] {
  const scored = entries.map((entry) => {
    const score =
      entry.published_presentations_count * 50 +
      entry.total_likes_received * 10 +
      entry.total_comments_received * 5 +
      (entry.solved_coding_challenges_count || 0) * 75;

    return {
      ...entry,
      score,
    };
  });

  // Sort by published_presentations_count DESC, total_likes_received DESC, total_comments_received DESC
  scored.sort((a, b) => {
    if (b.published_presentations_count !== a.published_presentations_count) {
      return b.published_presentations_count - a.published_presentations_count;
    }
    if (b.total_likes_received !== a.total_likes_received) {
      return b.total_likes_received - a.total_likes_received;
    }
    if (b.total_comments_received !== a.total_comments_received) {
      return b.total_comments_received - a.total_comments_received;
    }
    return (a.first_published_at || '').localeCompare(b.first_published_at || '');
  });

  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

/**
 * Validates a presentation content block before saving
 */
export function validateContentBlock(block: {
  block_type: BlockType;
  title?: string | null;
  content: any;
}): { valid: boolean; error?: string } {
  if (!block.block_type) {
    return { valid: false, error: 'Type de bloc requis' };
  }

  const { block_type, content } = block;

  switch (block_type) {
    case 'summary':
      if (!content || typeof content.text !== 'string' || content.text.trim().length === 0) {
        return { valid: false, error: 'Le résumé ne peut pas être vide' };
      }
      break;

    case 'key_points':
      if (!content || !Array.isArray(content.points) || content.points.filter((p: string) => p && p.trim().length > 0).length === 0) {
        return { valid: false, error: 'Au moins un point clé doit être renseigné' };
      }
      break;

    case 'explanation':
      if (!content || typeof content.markdown !== 'string' || content.markdown.trim().length === 0) {
        return { valid: false, error: "L'explication détaillée ne peut pas être vide" };
      }
      break;

    case 'code_snippet':
      if (!content || typeof content.code !== 'string' || content.code.trim().length === 0) {
        return { valid: false, error: 'Le snippet de code ne peut pas être vide' };
      }
      if (!content.language || typeof content.language !== 'string') {
        return { valid: false, error: 'Langage de programmation requis' };
      }
      break;

    case 'resource':
      if (!content || !Array.isArray(content.resources) || content.resources.length === 0) {
        return { valid: false, error: 'Au moins une ressource doit être ajoutée' };
      }
      for (const res of content.resources) {
        if (!res.title || !res.url) {
          return { valid: false, error: 'Titre et URL requis pour chaque ressource' };
        }
      }
      break;

    case 'image':
      if (!content || typeof content.url !== 'string' || !/^https?:\/\//i.test(content.url.trim())) {
        return { valid: false, error: 'URL valide requise pour l’image' };
      }
      break;

    default:
      return { valid: false, error: 'Type de bloc non supporté' };
  }

  return { valid: true };
}

/**
 * Estimates reading time in minutes for a presentation based on blocks
 */
export function estimateReadingTime(blocks: PresentationBlock[]): number {
  if (!blocks || blocks.length === 0) return 2;
  let wordCount = 0;

  for (const block of blocks) {
    if (block.block_type === 'summary' && block.content?.text) {
      wordCount += block.content.text.split(/\s+/).length;
    } else if (block.block_type === 'key_points' && Array.isArray(block.content?.points)) {
      wordCount += block.content.points.join(' ').split(/\s+/).length;
    } else if (block.block_type === 'explanation' && block.content?.markdown) {
      wordCount += block.content.markdown.split(/\s+/).length;
    } else if (block.block_type === 'code_snippet') {
      wordCount += 35; // code reading cognitive weight
    } else if (block.block_type === 'resource') {
      wordCount += 20;
    }
  }

  const minutes = Math.ceil(wordCount / 180);
  return Math.max(1, minutes);
}

/**
 * Filters and sorts presentations
 */
export function filterAndSortPresentations(
  presentations: Presentation[],
  searchQuery: string,
  subject: string,
  sort: string,
  tag?: string
): Presentation[] {
  let filtered = [...presentations];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.author?.full_name && p.author.full_name.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (subject && subject !== 'all') {
    filtered = filtered.filter((p) => p.subject === subject);
  }

  if (tag) {
    filtered = filtered.filter((p) => p.tags.includes(tag));
  }

  filtered.sort((a, b) => {
    if (sort === 'most_liked') {
      return (b.likes_count || 0) - (a.likes_count || 0);
    }
    if (sort === 'most_commented') {
      return (b.comments_count || 0) - (a.comments_count || 0);
    }
    if (sort === 'oldest') {
      return new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime();
    }
    // default 'newest'
    return new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime();
  });

  return filtered;
}
