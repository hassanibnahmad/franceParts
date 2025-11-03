import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE envs');
    return res.status(500).json({ error: 'Server misconfigured: missing SUPABASE env' });
  }

  if (!supabaseAdmin) {
    try {
      supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } catch (e) {
      console.error('supabase init failed', e);
      return res.status(500).json({ error: 'Server misconfigured: supabase init failed' });
    }
  }

  try {
    const { email } = req.body || {};
    const emailNorm = validateEmail(email);
    if (!emailNorm) return res.status(400).json({ error: 'Invalid email' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email,username').ilike('email', emailNorm).limit(1).maybeSingle();
    if (adminErr) { console.error('supabase lookup error', adminErr); return res.status(500).json({ error: 'internal' }); }
    if (!admin) return res.status(404).json({ error: 'admin_not_found' });

    const token = (Math.floor(100000 + Math.random() * 900000)).toString();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from('admin_reset_tokens').insert({ admin_id: admin.id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertErr) { console.error('insert token error', insertErr); return res.status(500).json({ error: 'could not create token' }); }

    // prepare reset link and email
    const site_name = process.env.SITE_NAME || 'FranceParts';
    const support_email = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || 'support@franceparts.example';
    const resetLink = `${process.env.DEV_SITE_ORIGIN || 'http://localhost:5173'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(admin.email)}`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(smtpPort), secure: Number(smtpPort) === 465, auth: { user: smtpUser, pass: smtpPass } });
        const subject = `Réinitialisation du mot de passe — ${site_name}`;

        const plainText = `${admin.username ? `Bonjour ${admin.username},\n\n` : 'Bonjour,\n\n'}` +
          `Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte ${site_name}.\n\n` +
          `Pour choisir un nouveau mot de passe, ouvrez ce lien (il expirera dans 10 minutes):\n${resetLink}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.\n\nCordialement,\nL'équipe ${site_name}`;

        const htmlContent = `<!doctype html>
        <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Réinitialisation du mot de passe — ${site_name}</title>
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial; background-color:#0b1220; color:#f3f4f6; margin:0; padding:24px 12px }
            .email-wrapper { max-width:680px; margin:20px auto; background:#0f1724; border-radius:10px; overflow:hidden; border:1px solid rgba(255,223,0,0.06) }
            .email-header { background:#0b1220; padding:28px 24px; text-align:center }
            .brand { color:#ffd43b; font-weight:800; font-size:28px; margin:0 }
            .email-body { padding:28px 24px; color:#e6eef8 }
            a.button { display:inline-block; background:#ffd43b; color:#0b1220; text-decoration:none; padding:12px 22px; border-radius:8px; font-weight:700 }
            .link-fallback { margin-top:12px; font-size:13px; color:#9fb3d9; word-break:break-all }
            .footer { padding:16px 22px; text-align:center; border-top:1px solid rgba(255,255,255,0.03); font-size:13px; color:#9fb3d9 }
            @media (max-width:520px) { .email-body { padding:18px 16px } a.button { width:100%; text-align:center } }
          </style>
        </head>
        <body>
          <div class="email-wrapper" role="article" aria-label="Réinitialisation du mot de passe">
            <div class="email-header"><div class="brand">${site_name}</div></div>
            <div class="email-body">
              <h1>Réinitialisation de votre mot de passe</h1>
              <p>${admin.username ? `Bonjour ${admin.username},` : 'Bonjour,'}</p>
              <p>Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte <strong>${site_name}</strong>.</p>
              <p><a href="${resetLink}" target="_blank" rel="noopener" class="button">Réinitialiser mon mot de passe</a></p>
              <p class="link-fallback">Ce lien expirera dans <strong>10 minutes</strong>.<br />If the button doesn't work, copy-paste this link into your browser:<br /><a href="${resetLink}" target="_blank" style="color:#ffd43b">${resetLink}</a></p>
              <p style="margin-top:18px;font-size:14px;color:#cfe3ff">Cordialement,<br/>L’équipe <strong>${site_name}</strong></p>
            </div>
          </div>
        </body>
        </html>`;

        // log the reset link to function logs (safe-ish) so we can inspect what was sent
        console.log('admin-request-reset: sending reset email', { to: admin.email, resetLink });

        const info = await transporter.sendMail({ from: process.env.SMTP_FROM || smtpUser, to: admin.email, subject, text: plainText, html: htmlContent });
        console.log('admin-request-reset: sendMail result', { messageId: info && info.messageId });
      } catch (sendErr) { console.error('SMTP send failed', sendErr); }
    } else {
      console.error('SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in env');
      return res.status(500).json({ error: 'SMTP not configured' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('admin-request-reset error', err);
    return res.status(500).json({ error: 'internal' });
  }
}
