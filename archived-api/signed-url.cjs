const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { path, expires } = req.body || {};
  if (!path) return res.status(400).json({ error: 'path required' });
  try {
    // Basic path validation to avoid path traversal or invalid characters
    if (typeof path !== 'string' || path.includes('..') || path.startsWith('/') || path.startsWith('\\') || path.length > 800 || !/^[a-zA-Z0-9_\-\.\/]+$/.test(path)) {
      return res.status(400).json({ error: 'invalid path' });
    }
    const ttl = typeof expires === 'number' ? expires : 60 * 60;
    const { data, error } = await supabase.storage.from('blog-images').createSignedUrl(path, ttl);
    if (error) return res.status(500).json({ error: error.message || 'signedUrl failed' });
    return res.status(200).json({ signedUrl: data?.signedUrl ?? null });
  } catch (err) {
    console.error('signed-url error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
