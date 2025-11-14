import adminHandler from './admin.js';

// Simple wrapper so requests to /api/admin-confirm-reset are handled
// by the main admin handler. Vercel routes each filename independently
// so we expose this explicit entrypoint which reuses the logic in
// `api/admin.js` (which understands the /admin-confirm-reset path).
export default async function handler(req, res) {
  return adminHandler(req, res);
}
