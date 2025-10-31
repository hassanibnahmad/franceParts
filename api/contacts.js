import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const obj = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    obj[key] = val;
  });
  return obj;
}

function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [b, mac] = parts;
  try {
    const expected = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
    if (expected !== mac) return null;
    const json = Buffer.from(b, 'base64url').toString('utf8');
    const obj = JSON.parse(json);
    // basic expiry check
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch (e) {
    return null;
  }
}

export default async function contactsHandler(req, res) {
  const DEBUG = process.env.DEBUG_API === 'true';
  if (DEBUG) console.log('[contacts] incoming', { method: req.method, url: req.url, headers: req.headers, body: req.body });

  // Allow GET for listing and POST {_action:'delete', id} as a CDN-safe delete fallback
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const cookies = parseCookies(req);
    const token = cookies.admin_session;
    const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
    const payload = verifyToken(token, cookieSecret);
    if (!payload) return res.status(401).json({ error: 'unauthorized' });
    // lazy init supabase
    if (!supabaseAdmin) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('contacts handler missing SUPABASE envs');
        return res.status(500).json({ error: 'internal' });
      }
      try { supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (e) { console.error('contacts supabase init failed', e); return res.status(500).json({ error: 'internal' }); }
    }

    if (req.method === 'POST') {
      // support POST {_action:'delete', id} as a fallback when DELETE is blocked
      const body = req.body || {};
      if (body._action !== 'delete') return res.status(405).json({ error: 'Method not allowed' });
      const id = body.id;
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const { error } = await supabaseAdmin.from('contacts').delete().eq('id', id);
      if (error) { console.error('supabase contacts delete error', error); return res.status(500).json({ error: 'internal' }); }
      return res.json({ ok: true });
    }

    const { data, error } = await supabaseAdmin.from('contacts').select('*').order('created_at', { ascending: false });
    if (error) { console.error('supabase contacts fetch error', error); return res.status(500).json({ error: 'internal' }); }
    return res.json({ ok: true, contacts: data || [] });
  } catch (err) {
    console.error('contacts handler error', err);
    return res.status(500).json({ error: 'internal' });
  }
}
