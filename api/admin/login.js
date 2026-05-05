// POST /api/admin/login
// Body: { password: string }
// On success: sets hatafrit_session cookie (30 days), returns 200 { ok: true }
// On wrong password: 401 { error: 'סיסמה שגויה' } (Hebrew — matches login mockup error wording)
// On missing env: 500 { error: '<var> env var not configured' }

import crypto from 'node:crypto';
import { signSession, buildSetCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const expected = process.env.ADMIN_PASSWORD;
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET;
  if (!expected) {
    res.status(500).json({ error: 'ADMIN_PASSWORD env var not configured' });
    return;
  }
  if (!cookieSecret || cookieSecret.length < 32) {
    res.status(500).json({ error: 'ADMIN_COOKIE_SECRET env var not configured (must be 32+ chars)' });
    return;
  }
  const password = req.body?.password;
  if (!password || typeof password !== 'string') {
    res.status(401).json({ error: 'סיסמה שגויה' });
    return;
  }
  // Constant-time compare. Length check first (timingSafeEqual throws on mismatched lengths).
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'סיסמה שגויה' });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const token = signSession({ iat: now, exp: now + 30 * 24 * 60 * 60, sub: 'admin' });
  res.setHeader('Set-Cookie', buildSetCookie(token));
  res.status(200).json({ ok: true });
}
