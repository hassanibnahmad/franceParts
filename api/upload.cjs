const { createClient } = require('@supabase/supabase-js');
let formidable;
try { formidable = require('formidable'); } catch (e) { formidable = null; }
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.UPLOAD_SECRET;
  const tokenSecret = process.env.UPLOAD_TOKEN_SECRET;
  let authorized = false;
  if (tokenSecret) {
    const providedToken = req.headers['x-upload-token'];
    if (providedToken) {
      try {
        const crypto = require('crypto');
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
    console.warn('Upload attempt with missing/invalid upload secret/token');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const contentType = (req.headers['content-type'] || '').toString();

  try {
    let filename;
    let buffer;
    let fileContentType;

    if (contentType.startsWith('multipart/')) {
      if (!formidable) return res.status(500).json({ error: 'Server missing optional dependency: formidable. Install it or send JSON base64 payloads.' });
      await new Promise((resolve, reject) => {
        const form = new formidable.IncomingForm({ maxFileSize: 20 * 1024 * 1024 }); // 20MB
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          const file = files?.file || files?.image || Object.values(files || {})[0];
          if (!file) return reject(new Error('No file received'));
          filename = file.name || file.originalFilename || file.filename;
          const pathOnDisk = file.filepath || file.path;
          buffer = fs.readFileSync(pathOnDisk);
          fileContentType = file.mimetype || file.type || 'application/octet-stream';
          resolve(null);
        });
      });
    } else {
      const body = req.body || {};
      filename = body.filename;
      fileContentType = body.contentType || 'application/octet-stream';
      const data = body.data;
      if (!filename || !data) return res.status(400).json({ error: 'filename and data are required' });
      buffer = Buffer.from(data, 'base64');
    }

    const bucket = 'blog-images';
    const path = `posts/${Date.now()}_${(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, { contentType: fileContentType });
    if (uploadError) {
      console.error('Supabase upload error', uploadError);
      return res.status(500).json({ error: uploadError.message || 'Upload failed' });
    }

    const publicResult = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = publicResult?.data?.publicUrl ?? publicResult?.data?.publicURL ?? null;

    // Create a signed URL for immediate browser access. For production we require a signed URL
    // so the client can preview the uploaded image without relying on public bucket settings.
    try {
      const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (signedErr || !signedData?.signedUrl) {
        console.error('createSignedUrl failed', signedErr);
        return res.status(500).json({ error: 'Failed to create signed URL' });
      }
      const signedUrl = signedData.signedUrl;
      return res.status(200).json({ publicUrl, signedUrl, path });
    } catch (e) {
      console.error('createSignedUrl error', e);
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }
  } catch (err) {
    console.error('upload handler error', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
