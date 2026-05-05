// Airtable write helper for /api/admin/* endpoints.
// Mirrors api/recipes.js airtableFetch shape but:
//  - Uses AIRTABLE_WRITE_TOKEN (data:read,write scope) — NOT the public AIRTABLE_TOKEN.
//  - Supports method+body (GET/POST/PATCH/DELETE).
//
// Pattern source: RESEARCH.md §"Code Examples — Airtable write helper" (lines 449-475).
// IDs hardcoded from .planning/phases/02-admin-foundation-auth-data-api/02-02-DISCOVERY.md
// (originally discovered in Plan 02-00 / Wave 1, smoke-tested in Plan 02-02 Task 1).
//
// IMPORTANT: callers MUST wrap PATCH/POST bodies as { fields: {...}, typecast: true }.
// The helper does not auto-wrap — see RESEARCH.md §"Pitfall #5".

export const AIRTABLE_BASE = 'appSOzO2OxTctKIgD';
export const RECIPES_TABLE = 'tblx4gWhB6m81apfT';

// Categories table — created manually in Plan 02-00 by Eric. Stable for the lifetime of the base.
export const CATEGORIES_TABLE = 'tblhHYQGH4hZQYZAC';

// Recipe field IDs. First 9 copied verbatim from api/recipes.js (canonical source).
// reviewedAt is the new field added in Plan 02-00; ID discovered via the
// returnFieldsByFieldId=true workaround documented in RESEARCH.md §"Pitfall #8".
export const FIELDS = {
  name:         'flddpcF2EmlBShsSI',
  category:     'fldLfZTOT68WKrKi9',
  description:  'fldnObh6jNKLFQwHY',
  prepTime:     'fldywAg4Ew7tyM8jY',
  image:        'fldtDK3PBckFDyb7K',
  ingredients:  'fldzG5aH7sO6Mxcdn',
  instructions: 'fldre7wfL15XxPL6D',
  servingSize:  'fld6WyQdPtYBnydxW',
  netCarbs:     'fldLLBHC01hOmnXNq',
  reviewedAt:   'fldnFqVe9k5soCJ4P',
};

// Names that filterByFormula references — Airtable formulas use field NAMES, not IDs.
// Keep these in sync with the field NAMES Eric chose in the Airtable UI.
export const FIELD_NAMES = {
  reviewedAt: 'ReviewedAt',
};

// Categories table field IDs.
export const CAT_FIELDS = {
  name: 'fldpQnlDxl0hPheKe',
};

/**
 * Wraps fetch against the Airtable v0 API using AIRTABLE_WRITE_TOKEN.
 *
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path - everything after /v0/<base>/. Examples:
 *   - "tblx4gWhB6m81apfT"                          (list)
 *   - "tblx4gWhB6m81apfT/recXXXXX"                 (single)
 *   - "tblx4gWhB6m81apfT?filterByFormula=..."      (filtered list)
 *   - "tblx4gWhB6m81apfT/recXXXXX?returnFieldsByFieldId=true"
 * @param {object|undefined} body - For POST/PATCH only. MUST be { fields: {...}, typecast: true } shape (Pitfall #5).
 * @returns {Promise<any>} parsed JSON response
 * @throws {Error} on non-2xx (message includes status + body)
 */
export async function airtableWriteFetch(method, path, body) {
  const token = process.env.AIRTABLE_WRITE_TOKEN;
  if (!token) throw new Error('AIRTABLE_WRITE_TOKEN env var not configured');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`;
  const init = {
    method,
    headers: { Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Airtable ${res.status}: ${txt}`);
  }
  return res.json();
}
