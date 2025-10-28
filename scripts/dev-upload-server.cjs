// Simple local dev server to test the /api/upload handler locally.
// Usage: node scripts/dev-upload-server.cjs
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const uploadHandler = require(path.resolve(process.cwd(), 'api', 'upload.cjs'));
const postsHandler = require(path.resolve(process.cwd(), 'api', 'posts.cjs'));

const app = express();
// base64 payloads can be large; allow bigger size for testing
app.use(bodyParser.json({ limit: '50mb' }));

// simple logging for debug: show content-type and body length for upload/posts
app.use('/api/upload', (req, res, next) => {
  console.log('[dev-upload-server] /api/upload', req.method, 'content-type=', req.headers['content-type'], 'content-length=', req.headers['content-length']);
  next();
});
app.use('/api/posts', (req, res, next) => {
  console.log('[dev-upload-server] /api/posts', req.method, 'content-type=', req.headers['content-type'], 'content-length=', req.headers['content-length']);
  next();
});

app.post('/api/upload', (req, res) => uploadHandler(req, res));

app.post('/api/posts', (req, res) => postsHandler(req, res));
app.put('/api/posts/:id', (req, res) => postsHandler(req, res));
app.delete('/api/posts/:id', (req, res) => postsHandler(req, res));

const port = process.env.DEV_UPLOAD_PORT || 3333;
app.listen(port, () => {
  console.log(`Dev upload server listening on http://localhost:${port}/api/upload`);
  console.log('Make sure your .env contains SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and UPLOAD_SECRET (if used).');
});
