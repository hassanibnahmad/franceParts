import handlerModule from '../posts.js';

export default async function handler(req, res) {
  // forward to top-level posts handler (which inspects req.url)
  try {
    if (handlerModule && typeof handlerModule.default === 'function') return await handlerModule.default(req, res);
    return res.status(500).json({ error: 'posts handler not available' });
  } catch (e) {
    console.error('posts/[id] forward error', e);
    return res.status(500).json({ error: 'internal' });
  }
}
