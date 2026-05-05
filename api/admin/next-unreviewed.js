// GET /api/admin/next-unreviewed
// Returns { id, name } of the first unreviewed recipe (oldest-first by createdTime),
// or { id: null } if none.
//
// Used by the Phase 2 stub shell to verify auth+data work end-to-end, and by
// Phase 3's editor landing flow (login redirects to the editor for this recipe).
//
// Sort note (Rule 1 deviation during execution):
//   Plan-checker B1 specified sort[0][field]=createdTime. Live Airtable rejected this
//   with 422 "Unknown field name: createdTime" — the base does not have a Created field
//   and `createdTime` is NOT a magic sort key in this Airtable account. We drop the sort
//   parameter entirely; Airtable's default order over a filterByFormula={ReviewedAt}=BLANK()
//   with maxRecords=1 returns a stable "next" record per call. This is sufficient for
//   Phase 2's smoke ("show the next unreviewed recipe"); Phase 3 can refine ordering once
//   Adi expresses a queue preference (e.g., add a Created datetime field on the table).
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
    // Filter where ReviewedAt is blank; take 1. No sort — see header comment.
    // Request only the name field to keep the payload tiny.
    const params = [
      `filterByFormula=${encodeURIComponent(`{${FIELD_NAMES.reviewedAt}}=BLANK()`)}`,
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
