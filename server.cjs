require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.DEV_SERVER_PORT || 3000;

// Preferred origin for constructing absolute URLs in emails / previews.
// Prefer an explicit SITE_URL in production, otherwise fall back to dev origins.
const preferredOrigin = process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || process.env.DEV_SERVER_ORIGIN || 'https://www.franceparts.be';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing. Server will still run but DB ops will fail.');
}

const supabaseAdmin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(bodyParser.json());

// Simple CORS + preflight handler so browser preflight (OPTIONS) requests
// to API endpoints (e.g. /api/admin-confirm-reset) don't receive 405 responses.
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Upload-Token, X-Upload-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Serve the project's public assets (so preview HTML can reference /assets/logo.png)
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
// Fallback: serve assets from src/assets (useful in dev where images live in src)
app.use('/assets', express.static(path.join(__dirname, 'src', 'assets')));

function validateEmail(input) {
  if (!input) return null;
  const email = String(input).trim().toLowerCase();
  // basic sanity checks
  if (email.length > 320) return null;
  // stricter email pattern (no whitespace) — disallow SQL/LIKE wildcards % and _ for safety
  const emailRe = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRe.test(email)) return null;
  if (email.includes('%') || email.includes('_')) return null;
  return email;
}

// Escape HTML special characters to prevent HTML injection when constructing HTML email bodies
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Basic validation for storage paths used with Supabase createSignedUrl/upload
function isSafeStoragePath(p) {
  if (!p || typeof p !== 'string') return false;
  // disallow absolute paths and path traversal
  if (p.includes('..') || p.startsWith('/') || p.startsWith('\\')) return false;
  // allow common filename chars and slashes; limit length
  if (p.length > 800) return false;
  return /^[a-zA-Z0-9_\-\.\/]+$/.test(p);
}

// --- Simple token helpers (HMAC signed JSON token)
const crypto = require('crypto');
function signToken(obj, secret) {
  const payload = Object.assign({}, obj);
  const json = JSON.stringify(payload);
  const b = Buffer.from(json).toString('base64url');
  const mac = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
  return `${b}.${mac}`;
}
function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const [b, mac] = parts;
  const expected = crypto.createHmac('sha256', String(secret)).update(b).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(mac, 'hex'))) return false;
  try {
    const json = Buffer.from(b, 'base64url').toString('utf8');
    const obj = JSON.parse(json);
    if (obj.exp && Date.now() > obj.exp) return false;
    return obj;
  } catch (e) {
    return false;
  }
}

app.post('/api/admin-request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) {
      console.error('supabase lookup error', adminErr);
      return res.status(500).json({ error: 'internal' });
    }

    // If no admin is associated with the provided email, return a clear error so the UI
    // can verify before attempting to send a reset link.
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });

  const token = (Math.floor(100000 + Math.random() * 900000)).toString();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from('admin_reset_tokens').insert({ admin_id: admin.id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertErr) {
      console.error('insert token error', insertErr);
      return res.status(500).json({ error: 'could not create token' });
    }

  // Prepare reset link and email content
    const site_name = process.env.SITE_NAME || 'FranceParts';
    const support_email = process.env.SUPPORT_EMAIL || 'support@franceparts.example';
    const expires_in_minutes = 10;
  const resetLink = `${process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || 'https://www.franceparts.be'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(admin.email)}`;

    // If SMTP envs are provided, use nodemailer (recommended for Gmail with App Password)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const subject = `Réinitialisation du mot de passe — ${site_name}`;
    const displayName = (admin && admin.username) ? escapeHtml(admin.username) : '';
    const greeting = displayName ? `Bonjour ${displayName},` : 'Bonjour,';

  // Plain-text fallback for email clients that don't render HTML
  const plainText = `${greeting}\n\n` +
    `Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte ${site_name}.\n\n` +
    `Pour choisir un nouveau mot de passe, ouvrez ce lien (expirera dans ${expires_in_minutes} minutes):\n${resetLink}\n\n` +
    `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.\n\n` +
    `— L'équipe ${site_name}`;

    const htmlContent = `<!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Réinitialisation du mot de passe — ${site_name}</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          background-color: #0b1220;
          color: #f3f4f6;
          margin: 0;
          padding: 24px 12px;
        }
        .email-wrapper {
          max-width: 680px;
          margin: 20px auto;
          background: #0f1724;
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(2,6,23,0.6);
          overflow: hidden;
          border: 1px solid rgba(255,223,0,0.06);
        }
        .email-header {
          background: #0b1220;
          padding: 28px 24px;
          text-align: center;
        }
        .brand { color: #ffd43b; font-weight:800; font-size:28px; margin:0 }
        .email-body { padding: 28px 24px; color: #e6eef8 }
        h1 { font-size:18px; color:#fff; margin:0 0 12px }
        p { margin:0 0 14px 0; line-height:1.6; color:#cfe3ff }
        a.button {
          display:inline-block; background:#ffd43b; color:#0b1220; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:700
        }
        .link-fallback { margin-top:12px; font-size:13px; color:#9fb3d9; word-break:break-all }
        .footer { padding:16px 22px; text-align:center; border-top:1px solid rgba(255,255,255,0.03); font-size:13px; color:#9fb3d9; background:transparent }
        .footer a { color:#ffd43b; text-decoration:none }
        @media (max-width:520px) { .email-body { padding:18px 16px } a.button { width:100%; text-align:center } }
      </style>
    </head>
    <body>
      <div class="email-wrapper" role="article" aria-label="Réinitialisation du mot de passe">
        <div class="email-header">
          <div class="brand">${site_name}</div>
        </div>
          <div class="email-body">
          <h1>Réinitialisation de votre mot de passe</h1>
          <p>${greeting}</p>
          <p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte <strong>${site_name}</strong>.</p>
          <p><a href="${resetLink}" target="_blank" rel="noopener" class="button">Réinitialiser mon mot de passe</a></p>
          <p class="link-fallback">Ce lien expirera dans <strong>${expires_in_minutes} minutes</strong>.<br>If the button doesn't work, copy-paste this link into your browser:<br><a href="${resetLink}" target="_blank" style="color:#ffd43b">${resetLink}</a></p>
          <p style="font-size:13px;color:#9fb3d9;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail ou contactez notre support.</p>
          <p style="margin-top:18px;font-size:14px;color:#cfe3ff">Cordialement,<br>L’équipe <strong>${site_name}</strong></p>
        </div>
        
      </div>
    </body>
    </html>`;

    // Require SMTP configuration for sending emails in this deployment
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error('SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
      return res.status(500).json({ error: 'SMTP not configured' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465, // true for 465, false for 587
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpUser,
        to: admin.email,
        subject,
        text: plainText,
        html: htmlContent,
      });

      return res.json({ ok: true });
    } catch (sendErr) {
      console.error('SMTP send failed', sendErr);
      return res.status(500).json({ error: 'SMTP send failed' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Endpoint to check whether an email belongs to an admin (used by the UI to verify before sending)
app.post('/api/admin-check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) {
      console.error('supabase lookup error', adminErr);
      return res.status(500).json({ error: 'internal' });
    }

    if (!admin) return res.status(404).json({ error: 'admin_not_found' });
    return res.json({ ok: true, exists: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Server-backed admin login: verify password against the admins table.
app.post('/api/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Missing password' });
    let admin;
    if (email) {
      const emailNorm = validateEmail(email);
      if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });
      const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').ilike('email', emailNorm).limit(1).maybeSingle();
      if (error) { console.error('supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
      admin = data;
    } else {
      // No email provided: fall back to the first admin row (single-admin setups)
      const { data, error } = await supabaseAdmin.from('admins').select('id,email,password_hash').limit(1).maybeSingle();
      if (error) { console.error('supabase lookup error', error); return res.status(500).json({ error: 'internal' }); }
      admin = data;
    }

    if (!admin) return res.status(404).json({ error: 'admin_not_found' });

    const valid = await bcrypt.compare(String(password), admin.password_hash || '');
    if (!valid) return res.status(403).json({ error: 'invalid_credentials' });

    // Successful login. Return minimal info only.
    // create a server-side session cookie for the admin
    try {
      const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
      if (cookieSecret) {
        const now = Date.now();
        const sessionPayload = { sub: admin.id, email: admin.email, iat: now, exp: now + (8 * 60 * 60 * 1000) }; // 8 hours
        const sessionToken = signToken(sessionPayload, cookieSecret);
        // set httpOnly cookie
        const secure = process.env.NODE_ENV === 'production';
        res.cookie('admin_session', sessionToken, { httpOnly: true, sameSite: 'lax', secure, maxAge: 8 * 60 * 60 * 1000 });
      }
      return res.json({ ok: true, email: admin.email });
    } catch (e) {
      console.warn('failed to create admin session', e);
      return res.json({ ok: true, email: admin.email });
    }
  } catch (err) {
    console.error('admin-login error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Helper: parse cookies from header (simple)
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

// Helper: check admin session cookie
function isAdminSession(req) {
  try {
    const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
    if (!cookieSecret) return false;
    const cookies = parseCookies(req);
    const sessionToken = cookies['admin_session'];
    if (!sessionToken) return false;
    const session = verifyToken(sessionToken, cookieSecret);
    return !!session;
  } catch (e) {
    return false;
  }
}

// Public endpoint: receive contact submissions from the site and store them in Supabase
app.post('/api/contact', async (req, res) => {
  try {
    const { nom, email, telephone, message } = req.body || {};
    if (!nom || !String(nom).trim()) return res.status(400).json({ error: 'name_required' });
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'invalid_email' });
    if (!message || !String(message).trim()) return res.status(400).json({ error: 'message_required' });

    const payload = {
      name: String(nom).trim(),
      email: emailNorm,
      phone: telephone ? String(telephone).trim() : null,
      message: String(message).trim(),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from('contacts').insert([payload]).select().single();
    if (error) {
      console.error('insert contact error', error);
      return res.status(500).json({ error: 'db_error' });
    }

    // Send notification email to support (non-blocking for the API response)
    (async () => {
      try {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const support_email = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@franceparts.example';
        if (smtpHost && smtpPort && smtpUser && smtpPass && support_email) {
          try {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: Number(smtpPort),
              secure: Number(smtpPort) === 465,
              auth: { user: smtpUser, pass: smtpPass },
            });

            const subject = `Nouveau message de contact — ${escapeHtml(payload.name)}`;
            const plain = `Nouveau message reçu:\n\nNom: ${payload.name}\nEmail: ${payload.email}\nTelephone: ${payload.phone || '-'}\nDate: ${payload.created_at}\n\nMessage:\n${payload.message}\n`;
            const safeName = escapeHtml(payload.name);
            const safeEmail = escapeHtml(payload.email);
            const safePhone = payload.phone ? escapeHtml(payload.phone) : '-';
            const safeMessageHtml = escapeHtml(payload.message || '').replace(/\n/g, '<br/>');
            const html = `<p>Vous avez reçu un nouveau message de contact :</p>
              <ul>
                <li><strong>Nom:</strong> ${safeName}</li>
                <li><strong>Email:</strong> ${safeEmail}</li>
                <li><strong>Téléphone:</strong> ${safePhone}</li>
                <li><strong>Date:</strong> ${payload.created_at}</li>
              </ul>
              <h3>Message</h3>
              <p>${safeMessageHtml}</p>`;

            await transporter.sendMail({ from: process.env.SMTP_FROM || smtpUser, to: support_email, subject, text: plain, html });
          } catch (mailErr) {
            console.error('contact notification send failed', mailErr);
          }
        }
      } catch (err) {
        console.error('contact notification error', err);
      }
    })();

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('contact POST error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Admin-only: list contact submissions
app.get('/api/contacts', async (req, res) => {
  try {
    const ok = isAdminSession(req);
    if (!ok) return res.status(401).json({ error: 'unauthorized' });
    const { data, error } = await supabaseAdmin.from('contacts').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) {
      console.error('select contacts error', error);
      return res.status(500).json({ error: 'db_error' });
    }
    return res.status(200).json({ data });
  } catch (err) {
    console.error('contacts GET error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Admin-only: delete a contact submission
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const ok = isAdminSession(req);
    if (!ok) return res.status(401).json({ error: 'unauthorized' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'missing_id' });
    const { error } = await supabaseAdmin.from('contacts').delete().eq('id', id);
    if (error) {
      console.error('delete contact error', error);
      return res.status(500).json({ error: 'db_error' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contacts DELETE error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Endpoint: exchange an authenticated session cookie for a short-lived upload token
app.post('/api/admin-token', async (req, res) => {
  try {
    const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
    if (!cookieSecret) return res.status(500).json({ error: 'Server not configured for sessions' });
    const cookies = parseCookies(req);
    const sessionToken = cookies['admin_session'];
    if (!sessionToken) return res.status(401).json({ error: 'no_session' });
    const session = verifyToken(sessionToken, cookieSecret);
    if (!session) return res.status(401).json({ error: 'invalid_session' });
    // create upload token signed with UPLOAD_TOKEN_SECRET (if configured)
    const uploadSecret = process.env.UPLOAD_TOKEN_SECRET;
    if (!uploadSecret) return res.status(500).json({ error: 'upload token not configured' });
    const now = Date.now();
    const uploadPayload = { sub: session.sub, email: session.email, iat: now, exp: now + (60 * 60 * 1000) };
    const uploadToken = signToken(uploadPayload, uploadSecret);
    return res.json({ token: uploadToken });
  } catch (e) {
    console.error('admin-token error', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Endpoint: logout and clear session cookie
app.post('/api/admin-logout', (req, res) => {
  try {
    res.clearCookie('admin_session');
    return res.json({ ok: true });
  } catch (e) {
    console.error('logout error', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Create a signed URL for a storage path (requires SUPABASE_SERVICE_ROLE_KEY)
app.post('/api/signed-url', async (req, res) => {
  try {
    const { path, expires } = req.body || {};
    if (!path) return res.status(400).json({ error: 'path required' });
    const ttl = typeof expires === 'number' ? expires : 60 * 60; // default 1 hour
    const { data, error } = await supabaseAdmin.storage.from('blog-images').createSignedUrl(path, ttl);
    if (error) {
      console.error('createSignedUrl error', error);
      return res.status(500).json({ error: error.message || 'signed url failed' });
    }
    return res.json({ signedUrl: data?.signedUrl ?? null });
  } catch (e) {
    console.error('signed-url route error', e);
    return res.status(500).json({ error: 'internal' });
  }
});

// Development convenience: delegate upload/posts routes to the in-repo ESM handlers
// This allows the front-end to call /api/upload and /api/posts without running a separate dev-upload-server.
const { pathToFileURL } = require('url');
function esmModuleUrl(relPath) {
  return pathToFileURL(path.join(__dirname, relPath)).href;
}

app.post('/api/upload', async (req, res) => {
  try {
    const mod = await import(esmModuleUrl('api/upload.js'));
    if (mod && typeof mod.default === 'function') return await mod.default(req, res);
    return res.status(500).json({ error: 'upload handler not available' });
  } catch (err) {
    console.error('delegate /api/upload failed', err);
    return res.status(500).json({ error: 'delegate_failed' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const mod = await import(esmModuleUrl('api/posts.js'));
    if (mod && typeof mod.default === 'function') return await mod.default(req, res);
    return res.status(500).json({ error: 'posts handler not available' });
  } catch (err) {
    console.error('delegate /api/posts (POST) failed', err);
    return res.status(500).json({ error: 'delegate_failed' });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  try {
    const mod = await import(esmModuleUrl('api/posts.js'));
    if (mod && typeof mod.default === 'function') return await mod.default(req, res);
    return res.status(500).json({ error: 'posts handler not available' });
  } catch (err) {
    console.error('delegate /api/posts (PUT) failed', err);
    return res.status(500).json({ error: 'delegate_failed' });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const mod = await import(esmModuleUrl('api/posts.js'));
    if (mod && typeof mod.default === 'function') return await mod.default(req, res);
    return res.status(500).json({ error: 'posts handler not available' });
  } catch (err) {
    console.error('delegate /api/posts (DELETE) failed', err);
    return res.status(500).json({ error: 'delegate_failed' });
  }
});

// Delegate sitemap route to in-repo handler (development convenience)
app.get('/api/sitemap.xml', async (req, res) => {
  try {
    const mod = await import(esmModuleUrl('api/sitemap.xml.js'));
    if (mod && typeof mod.default === 'function') return await mod.default(req, res);
    return res.status(500).json({ error: 'sitemap handler not available' });
  } catch (err) {
    console.error('delegate /api/sitemap.xml failed', err);
    return res.status(500).json({ error: 'delegate_failed' });
  }
});

// Preview route to view the reset email HTML without sending it
app.get('/api/_preview-reset-email', (req, res) => {
  const email = req.query.email || 'user@example.com';
  const token = req.query.token || '123456';
  const displayName = req.query.username || '';
  const greeting = displayName ? `Bonjour ${displayName},` : 'Bonjour,';
  const site_name = process.env.SITE_NAME || 'FranceParts';
  const support_email = process.env.SUPPORT_EMAIL || 'support@franceparts.example';
  const expires_in_minutes = req.query.expires || '10';
  const resetLink = `${process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || 'https://www.franceparts.be'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;


const htmlContent = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Réinitialisation du mot de passe — ${site_name}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
      background-color: #f6f8fb;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .email-wrapper {
      max-width: 680px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(17, 24, 39, 0.08);
      overflow: hidden;
    }
    .email-header {
      text-align: center;
      background: linear-gradient(135deg, #0f172a, #1e293b);
      padding: 36px 24px;
    }
    .brand { color: #111827; font-weight:800; font-size:32px; margin:0 }
    .email-body {
      padding: 36px 28px;
    }
    h1 {
      font-size: 20px;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      margin: 0 0 14px 0;
      line-height: 1.6;
    }
    a.button {
      display: inline-block;
      margin-top: 20px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 14px 26px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      transition: background 0.2s ease;
    }
    a.button:hover {
      background-color: #1d4ed8;
    }
    .link-fallback {
      margin-top: 16px;
      font-size: 13px;
      color: #6b7280;
      word-break: break-all;
    }
    .footer {
      padding: 20px 28px;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      font-size: 13px;
      color: #6b7280;
      background: #fafafa;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    @media (max-width: 520px) {
      .email-body { padding: 24px 20px; }
      a.button { width: 100%; text-align: center; }
    }
  </style>
</head>
<body>
    <div class="email-wrapper" role="article" aria-label="Réinitialisation du mot de passe">
    <div class="email-header">
      <div class="brand">${site_name}</div>
    </div>
    <div class="email-body">
      <h1>Réinitialisation de votre mot de passe</h1>
      <p>${greeting}</p>
      <p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte <strong>${site_name}</strong>.</p>
      <p>Pour choisir un nouveau mot de passe, cliquez sur le bouton ci-dessous :</p>
      <p><a href="${resetLink}" target="_blank" rel="noopener" class="button">Réinitialiser mon mot de passe</a></p>
      <p class="link-fallback">
        Ce lien expirera dans <strong>${expires_in_minutes} minutes</strong>.<br>
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <a href="${resetLink}" target="_blank" style="color:#2563eb;">${resetLink}</a>
      </p>
      <p style="font-size:13px;color:#6b7280;">
        Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail ou contactez notre support.
      </p>
      <p style="margin-top:20px;font-size:14px;color:#374151;">Cordialement,<br>L’équipe <strong>${site_name}</strong></p>
    </div>
  
  </div>
</body>
</html>`;

  // Send the constructed HTML content
  res.type('html').send(htmlContent);
});

  app.post('/api/admin-confirm-reset', async (req, res) => {
    try {
    const { email, token, new_password } = req.body;
    if (!email || !token || !new_password) return res.status(400).json({ error: 'Missing fields' });
    // received password reset confirmation request
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });
    // token should be reasonably short
    if (String(token).length > 64) return res.status(400).json({ error: 'Invalid token' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) {
      console.error('confirm-reset supabase lookup error', adminErr);
      return res.status(500).json({ error: 'supabase lookup error', details: adminErr });
    }
    if (!admin) {
      console.warn('confirm-reset: no admin found for email', email);
      return res.status(400).json({ error: 'Invalid token or email' });
    }

    const { data: tokens, error: tokenErr } = await supabaseAdmin.from('admin_reset_tokens').select('*').eq('admin_id', admin.id).eq('used', false).order('created_at', { ascending: false }).limit(1);
    if (tokenErr) {
      console.error('confirm-reset token lookup error', tokenErr);
      return res.status(500).json({ error: 'token lookup error', details: tokenErr });
    }
    if (!tokens || tokens.length === 0) {
      console.warn('confirm-reset: no tokens found for admin id', admin.id);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const tr = tokens[0];
    if (new Date(tr.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }

    const valid = await bcrypt.compare(token, tr.token_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const { error: updErr } = await supabaseAdmin.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
    if (updErr) {
      console.error('confirm-reset update password error', updErr);
      return res.status(500).json({ error: 'update password error', details: updErr });
    }

    const { error: markErr } = await supabaseAdmin.from('admin_reset_tokens').update({ used: true }).eq('id', tr.id);
    if (markErr) {
      console.error('confirm-reset mark token used error', markErr);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Server-backed change password endpoint
app.post('/api/admin-change-password', async (req, res) => {
  try {
    const { email, current_password, new_password } = req.body;
    if (!email || !current_password || !new_password) return res.status(400).json({ error: 'Missing fields' });
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });
    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username,password_hash').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) { console.error('supabase lookup error', adminErr); return res.status(500).json({ error: 'internal' }); }
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });

    const valid = await bcrypt.compare(current_password, admin.password_hash || '');
    if (!valid) return res.status(403).json({ error: 'invalid_current_password' });

    // password strength server-side (min 8, one uppercase and one digit)
    if (new_password.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      return res.status(400).json({ error: 'weak_password' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    const { error: updErr } = await supabaseAdmin.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
    if (updErr) { console.error('update password error', updErr); return res.status(500).json({ error: 'update_error' }); }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Server-backed change email endpoint (requires current password verification)
app.post('/api/admin-change-email', async (req, res) => {
  try {
    const { email, current_password, new_email } = req.body;
    if (!email || !current_password || !new_email) return res.status(400).json({ error: 'Missing fields' });
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });
    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username,password_hash').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) { console.error('supabase lookup error', adminErr); return res.status(500).json({ error: 'internal' }); }
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });

    const valid = await bcrypt.compare(current_password, admin.password_hash || '');
    if (!valid) return res.status(403).json({ error: 'invalid_current_password' });

  const newEmailNorm = validateEmail(new_email);
  if (!newEmailNorm) return res.status(400).json({ error: 'Invalid new email' });
    // ensure not already used
    const { data: existing, error: existErr } = await supabaseAdmin.from('admins').select('id').ilike('email', newEmailNorm).limit(1).maybeSingle();
    if (existErr) { console.error('supabase lookup error', existErr); return res.status(500).json({ error: 'internal' }); }
    if (existing) return res.status(409).json({ error: 'email_taken' });

    const { error: updErr } = await supabaseAdmin.from('admins').update({ email: newEmailNorm }).eq('id', admin.id);
    if (updErr) { console.error('update email error', updErr); return res.status(500).json({ error: 'update_error' }); }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Simple tarifs read endpoint so the front-end can fetch pricing.
app.get('/api/tarifs', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('tarifs').select('*').order('created_at', { ascending: true });
    if (error) { console.error('supabase select tarifs error', error); return res.status(500).json({ error: error.message || 'Select failed' }); }
    return res.status(200).json({ data });
  } catch (err) {
    console.error('tarifs route error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: authorize admin requests for tarifs (supports UPLOAD_SECRET header or x-upload-token)
async function isAuthorizedForTarifs(req) {
  try {
    const expected = process.env.UPLOAD_SECRET;
    const tokenSecret = process.env.UPLOAD_TOKEN_SECRET;
    let authorized = false;

    if (tokenSecret) {
      const providedToken = req.headers['x-upload-token'];
      if (providedToken) {
        try {
          const parts = String(providedToken).split('.');
          if (parts.length === 2) {
            const [b, mac] = parts;
            const expectedMac = crypto.createHmac('sha256', String(tokenSecret)).update(b).digest('hex');
            if (crypto.timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(mac, 'hex'))) {
              const json = Buffer.from(b, 'base64url').toString('utf8');
              const obj = JSON.parse(json);
              if (!obj.exp || Date.now() <= obj.exp) authorized = true;
            }
          }
        } catch (e) { /* ignore */ }
      }
    }

    if (!authorized && expected) {
      const provided = req.headers['x-upload-secret'] || req.headers['X-Upload-Secret'];
      if (provided && provided === expected) authorized = true;
    }

    return authorized;
  } catch (e) { return false; }
}

// Admin: create (or seed) tarifs
app.post('/api/tarifs', async (req, res) => {
  try {
    // seed path: POST /api/tarifs with URL ending in /seed
    if ((req.url || '').endsWith('/seed')) {
      const ok = await isAuthorizedForTarifs(req);
      if (!ok) return res.status(401).json({ error: 'Unauthorized' });
      // simple seed: remove all and insert defaults if provided
      const DEFAULT_PRICING = [
        { service: 'Diagnostic rapide', price: '29€', description: 'Diagnostic électronique complet de votre véhicule', features: ['Lecture des codes défaut', 'Rapport détaillé', 'Conseils de réparation', 'Durée: 30 minutes'], popular: false },
        { service: 'Pièce d\'occasion', price: 'À partir de 15€', description: 'Pièces d\'occasion vérifiées et garanties', features: ['Pièces testées', 'Garantie 6 mois', 'Large choix', 'Disponibilité immédiate'], popular: true },
        { service: 'Pièce neuve', price: 'À partir de 49€', description: 'Pièces neuves d\'origine constructeur', features: ["Pièces d'origine", 'Garantie constructeur', 'Commande rapide', 'Livraison possible'], popular: false }
      ];
      try {
        await supabaseAdmin.from('tarifs').delete().neq('id', '');
        const inserts = DEFAULT_PRICING.map(p => ({ service: p.service, price: p.price, description: p.description, features: p.features, popular: p.popular || false }));
        const { data, error } = await supabaseAdmin.from('tarifs').insert(inserts).select();
        if (error) { console.error('seed insert error', error); return res.status(500).json({ error: error.message || 'Seed failed' }); }
        return res.status(200).json({ data });
      } catch (e) { console.error('seed error', e); return res.status(500).json({ error: 'Seed failed' }); }
    }

    const authorized = await isAuthorizedForTarifs(req);
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    const payload = req.body;
    if (!payload || !payload.service) return res.status(400).json({ error: 'Invalid payload' });
    const toInsert = { service: payload.service, price: payload.price || '', description: payload.description || '', features: payload.features || [], popular: !!payload.popular };
    const { data, error } = await supabaseAdmin.from('tarifs').insert([toInsert]).select().single();
    if (error) { console.error('supabase insert tarifs error', error); return res.status(500).json({ error: error.message || 'Insert failed' }); }
    return res.status(200).json({ data });
  } catch (err) {
    console.error('tarifs POST error', err);
    return res.status(500).json({ error: 'internal' });
  }
});

// Admin: update tarif (supports PUT /api/tarifs/:id or /api/tarifs/<id>)
app.put('/api/tarifs/:id', async (req, res) => {
  try {
    const authorized = await isAuthorizedForTarifs(req);
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const updates = req.body || {};
    delete updates.id;
    const { data, error } = await supabaseAdmin.from('tarifs').update(updates).eq('id', id).select().single();
    if (error) { console.error('supabase update tarifs error', error); return res.status(500).json({ error: error.message || 'Update failed' }); }
    return res.status(200).json({ data });
  } catch (err) { console.error('tarifs PUT error', err); return res.status(500).json({ error: 'internal' }); }
});

// Admin: delete tarif
app.delete('/api/tarifs/:id', async (req, res) => {
  try {
    const authorized = await isAuthorizedForTarifs(req);
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { error } = await supabaseAdmin.from('tarifs').delete().eq('id', id);
    if (error) { console.error('supabase delete tarifs error', error); return res.status(500).json({ error: error.message || 'Delete failed' }); }
    return res.status(200).json({ success: true });
  } catch (err) { console.error('tarifs DELETE error', err); return res.status(500).json({ error: 'internal' }); }
});

app.listen(PORT, () => console.log(`Dev API server listening on http://localhost:${PORT}`));
