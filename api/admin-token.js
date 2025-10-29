import crypto from 'crypto';

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

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const cookieSecret = process.env.COOKIE_SECRET || process.env.UPLOAD_TOKEN_SECRET;
    if (!cookieSecret) return res.status(500).json({ error: 'Server not configured for sessions' });
    const cookies = parseCookies(req);
    const sessionToken = cookies['admin_session'];
    if (!sessionToken) return res.status(401).json({ error: 'no_session' });
    // validate session
    try {
      const parts = String(sessionToken).split('.');
      if (parts.length !== 2) return res.status(401).json({ error: 'invalid_session' });
      const [b, mac] = parts;
      const expectedMac = crypto.createHmac('sha256', String(cookieSecret)).update(b).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(mac, 'hex'))) return res.status(401).json({ error: 'invalid_session' });
      const json = Buffer.from(b, 'base64url').toString('utf8');
      const obj = JSON.parse(json);
      if (obj.exp && Date.now() > obj.exp) return res.status(401).json({ error: 'session_expired' });
      // create upload token signed with UPLOAD_TOKEN_SECRET
      const uploadSecret = process.env.UPLOAD_TOKEN_SECRET;
      if (!uploadSecret) return res.status(500).json({ error: 'upload token not configured' });
      const now = Date.now();
      const uploadPayload = { sub: obj.sub, email: obj.email, iat: now, exp: now + (60 * 60 * 1000) };
      const uploadToken = signToken(uploadPayload, uploadSecret);
      return res.json({ token: uploadToken });
    } catch (e) {
      console.error('admin-token verify error', e);
      return res.status(401).json({ error: 'invalid_session' });
    }
  } catch (e) {
    console.error('admin-token error', e);
    return res.status(500).json({ error: 'internal' });
  }
}
