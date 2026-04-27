# Hatafrit · Admin Review Interface

## What This Is

A separate, password-protected admin web interface (at `/admin` on hatafrit.co.il) that lets Adi review and edit the 222 existing recipes — fixing categorization, adding net carbs, and authoring new recipes — at a sustainable rate of ~20 reviews per day. Sits alongside the public Hebrew RTL recipe site (which serves Israeli mothers of diabetics, celiacs, and low-carb eaters) without changing its public surface.

## Core Value

Adi can review the next unreviewed recipe and move on in **one click**. If everything else fails, that flow must work.

## Requirements

### Validated

<!-- Existing capabilities of the public site, inferred from website/ -->

- ✓ Public recipe library (`/recipes`) with category grouping, search, and "Load More" pagination — existing
- ✓ Recipe detail pages (`/recipe/{id}`) with image, ingredients, instructions, prep time, net carbs — existing
- ✓ Static HTML + inline Tailwind CDN + Vercel functions pattern (no framework, no build step) — existing
- ✓ Airtable backend (read-only) for 222 recipes via `website/api/recipes.js` — existing
- ✓ Hebrew RTL design system: warm-brown / cream palette, Heebo + Assistant fonts — existing
- ✓ Sales page (`/shulchan-echad`) and supporting pages (hamrot, terms, privacy, contact) — existing

### Active

<!-- Admin tool scope, derived from docs/admin-tool/PRD.md -->

- [ ] **P0 · CACHE-01** — Add `Cache-Control: s-maxage=300, stale-while-revalidate=3600` to `/api/recipes` to drop Airtable Public API usage from ~1,147 calls/month to ~10s/month *(blocks any admin work that adds API pressure)*
- [ ] **AUTH-01** — Password-gated admin route at `/admin` (single shared password via `ADMIN_PASSWORD` env var, signed cookie, 30-day session)
- [ ] **AUTH-02** — Admin route is unlinked from public site; not in sitemap, not crawled
- [ ] **EDIT-01** — Login lands directly in the editor for the next unreviewed recipe (no dashboard intermediary)
- [ ] **EDIT-02** — Inline edit of every text field (name, description, prepTime, servingSize, netCarbs)
- [ ] **EDIT-03** — Collapsible inline edit of ingredients & instructions (large text blocks)
- [ ] **EDIT-04** — "Save & next" auto-advances to the next unreviewed recipe and stamps `ReviewedAt = now()`
- [ ] **EDIT-05** — `Cmd/Ctrl+Enter` keyboard shortcut for Save & next
- [ ] **CAT-01** — Fixed category taxonomy bootstrapped from existing site grouping (meal types, holidays, dietary)
- [ ] **CAT-02** — Inline "add new category" affordance that promotes the new value to the canonical list
- [ ] **DATA-01** — New `ReviewedAt` field (datetime) on Airtable recipes table; cleared by "סמן כלא נבדק"
- [ ] **DATA-02** — New `Categories` Airtable table for the canonical taxonomy
- [ ] **API-01** — Admin API endpoints under `/api/admin/*` (login, logout, recipes list/get/patch/create, categories list/post, next-unreviewed)
- [ ] **API-02** — Admin endpoints use a separate write-scoped Airtable PAT (`AIRTABLE_WRITE_TOKEN`)
- [ ] **API-03** — Admin endpoints set `Cache-Control: no-store` (always fresh for the reviewer)
- [ ] **LIST-01** — All-recipes list view at `/admin/recipes` with status pills (לבדוק / נבדקו), filter pills, search, sort
- [ ] **NEW-01** — "Add new recipe" flow re-using the editor with all fields blank; auto-marks as reviewed on save
- [ ] **MENU-01** — Top-nav dropdown menu for navigation: All recipes · Add new · Manage categories · Dashboard · Logout
- [ ] **NUDGE-01** — Soft 20/day target with progress chips in nav and a "Done for today" celebration screen on the 20th save
- [ ] **DASH-01** — Dashboard as a secondary look-back screen reachable via menu (Eric's spot-check view, Adi's bird's-eye)
- [ ] **BRAND-01** — All chrome reuses existing brand palette/typography verbatim from `website/index.html`
- [ ] **BRAND-02** — RTL with primary content anchored right; admin direct-address to Adi uses feminine singular

### Out of Scope

- Image upload/replacement — Airtable attachment uploads deferred to v2; image stays read-only
- Multi-reviewer support — single user (Adi) for v1; no `ReviewedBy` field
- Bulk operations (multi-select, batch category change) — review queue is one-recipe-at-a-time
- Public visibility of "reviewed" status — badge stays inside admin
- Audit log / version history — Airtable's native revision history is the fallback
- Mobile-first design — Adi reviews on desktop; mobile is a stretch nice-to-have
- Schema-write token expansion — adding categories from the UI promotes only to the new `Categories` table; native multi-select option requires Eric to add it in Airtable manually for v1

## Context

- **Existing codebase**: Static HTML site at `website/`, deployed to Vercel. No framework, no build step. Local dev via `node _dev/serve.mjs` on port 3000.
- **Existing API**: `website/api/recipes.js` — Vercel function. Airtable PAT (`AIRTABLE_TOKEN`) with `data:read` scope only. Currently fetches all 222 records via offset pagination on every public request — no caching.
- **Airtable**: base `appSOzO2OxTctKIgD` / table `tblx4gWhB6m81apfT` (recipes). 264/1000 records used, 104.9MB attachments. Public API quota currently at **1,147 / month** — must be addressed before admin work amplifies it.
- **Brand voice**: Plural-masculine for general/site-wide copy (`feedback_hebrew_plural_masculine`); feminine singular when speaking directly to Adi.
- **RTL anchor rule**: Primary content must visibly sit on the **right** edge of the viewport (`feedback_rtl_anchor_right`).
- **Reviewer**: Adi (brand owner, non-technical, Hebrew). Eric does occasional spot-checks.
- **Detailed PRD**: [`docs/admin-tool/PRD.md`](docs/admin-tool/PRD.md) — 12 sections covering goals, screens, data/API changes, visual system, verification plan.
- **Rendered mockups**: 7 screen mockups already built and screenshotted in `docs/admin-tool/screenshots/` and live at `website/_dev-mockups/admin/*.html`.

## Constraints

- **Airtable API quota** — Public API at 1,147/month and saturating. Phase 0 (CACHE-01) must ship before any admin endpoint goes live, or admin write traffic will further pressure the quota.
- **Token scope** — Existing PAT is read-only. Admin requires a second PAT with `data:read,write` scope, stored as `AIRTABLE_WRITE_TOKEN`. Schema-write scope is intentionally NOT requested (taxonomy add-new uses a separate table workaround).
- **Tech stack** — Static HTML + inline Tailwind CDN + Vercel functions. No framework introduction. Files live under `website/admin/` (new folder).
- **RTL** — All chrome follows `feedback_rtl_anchor_right`. Editor: image (aside) on the right, form on the left.
- **Hebrew copy** — General chrome plural-masculine; Adi-direct-address feminine singular ("שלום אדי", "המשיכי", "שמרת").
- **Visual system** — Reuse existing brand palette/typography verbatim from `website/index.html`. New status colors: pending = `#B8860B` (existing gold), done = `#5a7a3a` (new sage, derived from brand).
- **No public surface changes** — Admin routes must not affect the public site. The CACHE-01 fix is the only public-side change.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Login lands on editor, not dashboard | Save a click; Adi's only task is "review next recipe" | — Pending |
| Fixed taxonomy with inline add-new | Fast checkbox review without locking out edge cases | — Pending |
| Password gate (env var + HMAC-signed cookie) | One reviewer; magic-link/OAuth overkill for v1 | — Pending |
| Skip image upload in v1 | Airtable attachment API adds 1–2 days; Adi can use Airtable UI for images | — Pending |
| Categories in a separate Airtable table | Avoids needing schema-write scope on the token | — Pending |
| Static HTML pattern (no framework) | Match existing site; no new deps, no build step | — Pending |
| Airtable cache is Phase 0 (pre-work) | Public API saturated; without it admin work compounds the problem | — Pending |
| `ReviewedAt` timestamp only (no `ReviewedBy`) | Single reviewer; deferred multi-user complexity to v2 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after initialization*
