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
        const plainText = `Bonjour,\n\nPour réinitialiser: ${resetLink}\n`;
        const html = `<p>Bonjour,</p><p><a href="${resetLink}">Réinitialiser mon mot de passe</a></p>`;
        await transporter.sendMail({ from: process.env.SMTP_FROM || smtpUser, to: admin.email, subject, text: plainText, html });
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
