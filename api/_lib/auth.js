// HMAC-signed session cookie helper for /api/admin/* endpoints.
// Pattern source: RESEARCH.md §"Pattern 2: HMAC-Signed Cookie".
// No npm deps — node:crypto only. process.env.ADMIN_COOKIE_SECRET is required.

import crypto from 'node:crypto';

export const COOKIE_NAME = 'hatafrit_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}
function fromB64url(s) {
  return Buffer.from(s, 'base64url');
}

export function signSession(payload) {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ADMIN_COOKIE_SECRET must be set and at least 32 chars');
  }
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(json).digest();
  return `${b64url(json)}.${b64url(sig)}`;
}

export function verifySession(cookieValue) {
  if (!cookieValue || typeof cookieValue !== 'string') return null;
  const dot = cookieValue.indexOf('.');
  if (dot < 0) return null;
  const payloadB64 = cookieValue.slice(0, dot);
  const sigB64 = cookieValue.slice(dot + 1);
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) return null;
  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest();
  const got = fromB64url(sigB64);
  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function requireAuth(req, res) {
  const cookie = req.cookies?.[COOKIE_NAME];
  const payload = verifySession(cookie);
  if (!payload) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function buildSetCookie(value, { maxAge = MAX_AGE_SECONDS, clear = false } = {}) {
  const attrs = [
    `${COOKIE_NAME}=${clear ? '' : value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${clear ? 0 : maxAge}`,
  ];
  return attrs.join('; ');
}
