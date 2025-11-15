export default function healthHandler(req, res) {
  // quick health endpoint to verify the deployed functions are reachable
  try { console.log('[health] incoming', { method: req.method, url: req.url, marker: 'health-v1' }); } catch (e) {}
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ ok: true, now: Date.now(), marker: 'health-v1' });
}
