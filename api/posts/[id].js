// Archived: this dynamic handler was replaced by consolidated `api/posts.js`.
// Keeping a tiny, explicit handler that returns 410 ensures there is no
// accidental behavior while we keep only `api/posts.js` as the canonical handler.
export default function postsIdHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return res.status(410).json({ error: 'This dynamic handler is archived. Use /api/posts (consolidated).' });
}
