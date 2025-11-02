import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

function validateEmail(input) {
  if (!input) return null;
  const email = String(input).trim().toLowerCase();
  if (email.length > 320) return null;
  const emailRe = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRe.test(email)) return null;
  if (email.includes('%') || email.includes('_')) return null;
  return email;
}

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Upload-Token, X-Upload-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('admin-check-email missing SUPABASE envs');
      return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
    }
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
      console.error('admin-check-email supabase init failed', e);
      return res.status(500).json({ error: 'Server misconfigured: supabase init failed' });
    }
  }

  try {
    const { email } = req.body || {};
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

    const { data: admin, error: adminErr } = await supabase.from('admins').select('id,email').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) {
      console.error('supabase lookup error', adminErr);
      return res.status(500).json({ error: 'internal' });
    }
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });
    return res.json({ ok: true, exists: true });
  } catch (err) {
    console.error('admin-check-email error', err);
    return res.status(500).json({ error: 'internal' });
  }
}
