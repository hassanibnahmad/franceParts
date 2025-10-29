import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getIdFromUrl(req) {
  try {
    const m = (req.url || '').match(/\/api\/posts\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  // CORS helper
  const setCors = () => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-upload-token, x-upload-secret');
    res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,DELETE,OPTIONS');
  };
  setCors();
  // debug
  try {
    if (process.env.DEBUG_API === 'true') console.log('[posts] incoming', { method: req.method, url: req.url, headers: req.headers });
  } catch (e) {}
  if (req.method === 'OPTIONS') return res.status(204).end();
  // allow POST /api/posts (create)
  // allow PUT /api/posts/:id (update)
  // allow DELETE /api/posts/:id (delete)

  // Basic protection: require upload secret when set
  const expected = process.env.UPLOAD_SECRET;
  const tokenSecret = process.env.UPLOAD_TOKEN_SECRET;
  let authorized = false;
  if (tokenSecret) {
    const providedToken = req.headers['x-upload-token'];
    if (providedToken) {
      try {
        const crypto = await import('crypto');
        const parts = String(providedToken).split('.');
        if (parts.length === 2) {
          const [b, mac] = parts;
          const expectedMac = crypto.createHmac('sha256', String(tokenSecret)).update(b).digest('hex');
          if (crypto.timingSafeEqual(Buffer.from(expectedMac, 'hex'), Buffer.from(mac, 'hex'))) {
            const json = Buffer.from(b, 'base64url').toString('utf8');
            const obj = JSON.parse(json);
            if (!obj.exp || Date.now() <= obj.exp) authorized = true;
          }
        }
      } catch (e) { /* ignore token verify errors */ }
    }
  }
  if (!authorized && expected) {
    const provided = req.headers['x-upload-secret'] || req.headers['X-Upload-Secret'];
    if (provided && provided === expected) authorized = true;
  }
  if (!authorized && (expected || tokenSecret)) {
    console.warn('Unauthorized posts request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try { if (process.env.DEBUG_API === 'true') console.log('[posts] authorized=', authorized); } catch (e) {}

  try {
    if (req.method === 'POST') {
      const post = req.body;
      if (!post || !post.title) return res.status(400).json({ error: 'Invalid post payload' });
      // ensure slug exists: generate from title when missing
      if (!post.slug) {
        const makeSlug = (s) => String(s || '').toLowerCase().trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        let slug = makeSlug(post.title);
        if (!slug) slug = `post-${Date.now()}`;
        // ensure unique-ish by checking for existing slug
        try {
          const { data: existing } = await supabase.from('blog_posts').select('id').eq('slug', slug).limit(1);
          if (existing && existing.length > 0) {
            slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
          }
        } catch (e) { /* ignore uniqueness check error */ }
        post.slug = slug;
      }
      const { data, error } = await supabase.from('blog_posts').insert([post]).select().single();
      if (error) { console.error('supabase insert error', error); return res.status(500).json({ error: error.message || 'Insert failed' }); }
      return res.status(200).json({ data });
    }

    if (req.method === 'PUT') {
      const id = getIdFromUrl(req) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id in URL or body' });
      const updates = req.body;
      delete updates.id;
      const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
      if (error) { console.error('supabase update error', error); return res.status(500).json({ error: error.message || 'Update failed' }); }
      return res.status(200).json({ data });
    }

    if (req.method === 'DELETE') {
      const id = getIdFromUrl(req) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'Missing id in URL or body' });

      // fetch the post to get featured_image so we can remove the stored file
      const { data: existing, error: fetchErr } = await supabase.from('blog_posts').select('featured_image').eq('id', id).single();
      if (fetchErr) {
        console.error('supabase fetch before delete error', fetchErr);
        return res.status(500).json({ error: fetchErr.message || 'Fetch failed' });
      }

  const featured = existing && existing.featured_image;
      if (featured) {
        // try to extract the storage path inside the bucket (e.g. posts/xxx.png)
        const idx = featured.indexOf('/blog-images/');
        let path = null;
        if (idx !== -1) {
          path = featured.substring(idx + '/blog-images/'.length);
        } else {
          // also support storage urls that include /object/public/{bucket}/...
          const m = featured.match(/\/object\/(?:public|sign)\/[\w-]+\/(.+)$/);
          if (m) path = m[1];
        }
        if (path) {
          try {
            const { error: removeErr } = await supabase.storage.from('blog-images').remove([path]);
            if (removeErr) console.warn('failed to remove image from storage', removeErr);
          } catch (e) { console.warn('remove image exception', e); }
        }
      }

      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) { console.error('supabase delete error', error); return res.status(500).json({ error: error.message || 'Delete failed' }); }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('posts handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
