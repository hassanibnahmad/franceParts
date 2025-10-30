import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

function isSafeStoragePath(p) {
  if (!p || typeof p !== 'string') return false;
  if (p.includes('..') || p.startsWith('/') || p.startsWith('\\')) return false;
  if (p.length > 800) return false;
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(p);
}

export default async function signedUrlHandler(req, res) {
  const DEBUG = process.env.DEBUG_API === 'true';
  if (DEBUG) console.log('[signed-url] incoming', { method: req.method, url: req.url, headers: req.headers });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { path, expires } = req.body || {};
  if (!path) return res.status(400).json({ error: 'path required' });
  if (!isSafeStoragePath(path)) return res.status(400).json({ error: 'invalid path' });
  try {
    // lazy-init supabase admin client
    if (!supabase) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('signed-url missing SUPABASE envs');
        return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
      }
      try { supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (e) { console.error('signed-url supabase init failed', e); return res.status(500).json({ error: 'Server misconfigured' }); }
    }
    const ttl = typeof expires === 'number' ? expires : 60 * 60; // default 1h
    const { data, error } = await supabase.storage.from('blog-images').createSignedUrl(path, ttl);
    if (error) return res.status(500).json({ error: error.message || 'signedUrl failed' });
    return res.status(200).json({ signedUrl: data?.signedUrl ?? null });
  } catch (err) {
    console.error('signed-url error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
