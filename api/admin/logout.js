// POST /api/admin/logout
// Clears the hatafrit_session cookie. Returns 200 { ok: true }.
// Does NOT require auth — clearing an already-expired cookie is harmless and the logout
// button must always work even after natural expiry. Per RESEARCH.md §"Open Questions Q4".

import { buildSetCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Set-Cookie', buildSetCookie('', { clear: true }));
  res.status(200).json({ ok: true });
}
