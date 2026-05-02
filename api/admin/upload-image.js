// Admin: image upload proxy.
// POST /api/admin/upload-image?id=recXXX[&replace=true]
// Body: { contentType, filename, base64 }
//
// Pass-through to Airtable's content-upload endpoint
// (POST https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment).
// When replace=true, clears the image field first via PATCH so the upload doesn't append.
//
// Auth: requireAuth() — 401 on missing/invalid cookie.
// Body cap: 4MB pre-base64 (Vercel serverless body limit is ~4.5MB).
// Allowed types: image/jpeg, image/png, image/webp.

import { requireAuth } from '../_lib/auth.js';
import {
  AIRTABLE_BASE,
  RECIPES_TABLE,
  FIELDS,
  airtableWriteFetch,
} from '../_lib/airtable.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 4 * 1024 * 1024;

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = req.query?.id || (req.url && new URL(req.url, 'http://x').searchParams.get('id'));
  const replace = String(req.query?.replace || '') === 'true';
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const { contentType, filename, base64 } = req.body || {};
  if (!ALLOWED_TYPES.has(contentType)) {
    res.status(422).json({ error: 'Unsupported content type' });
    return;
  }
  if (!base64 || typeof base64 !== 'string') {
    res.status(400).json({ error: 'Missing base64' });
    return;
  }
  if (Buffer.byteLength(base64, 'base64') > MAX_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  const token = process.env.AIRTABLE_WRITE_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'AIRTABLE_WRITE_TOKEN not configured' });
    return;
  }

  try {
    if (replace) {
      // Clear existing attachments — uploadAttachment otherwise appends.
      await airtableWriteFetch(
        'PATCH',
        `${RECIPES_TABLE}/${encodeURIComponent(id)}`,
        { fields: { [FIELDS.image]: [] } },
      );
    }

    // Different host than api.airtable.com — inline fetch instead of reusing airtableWriteFetch.
    const upUrl = `https://content.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(id)}/${FIELDS.image}/uploadAttachment`;
    const upRes = await fetch(upUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contentType,
        file: base64,
        filename: filename || 'image.jpg',
      }),
    });
    if (!upRes.ok) {
      const txt = await upRes.text().catch(() => '');
      res.status(502).json({ error: `Airtable upload failed ${upRes.status}: ${txt}` });
      return;
    }
    const updated = await upRes.json();

    // Response shape: { fields: { fldtDK...: [{ url, thumbnails:{ large, full } }, ...] }, id, createdTime }
    const imgArr = (updated.fields && updated.fields[FIELDS.image]) || [];
    const img0 = imgArr[0] || null;
    res.status(200).json({
      imageUrl: img0 ? (img0.thumbnails?.large?.url || img0.url || '') : '',
      imageFullUrl: img0 ? (img0.thumbnails?.full?.url || img0.url || '') : '',
    });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
}
