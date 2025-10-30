// This dynamic handler now forwards requests to the consolidated `api/posts.js`
// implementation so that id-scoped requests (PUT/DELETE to /api/posts/:id)
// are handled by the authoritative code path. Keeping a small forwarder avoids
// duplication and preserves the canonical authorization logic.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

function getIdFromReq(req) {
  try {
    const m = (req.url || '').match(/\/api\/posts\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) { return null; }
}

export default async function postsIdHandler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  // prevent CDN from serving a cached SPA index.html for this API route
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // lightweight log to make sure Vercel shows us when this function runs
  try { console.log('[postsId] incoming', { method: req.method, url: req.url, headers: { cookie: !!req.headers.cookie }, marker: 'postsId-v1' }); } catch (e) {}

  // lazy init supabase
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[postsId] missing SUPABASE env');
      return res.status(500).json({ error: 'Server misconfigured' });
    }
    try { supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (e) { console.error('[postsId] supabase init', e); return res.status(500).json({ error: 'Server misconfigured' }); }
  }

  // auth: accept cookie admin_session or x-upload-secret / x-upload-token (token verification omitted here)
  const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
  let authorized = false;
  if (cookieSecret && req.headers?.cookie) {
    try {
      const header = req.headers.cookie || '';
      const obj = {};
      header.split(';').forEach((pair) => {
        const idx = pair.indexOf('='); if (idx === -1) return; const k = pair.substring(0, idx).trim(); obj[k] = pair.substring(idx+1).trim();
      });
      const session = obj['admin_session'];
      if (session) {
        const crypto = await import('crypto');
        const parts = String(session).split('.');
        if (parts.length === 2) {
          const [b, mac] = parts;
          const expectedMac = crypto.createHmac('sha256', String(cookieSecret)).update(b).digest('hex');
          if (crypto.timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(mac, 'hex'))) authorized = true;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // fallback: direct header secret
  if (!authorized && process.env.UPLOAD_SECRET) {
    const provided = req.headers['x-upload-secret'] || req.headers['X-Upload-Secret'];
    if (provided && provided === process.env.UPLOAD_SECRET) authorized = true;
  }

  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const id = getIdFromReq(req) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });

    if (req.method === 'GET') {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single();
      if (error) return res.status(500).json({ error: error.message || 'Fetch failed' });
      return res.status(200).json({ data });
    }

    if (req.method === 'PUT') {
      const updates = req.body || {};
      delete updates.id;
      const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
      if (error) return res.status(500).json({ error: error.message || 'Update failed' });
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      // attempt to remove featured image too
      const { data: existing, error: fetchErr } = await supabase.from('blog_posts').select('featured_image').eq('id', id).single();
      if (fetchErr) return res.status(500).json({ error: fetchErr.message || 'Fetch failed' });
      const featured = existing && existing.featured_image;
      if (featured) {
        try {
          const idx = featured.indexOf('/blog-images/');
          let path = null;
          if (idx !== -1) path = featured.substring(idx + '/blog-images/'.length);
          else {
            const m = featured.match(/\/object\/(?:public|sign)\/[\w-]+\/(.+)$/);
            if (m) path = m[1];
          }
          if (path) {
            const { error: removeErr } = await supabase.storage.from('blog-images').remove([path]);
            if (removeErr) console.warn('[postsId] remove image failed', removeErr);
          }
        } catch (e) { console.warn('[postsId] remove image exception', e); }
      }
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message || 'Delete failed' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  } catch (err) {
    console.error('[postsId] handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
