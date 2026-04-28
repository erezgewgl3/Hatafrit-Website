// Vercel Function — server-side Airtable proxy for Hatafrit v2.
// AIRTABLE_TOKEN is read from env (Vercel project env or local .env.local).
// Endpoints:
//   GET /api/recipes        → all recipes
//   GET /api/recipes?id=... → single recipe by Airtable record id

// Restored from the 2026-04-25 snapshot after a botched AI-driven category
// rename wiped 142 records' categories. The previous base id was
// app5KCfdL587mYDxh — once the new base is verified end-to-end and the old
// one deleted, the previous id is dead.
const AIRTABLE_BASE  = 'appSOzO2OxTctKIgD';
const AIRTABLE_TABLE = 'tblx4gWhB6m81apfT';

const FIELDS = {
  name:         'flddpcF2EmlBShsSI',
  category:     'fldLfZTOT68WKrKi9',
  description:  'fldnObh6jNKLFQwHY',
  prepTime:     'fldywAg4Ew7tyM8jY',
  image:        'fldtDK3PBckFDyb7K',
  ingredients:  'fldzG5aH7sO6Mxcdn',
  instructions: 'fldre7wfL15XxPL6D',
  servingSize:  'fld6WyQdPtYBnydxW',
  netCarbs:     'fldLLBHC01hOmnXNq',
};

const FIELD_IDS = Object.values(FIELDS).filter(Boolean);

function inferDifficulty(prepTime) {
  const min = parseInt(prepTime, 10);
  if (isNaN(min)) return 'בינוני';
  if (min <= 20) return 'קל מאוד';
  if (min <= 45) return 'קל';
  if (min <= 90) return 'בינוני';
  return 'מושקע';
}

// Normalize the Airtable category value into an array of strings.
// Handles both the legacy single-select shape (string OR { name } object)
// and the future multi-select shape (array of objects/strings).
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

  return {
    id: r.id,
    name: f[FIELDS.name] || '',
    categories,                       // array — primary
    category: categories[0] || '',    // string — backward-compat for any unmodified caller
    description: f[FIELDS.description] || '',
    prepTime,
    difficulty: inferDifficulty(prepTime),
    imageUrl: img0 ? (img0.thumbnails?.large?.url || img0.url || '') : '',
    imageFullUrl: img0 ? (img0.thumbnails?.full?.url || img0.url || '') : '',
    ingredients: f[FIELDS.ingredients] || '',
    instructions: f[FIELDS.instructions] || '',
    servingSize: f[FIELDS.servingSize] || '',
    netCarbs: netCarbsRaw === null || netCarbsRaw === undefined ? '' : String(netCarbsRaw),
    createdTime: r.createdTime || '',
  };
}

async function airtableFetch(token, qs) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'AIRTABLE_TOKEN env var not configured' });
    return;
  }

  const id = (req.query && req.query.id) || (req.url && new URL(req.url, 'http://x').searchParams.get('id'));

  try {
    const fieldParams = FIELD_IDS.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');

    if (id) {
      // Single record fetch
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${encodeURIComponent(id)}?returnFieldsByFieldId=true`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 404) { res.status(404).json({ error: 'Recipe not found' }); return; }
      if (!r.ok) { res.status(r.status).json({ error: `Airtable ${r.status}` }); return; }
      const rec = await r.json();
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      res.status(200).json(normalizeRecord(rec));
      return;
    }

    // List all (paginated)
    let offset = null, all = [];
    do {
      const qs = `${fieldParams}&pageSize=100&returnFieldsByFieldId=true${offset ? `&offset=${encodeURIComponent(offset)}` : ''}`;
      const data = await airtableFetch(token, qs);
      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).json({ recipes: all.map(normalizeRecord) });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
