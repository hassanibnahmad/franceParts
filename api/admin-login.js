import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
}

function signToken(obj, secret) {
  const payload = Object.assign({}, obj);
  const json = JSON.stringify(payload);
  const b = Buffer.from(json).toString('base64url');
  const mac = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
  return `${b}.${mac}`;
}

export default async function adminLoginHandler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin-login] missing supabase envs');
      return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { email, password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Missing password' });

    let admin;
    if (email) {
      const emailNorm = String(email).trim().toLowerCase();
      const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').ilike('email', emailNorm).limit(1).maybeSingle();
      if (error) { console.error('[admin-login] supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
      admin = data;
    } else {
      const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').limit(1).maybeSingle();
      if (error) { console.error('[admin-login] supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
      admin = data;
    }

    if (!admin) return res.status(404).json({ error: 'admin_not_found' });
    const valid = await bcrypt.compare(String(password), admin.password_hash || '');
    if (!valid) return res.status(403).json({ error: 'invalid_credentials' });

    // create session cookie if possible
    try {
      const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
      if (cookieSecret) {
        const now = Date.now();
        const sessionPayload = { sub: admin.id, email: admin.email, iat: now, exp: now + (8 * 60 * 60 * 1000) };
        const sessionToken = signToken(sessionPayload, cookieSecret);
        const secure = process.env.NODE_ENV === 'production';
        const maxAge = 8 * 60 * 60; // seconds
        const cookieParts = [`admin_session=${sessionToken}`, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=${maxAge}`];
        if (secure) cookieParts.push('Secure');
        res.setHeader('Set-Cookie', cookieParts.join('; '));
      }
    } catch (e) {
      console.warn('[admin-login] failed to set cookie', e);
    }

    return res.json({ ok: true, email: admin.email });
  } catch (err) {
    console.error('[admin-login] error', err && err.stack ? err.stack : String(err));
    return res.status(500).json({ error: 'internal' });
  }
}
