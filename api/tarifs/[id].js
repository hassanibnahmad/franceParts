import handlerModule from '../tarifs.js';

export default async function handler(req, res) {
  try {
    if (handlerModule && typeof handlerModule.default === 'function') return await handlerModule.default(req, res);
    return res.status(500).json({ error: 'tarifs handler not available' });
  } catch (e) {
    console.error('tarifs/[id] forward error', e);
    return res.status(500).json({ error: 'internal' });
  }
}
