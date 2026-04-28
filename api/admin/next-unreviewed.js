// GET /api/admin/next-unreviewed
// Returns { id, name } of the first unreviewed recipe (oldest-first by createdTime),
// or { id: null } if none.
//
// Used by the Phase 2 stub shell to verify auth+data work end-to-end, and by
// Phase 3's editor landing flow (login redirects to the editor for this recipe).
//
// Sort note (B1 fix from plan-checker):
//   Sort by Airtable's magic `createdTime` field — NOT by the ReviewedAt column,
//   which is blank for every record in the result set, so sorting on it is a no-op.
//   `createdTime` gives Adi a deterministic queue (oldest-first).
//
// Pattern source: api/recipes.js (style); RESEARCH.md §"Open Questions Q5".
// Auth: requireAuth() — 401 on missing/invalid cookie.
// Cache: Cache-Control: no-store (Pitfall #2 belt-and-suspenders alongside vercel.json no-cache).

import { requireAuth } from '../_lib/auth.js';
import {
  airtableWriteFetch,
  RECIPES_TABLE,
  FIELDS,
  FIELD_NAMES,
} from '../_lib/airtable.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Filter where ReviewedAt is blank; sort by createdTime asc (oldest first); take 1.
    // Request only the name field to keep the payload tiny.
    const params = [
      `filterByFormula=${encodeURIComponent(`{${FIELD_NAMES.reviewedAt}}=BLANK()`)}`,
      'sort[0][field]=createdTime',
      'sort[0][direction]=asc',
      'maxRecords=1',
      'returnFieldsByFieldId=true',
      `fields[]=${encodeURIComponent(FIELDS.name)}`,
    ];
    const data = await airtableWriteFetch('GET', `${RECIPES_TABLE}?${params.join('&')}`);
    const rec = (data.records || [])[0];
    if (!rec) {
      res.status(200).json({ id: null });
      return;
    }
    res.status(200).json({
      id: rec.id,
      name: rec.fields?.[FIELDS.name] || '',
    });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
