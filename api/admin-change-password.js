import adminHandler from './admin.js';

export default async function handler(req, res) {
  // Delegate to the existing admin handler which already implements
  // the change-password logic. This ensures Vercel routes for
  // /api/admin-change-password invoke this file and are handled.
  return adminHandler(req, res);
}
