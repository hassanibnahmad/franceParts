import adminHandler from '../../api-handlers/admin.js';

export default async function handler(req, res) {
  // delegate everything under /api/admin/* to the consolidated admin handler
  return adminHandler(req, res);
}
