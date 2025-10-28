import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Missing email' });

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Missing supabase server config' });

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Find admin by email
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('id,email')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (adminErr) console.error('supabase lookup error', adminErr);

    // Always respond 200 to avoid user enumeration. Only create/send token if admin exists.
    if (!admin) {
      // Pretend we sent an email
      return res.json({ ok: true });
    }

    // Generate short token (6 digits) — acceptable for email OTP UX but ensure expiry & rate-limiting server-side
    const token = (Math.floor(100000 + Math.random() * 900000)).toString();
    const tokenHash = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Insert token into admin_reset_tokens
    const { error: insertErr } = await supabaseAdmin
      .from('admin_reset_tokens')
      .insert({ admin_id: admin.id, token_hash: tokenHash, expires_at: expiresAt });

    if (insertErr) {
      console.error('insert token error', insertErr);
      return res.status(500).json({ error: 'could not create token' });
    }

    // Send token by email using EmailJS REST API (server-side)
    const service_id = process.env.EMAILJS_SERVICE_ID;
    const template_id = process.env.EMAILJS_TEMPLATE_ID;
    const user_id = process.env.EMAILJS_USER_ID; // public key or server key depending on EmailJS plan

    if (!service_id || !template_id || !user_id) {
      console.warn('EmailJS env vars not set; token generated but email not sent');
      return res.json({ ok: true });
    }

    const payload = {
      service_id,
      template_id,
      user_id,
      template_params: {
        to_email: admin.email,
        token,
      },
    };

    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      console.error('EmailJS send failed', await r.text());
      // do not reveal to client
      return res.json({ ok: true });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
}
