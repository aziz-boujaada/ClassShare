import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
).trim();

let validUrl = false;
try {
  const parsedUrl = new URL(supabaseUrl);
  validUrl = parsedUrl.protocol === 'https:' && !parsedUrl.hostname.includes('your-project-id');
} catch {
  validUrl = false;
}
export const isSupabaseConfigured = validUrl && Boolean(
  supabasePublishableKey && !supabasePublishableKey.includes('your-anon-public-api-key') && !supabasePublishableKey.includes('<'),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
}
