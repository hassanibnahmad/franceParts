require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.DEV_SERVER_PORT || 3000;

if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL missing. Server will still run but DB ops will fail.');
}

const supabaseAdmin = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(bodyParser.json());

app.post('/api/admin-request-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id,email').eq('email', email).limit(1).maybeSingle();
    if (adminErr) console.error('supabase lookup error', adminErr);

    if (!admin) return res.json({ ok: true });

    const token = (Math.floor(100000 + Math.random() * 900000)).toString();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin.from('admin_reset_tokens').insert({ admin_id: admin.id, token_hash: tokenHash, expires_at: expiresAt });
    if (insertErr) {
      console.error('insert token error', insertErr);
      return res.status(500).json({ error: 'could not create token' });
    }

    const site_name = process.env.SITE_NAME || 'FranceParts';
    const support_email = process.env.SUPPORT_EMAIL || 'support@franceparts.example';
    const expires_in_minutes = 10;
    const resetLink = `${process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || 'https://www.franceparts.be'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(admin.email)}`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const subject = `Réinitialisation du mot de passe — ${site_name}`;
    const plainText = `Bonjour,\n\nVous avez demandé la réinitialisation du mot de passe pour votre compte ${site_name}.\n\nUtilisez ce code : ${token}\n\nOu cliquez sur le lien suivant pour réinitialiser le mot de passe (valide ${expires_in_minutes} minutes):\n${resetLink}\n\nSi vous n'avez pas demandé cette opération, ignorez ce message.\n\nCordialement,\nL'équipe ${site_name}`;

    const htmlContent = `<p>Bonjour,</p>\n<p>Vous avez demandé la réinitialisation du mot de passe pour votre compte <strong>${site_name}</strong>.</p>\n<p>Utilisez ce code : <strong>${token}</strong></p>\n<p>Ou cliquez sur le lien suivant pour réinitialiser le mot de passe (valide ${expires_in_minutes} minutes):<br><a href="${resetLink}">${resetLink}</a></p>\n<p>Si vous n'avez pas demandé cette opération, ignorez ce message.</p>\n<p>Cordialement,<br>L'équipe ${site_name}</p>`;

    // Require SMTP configuration for sending emails in this deployment
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error('SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
      return res.status(500).json({ error: 'SMTP not configured' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
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

// Preview route to view the reset email HTML without sending it
app.get('/api/_preview-reset-email', (req, res) => {
  const email = req.query.email || 'user@example.com';
  const token = req.query.token || '123456';
  const site_name = process.env.SITE_NAME || 'FranceParts';
  const support_email = process.env.SUPPORT_EMAIL || 'support@franceparts.example';
  const expires_in_minutes = req.query.expires || '10';
  const resetLink = `${process.env.SITE_URL || process.env.DEV_SITE_ORIGIN || 'https://www.franceparts.be'}/admin/reset?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Réinitialisation du mot de passe</title>
    <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#f6f7fb; color:#0f1724; margin:0; padding:0; }
    .container { max-width:600px; margin:28px auto; background:#ffffff; border-radius:8px; box-shadow:0 6px 18px rgba(16,24,40,0.08); overflow:hidden; }
    .header { background:#0f1724; color:#fff; padding:28px; text-align:center; }
    .brand { font-weight:800; font-size:32px; color:#ffd43b; margin:0 }
    .body { padding:28px; color:#111827; line-height:1.45; }
    .btn { display:inline-block; background:#f59e0b; color:#0f1724; text-decoration:none; padding:12px 20px; border-radius:6px; font-weight:600; margin:14px 0; }
    .muted { color:#6b7280; font-size:13px; }
    .footer { padding:18px 28px; font-size:13px; color:#6b7280; border-top:1px solid #f1f5f9; }
    .code { display:inline-block; background:#f3f4f6; border-radius:6px; padding:8px 12px; font-family:monospace; letter-spacing:1px; }
    @media (max-width:520px) { .container { margin:10px; } }
  </style>
</head>
<body>
  <div class="container" role="article" aria-label="Réinitialisation du mot de passe">
    <div class="header">
      <div class="brand">${site_name}</div>
    </div>

    <div class="body">
      <p style="margin:0 0 12px 0;">Bonjour,</p>

      <p style="margin:0 0 12px 0;">
        Nous avons reçu une demande pour réinitialiser le mot de passe de votre compte sur <strong>${site_name}</strong>.
        Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans <strong>${expires_in_minutes} minutes</strong>.
      </p>

      <p style="margin:18px 0 8px 0;">
        <a href="${resetLink}" class="btn" target="_blank" rel="noopener">Réinitialiser le mot de passe</a>
      </p>

      <p class="muted" style="margin:12px 0 12px 0;">
        Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur:
        <br>
        <a href="${resetLink}" target="_blank" rel="noopener" style="color:#2563eb; word-break:break-all;">${resetLink}</a>
      </p>

      <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0;">

      <p style="margin:0 0 12px 0;">Voici aussi votre code temporaire :</p>
      <p style="margin:0 0 18px 0;"><span class="code">${token}</span></p>

      <p class="muted" style="margin:0 0 6px 0;">Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet e-mail.</p>

      <div style="margin-top:14px;font-size:13px;color:#374151;">Cordialement,<br>L'équipe <strong>${site_name}</strong></div>
    </div>

    
  </div>
</body>
</html>`;

  res.type('html').send(html);
});

app.post('/api/admin-confirm-reset', async (req, res) => {
  try {
    const { email, token, new_password } = req.body;
    if (!email || !token || !new_password) return res.status(400).json({ error: 'Missing fields' });

    const { data: admin, error: adminErr } = await supabaseAdmin.from('admins').select('id').eq('email', email).limit(1).maybeSingle();
    if (adminErr) {
      console.error('supabase lookup error', adminErr);
      return res.status(500).json({ error: 'internal' });
    }
    if (!admin) return res.status(400).json({ error: 'Invalid token or email' });

    const { data: tokens, error: tokenErr } = await supabaseAdmin.from('admin_reset_tokens').select('*').eq('admin_id', admin.id).eq('used', false).order('created_at', { ascending: false }).limit(1);
    if (tokenErr) {
      console.error('token lookup error', tokenErr);
      return res.status(500).json({ error: 'internal' });
    }
    if (!tokens || tokens.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
    const tr = tokens[0];
    if (new Date(tr.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });

    const valid = await bcrypt.compare(token, tr.token_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid token' });

    const newHash = await bcrypt.hash(new_password, 10);
    const { error: updErr } = await supabaseAdmin.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
    if (updErr) {
      console.error('update password error', updErr);
      return res.status(500).json({ error: 'internal' });
    }

    await supabaseAdmin.from('admin_reset_tokens').update({ used: true }).eq('id', tr.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
});

app.listen(PORT, () => console.log(`Dev API server listening on http://localhost:${PORT}`));
