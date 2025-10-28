// Simple local dev server to test the /api/upload handler locally.
// Usage: node scripts/dev-upload-server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const uploadHandler = require(path.resolve(process.cwd(), 'api', 'upload.js'));

const app = express();
// base64 payloads can be large; allow bigger size for testing
app.use(bodyParser.json({ limit: '20mb' }));

app.post('/api/upload', (req, res) => {
  // express req/res are compatible with the handler signature used in api/upload.js
  return uploadHandler(req, res);
});

const port = process.env.DEV_UPLOAD_PORT || 3333;
app.listen(port, () => {
  console.log(`Dev upload server listening on http://localhost:${port}/api/upload`);
  console.log('Make sure your .env contains SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and UPLOAD_SECRET (if used).');
});
