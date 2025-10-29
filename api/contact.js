import { createClient } from '@supabase/supabase-js';

function validateEmail(input) {
  if (!input) return null;
  const email = String(input).trim().toLowerCase();
  if (email.length > 320) return null;
  const emailRe = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRe.test(email)) return null;
  if (email.includes('%') || email.includes('_')) return null;
  return email;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // lazy init supabase admin client
    if (!supabaseAdmin) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('contact handler missing SUPABASE envs');
        return res.status(500).json({ error: 'Server misconfigured' });
      }
      try { supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY); } catch (e) { console.error('contact supabase init failed', e); return res.status(500).json({ error: 'Server misconfigured' }); }
    }
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase service key not configured — cannot store contact');
      return res.status(500).json({ error: 'Server not configured' });
    }

    const { data, error } = await supabaseAdmin.from('contacts').insert([payload]).select().single();
    if (error) {
      console.error('insert contact error', error);
      return res.status(500).json({ error: 'db_error' });
    }

    // Send notification email to support (non-blocking)
    (async () => {
      try {
        // Lazy import nodemailer to avoid bundling cost when not needed
        const nodemailer = await import('nodemailer');
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
}
