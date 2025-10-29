import handlerModule from '../posts.js';

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,DELETE,OPTIONS');
}

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    // forward to top-level posts handler (which inspects req.url)
    if (handlerModule && typeof handlerModule.default === 'function') return await handlerModule.default(req, res);
    return res.status(500).json({ error: 'posts handler not available' });
  } catch (e) {
    console.error('posts/[id] forward error', e);
    return res.status(500).json({ error: 'internal' });
  }
}
