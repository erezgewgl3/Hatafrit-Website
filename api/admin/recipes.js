// Admin recipes CRUD.
// GET    /api/admin/recipes              - list all (?status=unreviewed|reviewed|all default=all)
// GET    /api/admin/recipes?id=recXXX    - single
// PATCH  /api/admin/recipes?id=recXXX    - update fields (whitelisted)
// POST   /api/admin/recipes              - create new (ReviewedAt auto-set to now())
//
// Pattern source: api/recipes.js (style + normalizeRecord + pagination).
// Auth: requireAuth() — 401 on missing/invalid cookie.
// Cache: Cache-Control: no-store (Pitfall #2 belt-and-suspenders alongside vercel.json no-cache).

import { requireAuth } from '../_lib/auth.js';
import {
  airtableWriteFetch,
  RECIPES_TABLE,
  FIELDS,
  FIELD_NAMES,
} from '../_lib/airtable.js';

const FIELD_IDS = Object.values(FIELDS).filter(Boolean);

// Whitelist for PATCH/POST body. ASVS V5 — never trust client field names.
// Keys here are the LOGICAL names the client sends; mapWritableFieldsToIds()
// translates them to fldXXX IDs server-side before talking to Airtable.
const WRITABLE_FIELDS = new Set([
  'name',
  'category',
  'description',
  'prepTime',
  'image',
  'ingredients',
  'instructions',
  'servingSize',
  'netCarbs',
  'reviewedAt',
]);

function inferDifficulty(prepTime) {
  const min = parseInt(prepTime, 10);
  if (isNaN(min)) return 'בינוני';
  if (min <= 20) return 'קל מאוד';
  if (min <= 45) return 'קל';
  if (min <= 90) return 'בינוני';
  return 'מושקע';
}

function toCategoryArray(raw) {
  if (raw == null || raw === '') return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map(v => (v && typeof v === 'object') ? (v.name || '') : v)
    .filter(Boolean);
}

function normalizeRecord(r) {
  const f = r.fields || {};
  const imgArr = f[FIELDS.image] || [];
  const img0 = imgArr[0];
  const prepTime = f[FIELDS.prepTime] || '';
  const categories = toCategoryArray(f[FIELDS.category]);
  const netCarbsRaw = FIELDS.netCarbs ? f[FIELDS.netCarbs] : '';
  const reviewedAtRaw = FIELDS.reviewedAt ? f[FIELDS.reviewedAt] : '';

  return {
    id: r.id,
    name: f[FIELDS.name] || '',
    categories,
    category: categories[0] || '',
    description: f[FIELDS.description] || '',
    prepTime,
    difficulty: inferDifficulty(prepTime),
    imageUrl: img0 ? (img0.thumbnails?.large?.url || img0.url || '') : '',
    imageFullUrl: img0 ? (img0.thumbnails?.full?.url || img0.url || '') : '',
    ingredients: f[FIELDS.ingredients] || '',
    instructions: f[FIELDS.instructions] || '',
    servingSize: f[FIELDS.servingSize] || '',
    netCarbs: netCarbsRaw === null || netCarbsRaw === undefined ? '' : String(netCarbsRaw),
    reviewedAt: reviewedAtRaw || null, // null = unreviewed (clearer than '')
    createdTime: r.createdTime || '',
  };
}

// Translate client-supplied logical field names to Airtable field IDs.
// Client sends { name: 'foo', netCarbs: '5' } → Airtable wants { fldXXX: 'foo', fldYYY: '5' }.
// Unknown keys are silently dropped (do NOT 400 — frontends commonly send extra fields).
function mapWritableFieldsToIds(incoming) {
  const out = {};
  for (const [k, v] of Object.entries(incoming || {})) {
    if (!WRITABLE_FIELDS.has(k)) continue;
    const fldId = FIELDS[k];
    if (!fldId) continue;
    out[fldId] = v;
  }
  return out;
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  const id = req.query?.id || (req.url && new URL(req.url, 'http://x').searchParams.get('id'));
  const status = String(req.query?.status || 'all').toLowerCase();

  try {
    const fieldParams = FIELD_IDS.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');

    // ---- GET single ----
    if (req.method === 'GET' && id) {
      const path = `${RECIPES_TABLE}/${encodeURIComponent(id)}?returnFieldsByFieldId=true`;
      try {
        const rec = await airtableWriteFetch('GET', path);
        res.status(200).json(normalizeRecord(rec));
        return;
      } catch (err) {
        const msg = String(err && err.message || err);
        if (msg.includes('404')) {
          res.status(404).json({ error: 'Recipe not found' });
          return;
        }
        throw err;
      }
    }

    // ---- GET list (paginated, optional status filter) ----
    if (req.method === 'GET') {
      let formula = '';
      if (status === 'unreviewed') {
        // filterByFormula references fields by NAME, not ID.
        formula = `{${FIELD_NAMES.reviewedAt}}=BLANK()`;
      } else if (status === 'reviewed') {
        formula = `NOT({${FIELD_NAMES.reviewedAt}}=BLANK())`;
      }
      const filterQS = formula ? `&filterByFormula=${encodeURIComponent(formula)}` : '';

      let offset = null;
      let all = [];
      do {
        const qs = `${fieldParams}&pageSize=100&returnFieldsByFieldId=true${filterQS}${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
        const data = await airtableWriteFetch('GET', `${RECIPES_TABLE}?${qs}`);
        all = all.concat(data.records || []);
        offset = data.offset || null;
      } while (offset);

      res.status(200).json({ recipes: all.map(normalizeRecord) });
      return;
    }

    // ---- PATCH single ----
    if (req.method === 'PATCH' && id) {
      const incoming = req.body?.fields || {};
      const safeFields = mapWritableFieldsToIds(incoming);
      if (Object.keys(safeFields).length === 0) {
        res.status(400).json({ error: 'No writable fields in body' });
        return;
      }
      const path = `${RECIPES_TABLE}/${encodeURIComponent(id)}?returnFieldsByFieldId=true`;
      try {
        const updated = await airtableWriteFetch('PATCH', path, {
          fields: safeFields,
          typecast: true,
        });
        res.status(200).json(normalizeRecord(updated));
        return;
      } catch (err) {
        const msg = String(err && err.message || err);
        if (msg.includes('404')) {
          res.status(404).json({ error: 'Recipe not found' });
          return;
        }
        throw err;
      }
    }

    // ---- POST create ----
    if (req.method === 'POST') {
      const incoming = req.body?.fields || {};
      const safeFields = mapWritableFieldsToIds(incoming);
      // Auto-mark new recipes as reviewed at creation time (PRD §11 Q3 / NEW-01 default).
      // Only if caller didn't set it explicitly AND we know the field ID.
      if (FIELDS.reviewedAt && !safeFields[FIELDS.reviewedAt]) {
        safeFields[FIELDS.reviewedAt] = new Date().toISOString();
      }
      const created = await airtableWriteFetch(
        'POST',
        `${RECIPES_TABLE}?returnFieldsByFieldId=true`,
        { fields: safeFields, typecast: true },
      );
      res.status(201).json(normalizeRecord(created));
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
