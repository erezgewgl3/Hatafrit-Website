// Vercel Function — server-side Airtable proxy for Hatafrit v2.
// AIRTABLE_TOKEN is read from env (Vercel project env or local .env.local).
// Endpoints:
//   GET /api/recipes        → all recipes
//   GET /api/recipes?id=... → single recipe by Airtable record id

const AIRTABLE_BASE  = 'app5KCfdL587mYDxh';
const AIRTABLE_TABLE = 'tblx4gWhB6m81apfT';

const FIELDS = {
  name:         'flddpcF2EmlBShsSI',
  category:     'fldLfZTOT68WKrKi9',
  tags:         'flduwopGbNHV4CSwu',
  description:  'fldnObh6jNKLFQwHY',
  prepTime:     'fldywAg4Ew7tyM8jY',
  image:        'fldtDK3PBckFDyb7K',
  ingredients:  'fldzG5aH7sO6Mxcdn',
  instructions: 'fldre7wfL15XxPL6D',
  servingSize:  'fld6WyQdPtYBnydxW',
};

const FIELD_IDS = Object.values(FIELDS);

function inferDifficulty(prepTime) {
  const min = parseInt(prepTime, 10);
  if (isNaN(min)) return 'בינוני';
  if (min <= 20) return 'קל מאוד';
  if (min <= 45) return 'קל';
  if (min <= 90) return 'בינוני';
  return 'מושקע';
}

function normalizeRecord(r) {
  const f = r.fields || {};
  const cat = f[FIELDS.category];
  const tagsRaw = f[FIELDS.tags] || [];
  const imgArr = f[FIELDS.image] || [];
  const img0 = imgArr[0];
  const prepTime = f[FIELDS.prepTime] || '';

  return {
    id: r.id,
    name: f[FIELDS.name] || '',
    category: typeof cat === 'object' && cat !== null ? (cat.name || '') : (cat || ''),
    tags: tagsRaw.map(t => (t && t.name) ? t.name : t).filter(Boolean),
    description: f[FIELDS.description] || '',
    prepTime,
    difficulty: inferDifficulty(prepTime),
    imageUrl: img0 ? (img0.thumbnails?.large?.url || img0.url || '') : '',
    imageFullUrl: img0 ? (img0.thumbnails?.full?.url || img0.url || '') : '',
    ingredients: f[FIELDS.ingredients] || '',
    instructions: f[FIELDS.instructions] || '',
    servingSize: f[FIELDS.servingSize] || '',
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

  // Cache headers — list endpoint can be cached briefly, single recipe slightly longer
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');

  try {
    const fieldParams = FIELD_IDS.map(f => `fields[]=${encodeURIComponent(f)}`).join('&');

    if (id) {
      // Single record fetch
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${encodeURIComponent(id)}?returnFieldsByFieldId=true`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 404) { res.status(404).json({ error: 'Recipe not found' }); return; }
      if (!r.ok) { res.status(r.status).json({ error: `Airtable ${r.status}` }); return; }
      const rec = await r.json();
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

    res.status(200).json({ recipes: all.map(normalizeRecord) });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
