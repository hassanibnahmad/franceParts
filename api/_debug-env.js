function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
}

function mask(s) {
  if (!s) return null;
  const str = String(s);
  if (str.length <= 8) return '***';
  return `${str.slice(0,4)}...${str.slice(-4)}`;
}

export default function handler(req, res) {
  try { console.log('[debug-env] incoming', { method: req.method, url: req.url }); } catch (e) {}
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const out = {
    NODE_ENV: process.env.NODE_ENV || null,
    DEBUG_API: process.env.DEBUG_API === 'true' ? 'true' : (process.env.DEBUG_API || null),
    SUPABASE_URL: mask(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    HAS_SUPABASE_SERVICE_ROLE_KEY: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
    COOKIE_SECRET: mask(process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET),
    UPLOAD_TOKEN_SECRET: mask(process.env.UPLOAD_TOKEN_SECRET),
    UPLOAD_SECRET: mask(process.env.UPLOAD_SECRET),
    SMTP_HOST: mask(process.env.SMTP_HOST),
    SMTP_FROM: mask(process.env.SMTP_FROM),
  };

  return res.json({ ok: true, env: out, note: 'Masked values; remove this endpoint after debugging.' });
}
