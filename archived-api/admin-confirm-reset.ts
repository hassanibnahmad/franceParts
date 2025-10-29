import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, token, new_password } = req.body;
    if (!email || !token || !new_password) return res.status(400).json({ error: 'Missing fields' });

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Missing supabase server config' });

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Find admin
    const { data: admin, error: adminErr } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (adminErr) {
      console.error('supabase lookup error', adminErr);
      return res.status(500).json({ error: 'internal' });
    }
    if (!admin) return res.status(400).json({ error: 'Invalid token or email' });

    // Find latest unused token for this admin
    const { data: tokens, error: tokenErr } = await supabaseAdmin
      .from('admin_reset_tokens')
      .select('*')
      .eq('admin_id', admin.id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tokenErr) {
      console.error('token lookup error', tokenErr);
      return res.status(500).json({ error: 'internal' });
    }

    if (!tokens || tokens.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
    const tr = tokens[0];

    // Check expiry
    if (new Date(tr.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });

    // Compare token
    const valid = await bcrypt.compare(token, tr.token_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid token' });

    // Hash new password and update admin
    const newHash = await bcrypt.hash(new_password, 10);
    const { error: updErr } = await supabaseAdmin.from('admins').update({ password_hash: newHash }).eq('id', admin.id);
    if (updErr) {
      console.error('update password error', updErr);
      return res.status(500).json({ error: 'internal' });
    }

    // Mark token used
    await supabaseAdmin.from('admin_reset_tokens').update({ used: true }).eq('id', tr.id);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  }
}
