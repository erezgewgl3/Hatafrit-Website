// Admin categories CRUD.
// GET  /api/admin/categories          - list all rows in Categories table
// POST /api/admin/categories          - body { name }, creates a new row
//
// The Categories table is a separate canonical-taxonomy table (DATA-02).
// We avoid needing schema:write scope by storing categories as ROWS in this table,
// not as multi-select OPTIONS on the recipes.category field.
//
// Pattern source: api/recipes.js (style); RESEARCH.md §"Pitfall #5" (body wrapper).
// Auth: requireAuth() — 401 on missing/invalid cookie.
// Cache: Cache-Control: no-store (Pitfall #2 belt-and-suspenders alongside vercel.json no-cache).

import { requireAuth } from '../_lib/auth.js';
import { airtableWriteFetch, CATEGORIES_TABLE, CAT_FIELDS } from '../_lib/airtable.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      // List all (paginated — categories should be ≤100 but loop just in case).
      let offset = null;
      let all = [];
      do {
        const qs = `pageSize=100&returnFieldsByFieldId=true${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
        const data = await airtableWriteFetch('GET', `${CATEGORIES_TABLE}?${qs}`);
        all = all.concat(data.records || []);
        offset = data.offset || null;
      } while (offset);

      const categories = all
        .map(r => ({
          id: r.id,
          name: r.fields?.[CAT_FIELDS.name] || '',
        }))
        .filter(c => c.name);

      res.status(200).json({ categories });
      return;
    }

    if (req.method === 'POST') {
      const name = String(req.body?.name || '').trim();
      if (!name) {
        res.status(400).json({ error: 'name required' });
        return;
      }
      const created = await airtableWriteFetch(
        'POST',
        `${CATEGORIES_TABLE}?returnFieldsByFieldId=true`,
        { fields: { [CAT_FIELDS.name]: name }, typecast: true },
      );
      res.status(201).json({ id: created.id, name });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
