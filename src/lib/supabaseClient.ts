import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Don't throw here; runtime pages will show a helpful message. Keep build-time safe.
  console.warn('Supabase credentials are not set. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env');
}

const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');

export default supabase;
