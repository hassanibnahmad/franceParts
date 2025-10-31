import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

export default async function adminCheckEmailHandler(req, res) {
  const DEBUG = process.env.DEBUG_API === 'true';
  if (DEBUG) console.log('[admin-check-email] incoming', { method: req.method, url: req.url, headers: req.headers, body: req.body });

  // Accept POST (and GET for fallback) so the endpoint is reachable in different hosting setups
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // lazy init supabase admin client
    if (!supabaseAdmin) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('admin-check-email missing SUPABASE envs');
        return res.status(500).json({ error: 'Server misconfigured' });
      }
      try { supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (e) { console.error('admin-check-email supabase init failed', e); return res.status(500).json({ error: 'internal' }); }
    }

    let email = null;
    if (req.method === 'POST') {
      email = req.body && req.body.email;
    } else {
      try { const u = new URL(req.url, 'http://localhost'); email = u.searchParams.get('email'); } catch (e) { email = null; }
    }

    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Invalid email' });
    const emailNorm = String(email).trim().toLowerCase();
    const emailRe = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRe.test(emailNorm)) return res.status(400).json({ error: 'Invalid email' });

    const { data: admin, error } = await supabaseAdmin.from('admins').select('id,email').ilike('email', emailNorm).limit(1).maybeSingle();
    if (error) { console.error('supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });
    return res.json({ ok: true, exists: true });
  } catch (err) {
    console.error('admin-check-email handler error', err);
    return res.status(500).json({ error: 'internal' });
  }
}
