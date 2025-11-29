import adminHandler from './admin.js';

export default async function handler(req, res) {
  // Directly delegate to the consolidated admin handler. Using a dedicated
  // file ensures Vercel will route POST /api/admin-change-email here and
  // avoids potential issues with rewrites on some deployments.
  return adminHandler(req, res);
}
