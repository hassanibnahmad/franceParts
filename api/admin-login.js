import adminHandler from './admin.js';

export default async function handler(req, res) {
  // Delegate to consolidated admin handler which implements login
  // behaviour for paths including /admin-login, /admin-token, etc.
  return adminHandler(req, res);
}
