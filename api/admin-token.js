import adminHandler from './admin.js';

// This file intentionally forwards to the consolidated `api/admin.js` handler.
// Keep this wrapper small and single-purpose to avoid duplicate declarations.
export default async function adminTokenHandler(req, res) {
  try {
    return await adminHandler(req, res);
  } catch (e) {
    console.error('admin-token wrapper error', e);
    return res.status ? res.status(500).json({ error: 'internal' }) : null;
  }
}
