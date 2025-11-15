import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
// Do not create the Supabase client at module load time — initialize inside the handler
// after verifying envs. Creating at load time can throw or cause runtime errors
// in serverless environments when envs are not present.
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

function signToken(obj, secret) {
  const payload = Object.assign({}, obj);
  const json = JSON.stringify(payload);
  const b = Buffer.from(json).toString('base64url');
  const mac = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
  return `${b}.${mac}`;
}

function verifyToken(token, secret) {
  if (!token || !secret) return null;
  try {
    const parts = String(token).split('.');
    if (parts.length !== 2) return null;
    const [b, mac] = parts;
    const expected = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(mac, 'hex'))) return null;
    const json = Buffer.from(b, 'base64url').toString('utf8');
    const obj = JSON.parse(json);
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch (e) { return null; }
}

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Upload-Token, X-Upload-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
}

export default async function adminHandler(req, res) {
  try {
    // lightweight request tracing for debugging on Vercel
    console.log('[admin] incoming', { method: req.method, url: req.url });
  } catch (e) {}
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const path = (req.url || '').replace(/^\/api\/admin/, '') || '';

  const DEBUG = process.env.DEBUG_API === 'true';
    // Optional admin API secret protection (opt-in):
    // If ADMIN_API_SECRET is set in env, require that requests either
    // - include `Authorization: Bearer <ADMIN_API_SECRET>` OR
    // - present a valid `admin_session` cookie that verifies with COOKIE_SECRET
    // This allows server-to-server calls using the secret while keeping browser
    // admin flows working via secure session cookies.
    const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET;
    if (ADMIN_API_SECRET) {
      const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
      const bearer = String(authHeader || '');
      const providedSecret = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : (req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'] || '');
      // check cookie session if present
      let sessionOk = false;
      try {
        const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
        if (cookieSecret) {
          const cookieHeader = req.headers && req.headers.cookie;
          if (cookieHeader) {
            const match = cookieHeader.split(';').map(p=>p.trim()).find(p=>p.startsWith('admin_session='));
            if (match) {
              const token = match.split('=')[1];
              if (token) {
                const parts = String(token).split('.');
                // reuse simple verify logic: validate HMAC
                try {
                  const [b, mac] = parts;
                  const expected = require('crypto').createHmac('sha256', String(cookieSecret)).update(b).digest('hex');
                  if (mac && require('crypto').timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(mac))) {
                    sessionOk = true;
                  }
                } catch (e) {
                  sessionOk = false;
                }
              }
            }
          }
        }
      } catch (e) {
        sessionOk = false;
      }
      if (!sessionOk && String(providedSecret) !== String(ADMIN_API_SECRET)) {
        return res.status(401).json({ error: 'unauthorized', message: 'Missing or invalid admin secret or no valid session cookie.' });
      }
    }
  try {
    // sanity check envs
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
      return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
    }

    // initialize supabase client lazily so module load won't fail in environments
    // where envs are temporarily missing (and to avoid throwing during import)
    if (!supabaseAdmin) {
      try {
        supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      } catch (e) {
        console.error('failed to create supabase client', e);
        return res.status(500).json({ error: 'Server misconfigured: supabase init failed' });
      }
    }
    // POST /api/admin-login
    if (path === '/-login' || path === '/login' || req.url.endsWith('/admin-login')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { email, password } = req.body || {};
      if (!password) return res.status(400).json({ error: 'Missing password' });
      let admin;
      if (email) {
        const emailNorm = String(email).trim().toLowerCase();
        const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').ilike('email', emailNorm).limit(1).maybeSingle();
        if (error) { console.error('supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
        admin = data;
      } else {
        const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').limit(1).maybeSingle();
        if (error) { console.error('supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
        admin = data;
      }
      if (!admin) return res.status(404).json({ error: 'admin_not_found' });
      const valid = await bcrypt.compare(String(password), admin.password_hash || '');
      if (!valid) return res.status(403).json({ error: 'invalid_credentials' });
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
        return res.json({ ok: true, email: admin.email });
      } catch (e) {
        console.warn('failed to create admin session', e);
        return res.json({ ok: true, email: admin.email });
      }
    }

    // POST /api/admin-token
    if (path === '/-token' || path === '/token' || req.url.endsWith('/admin-token')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
      if (!cookieSecret) return res.status(500).json({ error: 'Server not configured for sessions' });
      const cookies = parseCookies(req);
      const sessionToken = cookies['admin_session'];
      if (!sessionToken) return res.status(401).json({ error: 'no_session' });
      const session = verifyToken(sessionToken, cookieSecret);
      if (!session) return res.status(401).json({ error: 'invalid_session' });
      const uploadSecret = process.env.UPLOAD_TOKEN_SECRET;
      if (!uploadSecret) return res.status(500).json({ error: 'upload token not configured' });
      const now = Date.now();
      const uploadPayload = { sub: session.sub, email: session.email, iat: now, exp: now + (60 * 60 * 1000) };
      const uploadToken = signToken(uploadPayload, uploadSecret);
      return res.json({ token: uploadToken });
    }

    // POST /api/admin-request-reset
    if (path === '/-request-reset' || path === '/request-reset' || req.url.endsWith('/admin-request-reset')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { email } = req.body || {};
      if (!email) return res.status(400).json({ error: 'Missing email' });
      const emailNorm = String(email).trim().toLowerCase();
      const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username').ilike('email', emailNorm).limit(1).maybeSingle();
      if (adminErr) { console.error('supabase lookup error', adminErr); return res.status(500).json({ error: 'internal' }); }
      if (!admin) return res.status(404).json({ error: 'admin_not_found' });
      const token = (Math.floor(100000 + Math.random() * 900000)).toString();
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { error: insertErr } = await supabaseAdmin.from('admin_reset_tokens').insert({ admin_id: admin.id, token_hash: tokenHash, expires_at: expiresAt });
      if (insertErr) { console.error('insert token error', insertErr); return res.status(500).json({ error: 'could not create token' }); }
      // send email if SMTP configured
      const smtpHost = process.env.SMTP_HOST; const smtpPort = process.env.SMTP_PORT; const smtpUser = process.env.SMTP_USER; const smtpPass = process.env.SMTP_PASS;
      const site_name = process.env.SITE_NAME || 'FranceParts';
      const support_email = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@franceparts.example';
      const resetLink = `${process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || 'https://www.franceparts.be'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(admin.email)}`;
      if (smtpHost && smtpPort && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
          const subject = `Réinitialisation du mot de passe — ${site_name}`;
          const plainText = `Bonjour,\n\nPour réinitialiser: ${resetLink}\n`;
          const html = `<p>Bonjour,</p><p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p>`;
          await transporter.sendMail({ from: process.env.SMTP_FROM || smtpUser, to: admin.email, subject, text: plainText, html });
        } catch (mailErr) { console.error('contact notification send failed', mailErr); }
      }
      return res.json({ ok: true });
    }

    // POST /api/admin-confirm-reset
    if (path === '/-confirm-reset' || path === '/confirm-reset' || req.url.endsWith('/admin-confirm-reset')) {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { email, token, new_password } = req.body || {};
      if (!email || !token || !new_password) return res.status(400).json({ error: 'Missing fields' });
      const emailNorm = String(email).trim().toLowerCase();
      const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username').ilike('email', emailNorm).limit(1).maybeSingle();
      if (adminErr) { console.error('confirm-reset supabase lookup error', adminErr); return res.status(500).json({ error: 'supabase lookup error' }); }
      if (!admin) return res.status(400).json({ error: 'Invalid token or email' });
      const { data: tokens, error: tokenErr } = await supabaseAdmin.from('admin_reset_tokens').select('*').eq('admin_id', admin.id).eq('used', false).order('created_at', { ascending: false }).limit(1);
      if (tokenErr) { console.error('confirm-reset token lookup error', tokenErr); return res.status(500).json({ error: 'token lookup error' }); }
      if (!tokens || tokens.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
      const tr = tokens[0];
      if (new Date(tr.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });
      const valid = await bcrypt.compare(token, tr.token_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid token' });
      const newHash = await bcrypt.hash(new_password, 10);
      const { error: updErr } = await supabaseAdmin.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
      if (updErr) { console.error('confirm-reset update password error', updErr); return res.status(500).json({ error: 'update password error' }); }
      try { await supabaseAdmin.from('admin_reset_tokens').update({ used: true }).eq('id', tr.id); } catch (e) { console.warn('mark token used failed', e); }
      return res.json({ ok: true });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (err) {
    // log stack for Vercel function logs
    console.error('admin handler error', err && err.stack ? err.stack : String(err));
    // Return limited error details only when DEBUG_API=true to avoid leaking secrets in production
    if (DEBUG) {
      return res.status(500).json({ error: 'internal', details: String(err && err.message ? err.message : err) });
    }
    return res.status(500).json({ error: 'internal' });
  }
}
