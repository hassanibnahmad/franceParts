import handlerModule from '../tarifs.js';

function setCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
}

export default async function handler(req, res) {
  try {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (handlerModule && typeof handlerModule.default === 'function') return await handlerModule.default(req, res);
    return res.status(500).json({ error: 'tarifs handler not available' });
  } catch (e) {
    console.error('tarifs/[id] forward error', e);
    return res.status(500).json({ error: 'internal' });
  }
}
