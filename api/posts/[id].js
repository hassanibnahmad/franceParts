// This dynamic handler now forwards requests to the consolidated `api/posts.js`
// implementation so that id-scoped requests (PUT/DELETE to /api/posts/:id)
// are handled by the authoritative code path. Keeping a small forwarder avoids
// duplication and preserves the canonical authorization logic.
import postsHandler from '../posts.js';

export default async function postsIdHandler(req, res) {
  // Set CORS for preflight and simple requests
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Delegate to consolidated handler which already supports id in the URL
  // via getIdFromUrl. This ensures PUT/DELETE/POST calls are handled
  // consistently and receive the same auth checks and responses.
  try {
    return await postsHandler(req, res);
  } catch (err) {
    console.error('[postsId] forward error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
