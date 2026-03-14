# התפריט Homepage — Design Spec
**Date:** 2026-03-13
**Owner:** Adi Gewirtzman / התפריט
**Site:** www.hatafrit.co.il

---

## Context & Strategic Brief

Adi Gewirtzman is pivoting התפריט from a recipe blog with books to a **transformation brand** anchored by her flagship 6-week program: **שיטת שולחן אחד** (The One Table Method).

The homepage must:
- Serve an existing community of **115,000 followers** — cannot alienate them
- Subtly reframe the site around the new mission without a hard sell
- Lead with **Adi's story and mission** as the primary visitor experience
- Surface recipes dynamically from Airtable
- Gently introduce שיטת שולחן אחד as "Adi's method" rather than a sales pitch

**Core transformation sentence (hero headline):**
> מאמא שמכינה שתי ארוחות כל ערב — כי מישהו במשפחה חייב לאכול אחרת — לאמא שמכינה ארוחה אחת לכולם. אף אחד לא מרגיש שונה.

**Two target audiences:**
- **Segment A:** Families with a diabetic or celiac member — cooking separate meals daily
- **Segment B:** Keto/low-carb moms — eating leftovers standing up while family eats normally

---

## Technical Constraints

- **Output:** Single `index.html` file, all styles inline, served via `node serve.mjs` at localhost:3000
- **Styling:** Tailwind CSS via CDN + custom config for brand tokens
- **Language:** Hebrew primary (RTL, `dir="rtl"`), English accents on select typographic elements
- **Recipe data:** Fetched client-side from Airtable REST API
  - Base: `app5KCfdL587mYDxh` (Hatafrit - Recipes)
  - Table: `tblx4gWhB6m81apfT` (Recipes only — 223 records)
  - Fields used: Name, Category, Tags, Description, Prep Time, Image URL, Recipe URL
  - **Incomplete Recipes table is excluded entirely**
  - API token: read-only personal access token (scoped to this base only), embedded in client-side JS — acceptable since data is non-sensitive
  - Token placeholder: `const AIRTABLE_TOKEN = "YOUR_READ_ONLY_TOKEN_HERE"` at top of script block — owner replaces before deploy
  - Developer must verify field IDs against live schema at project start (call Airtable Metadata API on `tblx4gWhB6m81apfT`)
- **Images:** Hosted on Wix CDN (existing URLs in Airtable records)
- **Placeholder images:** `https://placehold.co/` for any missing images. Recipe image fallback: `https://placehold.co/400x300/FAF5ED/C4623A?text=מתכון`
- **Hero background:** Use `https://placehold.co/1440x900/2C1810/FAF5ED?text=Adi+Photo` until `brand_assets/adi-hero.jpg` is provided
- **Logo:** Render as styled Hebrew text (`התפריט` in Frank Ruhl Libre, terracotta) until `brand_assets/logo.svg` is provided
- **About Adi photo:** Use `https://placehold.co/600x700/F0E8D8/2C1810?text=עדי` until `brand_assets/adi-about.jpg` is provided
- **No books** — removed entirely from the site
- **No frameworks** — vanilla JS only

---

## Visual Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#C4623A` | CTAs, accents, highlights |
| `--color-bg` | `#FAF5ED` | Main background (warm cream) |
| `--color-bg-alt` | `#F0E8D8` | Alternating section backgrounds |
| `--color-dark` | `#2C1810` | Text, headings |
| `--color-olive` | `#6B7A4E` | Tags, secondary accents |
| `--color-muted` | `#9C8878` | Captions, meta text |

### Typography
| Role | Font | Notes |
|---|---|---|
| Display / Hebrew headings | Frank Ruhl Libre | Loaded from Google Fonts; warm serif, native Hebrew |
| Body / UI | Heebo | Clean Hebrew sans-serif |
| English accent text | Cormorant Garamond | Used for English labels, section intros |

### Design Principles
- Layered radial gradients + SVG grain texture for depth on hero
- Shadows: color-tinted, low opacity (not flat `shadow-md`)
- Animations: `transform` and `opacity` only, spring-style easing, staggered on page load
- Every interactive element: hover + focus-visible + active states
- Recipe images: gradient overlay `from-black/50` + color treatment via `mix-blend-multiply`
- Spacing: intentional tokens (4, 8, 16, 24, 40, 64, 96px)

---

## Page Architecture (top to bottom)

### 1. Navigation
- Sticky, blur-backed header
- Logo centered (התפריט wordmark)
- Links: מתכונים | על עדי | שיטת שולחן אחד | צרי קשר
- Mobile: hamburger menu

### 2. Hero Section
- Full viewport height
- Background: Adi's photo (warm kitchen), gradient overlay, grain texture
- Dominant headline (Frank Ruhl Libre, large): transformation sentence split across 3 lines
- Sub-headline: "מתכונים דלי פחמימה, ללא גלוטן, שכולם אוהבים — גם אם הם לא יודעים שזה בריא"
- **Recipe search bar** prominently placed below headline
  - Text input: "חפשי מתכון..."
  - Tag filter pills: דל פחמימה / ללא גלוטן / קיטו / ללא סוכר
  - Tag filter uses **OR logic** (selecting multiple tags returns recipes matching ANY selected tag — better for discovery)
  - Text search matches against Name and Description fields (case-insensitive)
  - Search filters live against Airtable data (client-side after initial fetch)
- CTA button (terracotta): "גלי את שיטת שולחן אחד ←"

### 3. Mission Strip
- Full-width warm band (#C4623A background, cream text)
- Single sentence in Adi's voice: "כי אני מאמינה שכל אחד באחד יכול לשבת ליד אותו שולחן — ולאכול אותה ארוחה."

### 4. שיטת שולחן אחד Feature
- Two-column: left = editorial text, right = visual card/mockup
- Framed softly as "הדרך שלי" — not a sales section
- Brief description of the 6-week program
- 3 bullet promise points (icons):
  - תפריטים שבועיים מוכנים
  - רשימות קניות + הכנה מראש
  - מתכונים שמתאימים לכל המשפחה
- CTA: "ספרי לי עוד" (secondary style)

### 5. Recipe Categories
- Section title: "כל המתכונים"
- Grid of category cards (3 columns desktop, 2 tablet, 1 mobile)
- Categories pulled from Airtable schema:
  - לחמים ולחמניות, פיצות ופוקאצ'ות, מאפים ממולאים, עוגיות ומתוקים, קריספיז מהתנור, קינוחים עם טוויסט, ארוחת צהריים, עוגות ביתיות, במיוחד לילדוד'ס + holiday grouping
- Category list derived by grouping `window.__recipes` by the `Category` field (`fldLfZTOT68WKrKi9`) client-side
- Each card: category name, recipe count (= number of records in group), representative image (= first record in group with non-null Image URL), warm hover lift
- If no image exists for a category, use `https://placehold.co/400x300/FAF5ED/C4623A?text=<category-name>`

### 6. Featured Recipes
- Section title: "מתכונים אהובים"
- 3 recipe cards: sort Airtable fetch by `createdTime` descending, pick first 3 records with a non-null Image URL
- Each card: image with gradient overlay, name, prep time, tag pills
- Click → opens Recipe URL in new tab
- "לכל המתכונים ←" link below

### 7. About Adi
- Two-column: photo (right in RTL) + text (left)
- Short, warm, personal paragraph
- Credential tags: סוכרת | צליאק | דל פחמימה | 115K+ קהילה

### 8. Testimonials
- Real DM quotes from the offer doc (anonymized)
- 3-column card grid on warm cream background (#F0E8D8)
- Quote cards with large quotation mark accent in terracotta
- Sample quotes to use:
  - "הבן שלי עם סכרת נעורים וצליאק, בזכותך אוכל אוכל טעים"
  - "יש דברים שהמשפחה אוכלת ואפילו לא שמים לב לזה שזה דל״פ"
  - "אחרי כל סדנה שלך אני אומרת לעצמי איפה הייתי עד היום"

### 9. Newsletter Signup
- Simple, centered, on dark background (#2C1810)
- Headline: "מתכון חדש כל שבוע — שמתאים לכולם"
- Email input + subscribe button
- No external service integration needed (static form for now)
- On submit: prevent default, validate email format, show inline success message: "תודה! נשלח לך מתכון בקרוב 🙏" — no network call

### 10. Instagram CTA
- Single full-width warm band with "@hatafrit" handle, Instagram icon, and a "עקבי אחרינו באינסטגרם ←" button linking to https://www.instagram.com/hatafrit/
- No fake image grid — avoids appearing broken to real visitors
- Background: cream with terracotta accent border

### 11. Footer
- Logo, minimal nav links, social icons (Instagram, Facebook)
- Copyright line
- Background: dark (#2C1810)

---

## Data Layer — Airtable Integration

### Fetch Strategy
- On page load: fetch all recipes from `tblx4gWhB6m81apfT` using Airtable REST API
- Fields to request: `flddpcF2EmlBShsSI` (Name), `fldLfZTOT68WKrKi9` (Category), `flduwopGbNHV4CSwu` (Tags), `fldnObh6jNKLFQwHY` (Description), `fldywAg4Ew7tyM8jY` (Prep Time), `fldSvNOvCR3lJA49B` (Image URL), `fldQLGIBCKH4JAQIP` (Recipe URL)
- Handle pagination (Airtable returns max 100 per page, use `offset` cursor)
- Cache in `window.__recipes` for search/filter use
- Show skeleton loaders while fetching

### Search & Filter
- Client-side filtering against `window.__recipes`
- Text search: matches against Name and Description fields
- Tag filters: OR logic (recipes matching ANY selected tag are returned — better for discovery)
- Results update live as user types/selects

### Error Handling
- If Airtable fetch fails: show static fallback grid with placeholder cards
- If individual image URL fails: fallback to `https://placehold.co/400x300`

---

## Out of Scope
- Books section (removed entirely)
- E-commerce / purchase flow (handled by external link to program page)
- User accounts / login
- CMS for non-recipe content
- Mobile app

---

## Success Criteria
- [ ] Hero transformation headline is fully above the fold on 1280px desktop viewport
- [ ] Recipe search returns live Airtable results with no console errors
- [ ] All 10 sections render correctly on mobile (375px) and desktop (1280px)
- [ ] שיטת שולחן אחד CTA is visible without scrolling on desktop
- [ ] RTL layout is correct throughout — no broken LTR elements
- [ ] Site is visually approved by Adi Gewirtzman before launch (qualitative sign-off)
- [ ] Passes 2 rounds of screenshot comparison with no visible regressions
- [ ] Page loads in under 3 seconds on a standard connection (Lighthouse performance ≥ 80)
