# התפריט Homepage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `index.html` homepage for www.hatafrit.co.il — a Hebrew RTL site for Adi Gewirtzman's low-carb/gluten-free recipe brand, pivoting to her 6-week "שיטת שולחן אחד" program, with live recipe data from Airtable.

**Architecture:** Single self-contained `index.html` with all CSS inline via Tailwind CDN + custom config and all JS inline. Recipes fetched client-side from Airtable REST API on page load, cached in `window.__recipes`, used for dynamic category grid, featured cards, and live search. No build step, no framework.

**Tech Stack:** HTML5 (RTL), Tailwind CSS CDN, Frank Ruhl Libre + Heebo + Cormorant Garamond (Google Fonts), Vanilla JS ES2020+, Airtable REST API.

**Node path (Windows):** `C:\Program Files\nodejs\node.exe`
**Dev server:** `& 'C:\Program Files\nodejs\node.exe' serve.mjs` (from project root)
**Screenshot:** `& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 <label>`
**Screenshots save to:** `temporary screenshots/`

**Security note on innerHTML:** Recipe content (names, descriptions) comes from our own Airtable base which we control. All dynamic HTML rendering uses a `sanitize()` helper that escapes `<`, `>`, `"`, `'`, and `&` before injection. Do not skip this — even internal data sources should be treated as untrusted.

---

## Chunk 1: Foundation, Navigation, Hero

### Task 1: Document Foundation

**Files:**
- Modify: `index.html` (replace test content)

- [ ] **Step 1: Write the document shell**

Replace `index.html` entirely with the following. Note: `sanitize()` helper is included here for use throughout all dynamic rendering.

```html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>התפריט | עדי גוירצמן</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700;900&family=Heebo:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#C4623A', 'primary-dark': '#A84E2A',
            bg: '#FAF5ED', 'bg-alt': '#F0E8D8',
            dark: '#2C1810', olive: '#6B7A4E', muted: '#9C8878',
          },
          fontFamily: {
            display: ['"Frank Ruhl Libre"', 'serif'],
            body: ['Heebo', 'sans-serif'],
            accent: ['"Cormorant Garamond"', 'serif'],
          },
        },
      },
    };
  </script>
  <style>
    :root {
      --color-primary: #C4623A; --color-bg: #FAF5ED;
      --color-bg-alt: #F0E8D8; --color-dark: #2C1810;
      --color-olive: #6B7A4E; --color-muted: #9C8878;
    }
    * { box-sizing: border-box; }
    body { font-family: 'Heebo', sans-serif; background: var(--color-bg); color: var(--color-dark); margin: 0; direction: rtl; }

    /* Grain texture */
    .grain::after {
      content: '';
      position: absolute; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 1;
    }

    /* Shadows */
    .shadow-warm {
      box-shadow: 0 1px 2px rgba(44,24,16,0.06), 0 4px 16px rgba(196,98,58,0.08), 0 12px 40px rgba(44,24,16,0.06);
    }

    /* Transitions - only transform and opacity */
    .transition-lift { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease; }
    .transition-lift:hover { transform: translateY(-4px); }

    /* Tag pill */
    .tag-pill {
      display: inline-flex; align-items: center;
      padding: 2px 10px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 500;
      background: rgba(107,122,78,0.12); color: var(--color-olive);
      border: 1px solid rgba(107,122,78,0.25);
    }

    /* Skeleton loader */
    .skeleton {
      background: linear-gradient(90deg, #e8dfd4 25%, #f0e8d8 50%, #e8dfd4 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite; border-radius: 8px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* Fade-up animation */
    .fade-up {
      opacity: 0; transform: translateY(24px);
      animation: fadeUp 0.7s cubic-bezier(0.34,1.2,0.64,1) forwards;
      animation-fill-mode: both;
    }
    @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

    /* Recipe card image */
    .recipe-img-wrap { position: relative; overflow: hidden; border-radius: 12px 12px 0 0; }
    .recipe-img-wrap img { width: 100%; height: 220px; object-fit: cover; transition: transform 0.4s ease; }
    .recipe-img-wrap:hover img { transform: scale(1.04); }
    .recipe-img-wrap::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(44,24,16,0.55) 0%, transparent 60%);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .desktop-nav { display: none !important; }
      #mobile-menu-btn { display: block !important; }
      .two-col { grid-template-columns: 1fr !important; gap: 40px !important; }
    }
    @media (max-width: 1024px) {
      .three-col { grid-template-columns: repeat(2,1fr) !important; }
    }
    @media (max-width: 640px) {
      .three-col { grid-template-columns: 1fr !important; }
    }
  </style>
</head>
<body>

  <!-- NAV PLACEHOLDER -->
  <p id="placeholder" style="padding:2rem;">Foundation loaded</p>

</body>
</html>
```

- [ ] **Step 2: Start dev server**

```powershell
Start-Process -NoNewWindow 'C:\Program Files\nodejs\node.exe' -ArgumentList 'serve.mjs'
Start-Sleep -Seconds 2
```

- [ ] **Step 3: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 foundation
```

Expected: Cream background page, "Foundation loaded" text, no JS errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: HTML foundation with design tokens, fonts, utilities"
```

---

### Task 2: Navigation

**Files:**
- Modify: `index.html` — replace body placeholder

- [ ] **Step 1: Replace placeholder with nav + body structure**

Replace `<p id="placeholder" ...>Foundation loaded</p>` with:

```html
  <!-- ═══ NAVIGATION ═══ -->
  <header id="nav" style="position:sticky;top:0;z-index:50;background:rgba(250,245,237,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(196,98,58,0.12);transition:box-shadow 0.3s ease;">
    <nav style="max-width:1200px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;">
      <a href="/" style="text-decoration:none;">
        <span style="font-family:'Frank Ruhl Libre',serif;font-size:1.6rem;font-weight:700;color:var(--color-primary);letter-spacing:-0.02em;line-height:1;">התפריט</span>
      </a>
      <ul class="desktop-nav" style="display:flex;gap:32px;list-style:none;margin:0;padding:0;font-family:'Heebo',sans-serif;font-size:0.9rem;font-weight:500;">
        <li><a href="#recipes" style="color:var(--color-dark);text-decoration:none;opacity:0.75;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.75">מתכונים</a></li>
        <li><a href="#about" style="color:var(--color-dark);text-decoration:none;opacity:0.75;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.75">על עדי</a></li>
        <li><a href="#program" style="color:var(--color-dark);text-decoration:none;opacity:0.75;transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.75">שיטת שולחן אחד</a></li>
        <li><a href="#newsletter" style="background:var(--color-primary);color:white;text-decoration:none;padding:8px 20px;border-radius:999px;font-size:0.85rem;font-weight:600;display:inline-block;transition:background 0.2s,transform 0.2s;" onmouseover="this.style.background='#A84E2A';this.style.transform='scale(1.03)'" onmouseout="this.style.background='#C4623A';this.style.transform='scale(1)'">הצטרפי</a></li>
      </ul>
      <button id="mobile-menu-btn" aria-label="תפריט" style="display:none;background:none;border:none;cursor:pointer;padding:8px;color:var(--color-dark);">
        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
    </nav>
    <div id="mobile-menu" style="display:none;background:var(--color-bg);border-top:1px solid rgba(196,98,58,0.1);padding:16px 24px 24px;">
      <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:20px;font-size:1rem;">
        <li><a href="#recipes" style="color:var(--color-dark);text-decoration:none;font-weight:500;">מתכונים</a></li>
        <li><a href="#about" style="color:var(--color-dark);text-decoration:none;font-weight:500;">על עדי</a></li>
        <li><a href="#program" style="color:var(--color-dark);text-decoration:none;font-weight:500;">שיטת שולחן אחד</a></li>
        <li><a href="#newsletter" style="color:var(--color-primary);text-decoration:none;font-weight:600;">הצטרפי</a></li>
      </ul>
    </div>
  </header>

  <!-- ═══ HERO ═══ -->
  <!-- hero goes here -->

  <!-- ═══ MISSION STRIP ═══ -->
  <!-- mission goes here -->

  <!-- ═══ PROGRAM ═══ -->
  <!-- program goes here -->

  <!-- ═══ CATEGORIES ═══ -->
  <!-- categories goes here -->

  <!-- ═══ FEATURED ═══ -->
  <!-- featured goes here -->

  <!-- ═══ ABOUT ═══ -->
  <!-- about goes here -->

  <!-- ═══ TESTIMONIALS ═══ -->
  <!-- testimonials goes here -->

  <!-- ═══ NEWSLETTER ═══ -->
  <!-- newsletter goes here -->

  <!-- ═══ INSTAGRAM ═══ -->
  <!-- instagram goes here -->

  <!-- ═══ FOOTER ═══ -->
  <!-- footer goes here -->

  <!-- SCRIPTS GO HERE -->
```

- [ ] **Step 2: Add nav JS before `</body>`**

```html
  <script>
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      const m = document.getElementById('mobile-menu');
      m.style.display = m.style.display === 'block' ? 'none' : 'block';
    });
    document.querySelectorAll('#mobile-menu a').forEach(a => {
      a.addEventListener('click', () => { document.getElementById('mobile-menu').style.display = 'none'; });
    });
    window.addEventListener('scroll', () => {
      document.getElementById('nav').style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(44,24,16,0.08)' : 'none';
    });
  </script>
```

- [ ] **Step 3: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 nav
```

Expected: Cream sticky header. "התפריט" terracotta logo on the right (RTL). Nav links on left. Orange "הצטרפי" pill button.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: sticky RTL navigation with mobile hamburger"
```

---

### Task 3: Hero Section

**Files:**
- Modify: `index.html` — replace `<!-- hero goes here -->`

- [ ] **Step 1: Add hero HTML**

Replace `<!-- hero goes here -->` with:

```html
  <section id="hero" style="position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;background:#2C1810;" class="grain">
    <div style="position:absolute;inset:0;background-image:url('https://placehold.co/1440x900/2C1810/FAF5ED?text=Adi+Photo');background-size:cover;background-position:center 30%;opacity:0.45;"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 70% 40%,rgba(196,98,58,0.15) 0%,transparent 70%),linear-gradient(to bottom,rgba(44,24,16,0.3) 0%,rgba(44,24,16,0.7) 100%);"></div>

    <div style="position:relative;z-index:2;max-width:900px;margin:0 auto;padding:120px 32px 80px;text-align:center;width:100%;">
      <p class="fade-up" style="animation-delay:0s;font-family:'Cormorant Garamond',serif;font-size:1rem;font-style:italic;color:rgba(250,245,237,0.65);letter-spacing:0.12em;margin:0 0 20px;">One Table. Everyone eats.</p>
      <h1 class="fade-up" style="animation-delay:0.1s;font-family:'Frank Ruhl Libre',serif;font-size:clamp(2.2rem,6vw,4.2rem);font-weight:700;color:#FAF5ED;line-height:1.25;letter-spacing:-0.03em;margin:0 0 12px;">מאמא שמכינה שתי ארוחות כל ערב</h1>
      <div class="fade-up" style="animation-delay:0.2s;display:flex;align-items:center;justify-content:center;gap:16px;margin:8px 0;">
        <div style="height:1px;width:60px;background:rgba(196,98,58,0.6);"></div>
        <span style="color:var(--color-primary);font-size:1.5rem;font-weight:300;">↓</span>
        <div style="height:1px;width:60px;background:rgba(196,98,58,0.6);"></div>
      </div>
      <h2 class="fade-up" style="animation-delay:0.3s;font-family:'Frank Ruhl Libre',serif;font-size:clamp(1.8rem,5vw,3.4rem);font-weight:400;color:#FAF5ED;line-height:1.3;letter-spacing:-0.02em;margin:0 0 8px;">לאמא שמכינה ארוחה אחת לכולם.</h2>
      <h2 class="fade-up" style="animation-delay:0.4s;font-family:'Frank Ruhl Libre',serif;font-size:clamp(1.6rem,4.5vw,3rem);font-weight:700;color:var(--color-primary);line-height:1.3;letter-spacing:-0.02em;margin:0 0 32px;">אף אחד לא מרגיש שונה.</h2>
      <p class="fade-up" style="animation-delay:0.5s;font-size:1rem;color:rgba(250,245,237,0.72);line-height:1.7;margin:0 0 40px;max-width:600px;margin-left:auto;margin-right:auto;">מתכונים דלי פחמימה, ללא גלוטן, שכולם אוהבים — גם אם הם לא יודעים שזה בריא</p>

      <!-- Search bar -->
      <div class="fade-up" style="animation-delay:0.6s;max-width:580px;margin:0 auto 20px;">
        <div style="display:flex;background:rgba(250,245,237,0.95);border-radius:999px;overflow:hidden;box-shadow:0 4px 24px rgba(44,24,16,0.2);">
          <input id="hero-search" type="text" placeholder="חפשי מתכון..." style="flex:1;border:none;background:transparent;padding:14px 20px;font-family:'Heebo',sans-serif;font-size:1rem;color:var(--color-dark);direction:rtl;outline:none;" />
          <button onclick="runHeroSearch()" style="background:var(--color-primary);border:none;padding:14px 24px;cursor:pointer;color:white;font-family:'Heebo',sans-serif;font-size:0.9rem;font-weight:600;transition:background 0.2s;white-space:nowrap;" onmouseover="this.style.background='#A84E2A'" onmouseout="this.style.background='#C4623A'">חיפוש</button>
        </div>
      </div>

      <!-- Tag filter pills -->
      <div class="fade-up" style="animation-delay:0.7s;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px;">
        <button class="tag-pill hero-tag" data-tag="דל פחמימה" onclick="toggleTag(this)" style="cursor:pointer;background:rgba(250,245,237,0.15);color:rgba(250,245,237,0.85);border-color:rgba(250,245,237,0.3);">דל פחמימה</button>
        <button class="tag-pill hero-tag" data-tag="ללא גלוטן" onclick="toggleTag(this)" style="cursor:pointer;background:rgba(250,245,237,0.15);color:rgba(250,245,237,0.85);border-color:rgba(250,245,237,0.3);">ללא גלוטן</button>
        <button class="tag-pill hero-tag" data-tag="קיטו" onclick="toggleTag(this)" style="cursor:pointer;background:rgba(250,245,237,0.15);color:rgba(250,245,237,0.85);border-color:rgba(250,245,237,0.3);">קיטו</button>
        <button class="tag-pill hero-tag" data-tag="ללא סוכר" onclick="toggleTag(this)" style="cursor:pointer;background:rgba(250,245,237,0.15);color:rgba(250,245,237,0.85);border-color:rgba(250,245,237,0.3);">ללא סוכר</button>
      </div>

      <!-- CTA -->
      <a href="#program" class="fade-up" style="animation-delay:0.8s;display:inline-block;background:transparent;border:2px solid rgba(250,245,237,0.4);color:#FAF5ED;text-decoration:none;padding:12px 32px;border-radius:999px;font-family:'Heebo',sans-serif;font-size:0.9rem;font-weight:600;letter-spacing:0.02em;transition:background 0.25s,border-color 0.25s,transform 0.25s;" onmouseover="this.style.background='rgba(196,98,58,0.3)';this.style.borderColor='rgba(196,98,58,0.7)';this.style.transform='scale(1.03)'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(250,245,237,0.4)';this.style.transform='scale(1)'">גלי את שיטת שולחן אחד ←</a>
    </div>

    <!-- Search results panel -->
    <div id="search-results" style="display:none;position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:900px;background:rgba(250,245,237,0.97);border-radius:16px 16px 0 0;padding:24px 32px;max-height:50vh;overflow-y:auto;z-index:10;"></div>
  </section>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 hero
```

Expected: Dark full-height hero. Hebrew headline in 3 parts with terracotta arrow between. Search bar + tag pills + CTA all visible above fold.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: hero section with headline, animated entrance, search, tags, CTA"
```

---

## Chunk 2: Mission Strip, Program Feature, Airtable Data Layer

### Task 4: Mission Strip

**Files:**
- Modify: `index.html` — replace `<!-- mission goes here -->`

- [ ] **Step 1: Add mission strip**

Replace `<!-- mission goes here -->` with:

```html
  <section style="background:var(--color-primary);padding:28px 32px;text-align:center;">
    <p style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(1.1rem,2.5vw,1.5rem);font-weight:400;color:#FAF5ED;line-height:1.6;margin:0 auto;max-width:800px;">
      כי אני מאמינה שכולם יכולים לשבת ליד אותו שולחן — ולאכול אותה ארוחה.
    </p>
  </section>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 mission
```

Expected: Terracotta band below hero with cream sentence.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: mission strip section"
```

---

### Task 5: Program Feature Section

**Files:**
- Modify: `index.html` — replace `<!-- program goes here -->`

- [ ] **Step 1: Add program section**

Replace `<!-- program goes here -->` with:

```html
  <section id="program" style="background:var(--color-bg);padding:96px 32px;">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;" class="two-col">
      <!-- Text -->
      <div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:var(--color-primary);text-transform:uppercase;margin:0 0 12px;">הדרך שלי</p>
        <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(2rem,4vw,3rem);font-weight:700;letter-spacing:-0.03em;line-height:1.2;color:var(--color-dark);margin:0 0 16px;">שיטת שולחן אחד</h2>
        <p style="font-size:1rem;line-height:1.75;color:var(--color-muted);margin:0 0 32px;">תוכנית של 6 שבועות שמלמדת אותך להכין ארוחה אחת שמתאימה לכל המשפחה — סוכרתיים, צליאקיים, דלת פחמימה. בלי לבשל שעות. בלי מתכונים מסובכים. פשוט שולחן אחד שכולם יושבים סביבו.</p>
        <ul style="list-style:none;margin:0 0 40px;padding:0;display:flex;flex-direction:column;gap:20px;">
          <li style="display:flex;align-items:flex-start;gap:16px;"><span style="width:40px;height:40px;flex-shrink:0;background:rgba(196,98,58,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">📋</span><div><strong style="font-family:'Heebo',sans-serif;font-weight:600;color:var(--color-dark);display:block;margin-bottom:4px;">תפריטים שבועיים מוכנים</strong><span style="font-size:0.875rem;color:var(--color-muted);">לא צריך לחשוב — רק לדעת מה להכין כל ערב</span></div></li>
          <li style="display:flex;align-items:flex-start;gap:16px;"><span style="width:40px;height:40px;flex-shrink:0;background:rgba(196,98,58,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">🛒</span><div><strong style="font-family:'Heebo',sans-serif;font-weight:600;color:var(--color-dark);display:block;margin-bottom:4px;">רשימות קניות + הכנה מראש</strong><span style="font-size:0.875rem;color:var(--color-muted);">הכל מסודר ומובנה — הכנה שלוקחת דקות</span></div></li>
          <li style="display:flex;align-items:flex-start;gap:16px;"><span style="width:40px;height:40px;flex-shrink:0;background:rgba(196,98,58,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">❤️</span><div><strong style="font-family:'Heebo',sans-serif;font-weight:600;color:var(--color-dark);display:block;margin-bottom:4px;">מתכונים שמתאימים לכל המשפחה</strong><span style="font-size:0.875rem;color:var(--color-muted);">אף אחד לא מרגיש שונה — כולם אוכלים אותו דבר</span></div></li>
        </ul>
        <a href="#newsletter" style="display:inline-block;background:var(--color-primary);color:white;text-decoration:none;padding:14px 36px;border-radius:999px;font-family:'Heebo',sans-serif;font-size:1rem;font-weight:600;transition:background 0.2s,transform 0.25s;box-shadow:0 4px 20px rgba(196,98,58,0.25);" onmouseover="this.style.background='#A84E2A';this.style.transform='scale(1.03)'" onmouseout="this.style.background='#C4623A';this.style.transform='scale(1)'">ספרי לי עוד ←</a>
      </div>
      <!-- Card -->
      <div style="background:var(--color-bg-alt);border-radius:24px;padding:48px 40px;position:relative;overflow:hidden;box-shadow:0 4px 40px rgba(44,24,16,0.08);">
        <div style="position:absolute;top:-40px;left:-40px;width:180px;height:180px;background:rgba(196,98,58,0.08);border-radius:50%;"></div>
        <div style="position:relative;z-index:1;">
          <p style="font-family:'Cormorant Garamond',serif;font-size:0.8rem;letter-spacing:0.15em;color:var(--color-muted);margin:0 0 8px;">The One Table Method</p>
          <h3 style="font-family:'Frank Ruhl Libre',serif;font-size:3.5rem;font-weight:900;color:var(--color-primary);line-height:1;margin:0 0 4px;">6</h3>
          <p style="font-family:'Heebo',sans-serif;font-size:1rem;color:var(--color-dark);font-weight:600;margin:0 0 32px;">שבועות שישנו את השולחן שלך</p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div style="font-size:0.875rem;color:var(--color-muted);"><span style="color:var(--color-olive);">✓ </span>מתאים לסוכרתיים וצליאקיים</div>
            <div style="font-size:0.875rem;color:var(--color-muted);"><span style="color:var(--color-olive);">✓ </span>ללא גלוטן, ללא סוכר מוסף</div>
            <div style="font-size:0.875rem;color:var(--color-muted);"><span style="color:var(--color-olive);">✓ </span>גם הילדים הבררניים יאכלו</div>
            <div style="font-size:0.875rem;color:var(--color-muted);"><span style="color:var(--color-olive);">✓ </span>הכנה של דקות, לא שעות</div>
          </div>
          <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(44,24,16,0.08);">
            <p style="font-size:0.75rem;color:var(--color-muted);margin:0 0 4px;">שווי הנתפס</p>
            <p style="font-size:0.85rem;color:var(--color-muted);text-decoration:line-through;margin:0 0 4px;">₪2,585</p>
            <p style="font-family:'Frank Ruhl Libre',serif;font-size:2rem;font-weight:700;color:var(--color-dark);margin:0;">₪497</p>
          </div>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 program
```

Expected: Two-column layout — text with headline + bullets + CTA on right, price card with "6" on left.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: program feature section for שיטת שולחן אחד"
```

---

### Task 6: Airtable Data Layer + Sanitization

**Files:**
- Modify: `index.html` — add data layer JS before `</body>`

- [ ] **Step 1: Add data layer script**

Add before the nav script (before `</body>`):

```html
  <script>
  // ═══ AIRTABLE DATA LAYER ═══
  // Security: sanitize() escapes all user-facing strings before DOM injection.
  // Never skip sanitize() even for "internal" data — Airtable data is treated as untrusted.

  const AIRTABLE_TOKEN = "YOUR_READ_ONLY_TOKEN_HERE";
  const AIRTABLE_BASE  = "app5KCfdL587mYDxh";
  const AIRTABLE_TABLE = "tblx4gWhB6m81apfT";

  // Sanitize: escape HTML special chars before any innerHTML injection
  function sanitize(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  window.__recipes = [];
  window.__recipesLoaded = false;

  async function fetchAllRecipes() {
    const fields = [
      'flddpcF2EmlBShsSI','fldLfZTOT68WKrKi9','flduwopGbNHV4CSwu',
      'fldnObh6jNKLFQwHY','fldywAg4Ew7tyM8jY','fldSvNOvCR3lJA49B','fldQLGIBCKH4JAQIP'
    ];
    const fieldParams = fields.map(f => 'fields[]=' + f).join('&');
    let offset = null, all = [];

    do {
      const url = 'https://api.airtable.com/v0/' + AIRTABLE_BASE + '/' + AIRTABLE_TABLE
        + '?' + fieldParams + '&pageSize=100' + (offset ? '&offset=' + offset : '');
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + AIRTABLE_TOKEN } });
      if (!res.ok) { console.error('Airtable error:', res.status); break; }
      const data = await res.json();
      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    window.__recipes = all.map(r => ({
      id:          r.id,
      name:        r.fields['flddpcF2EmlBShsSI'] || '',
      category:    (r.fields['fldLfZTOT68WKrKi9'] && r.fields['fldLfZTOT68WKrKi9'].name) || '',
      tags:        (r.fields['flduwopGbNHV4CSwu'] || []).map(t => t.name || t),
      description: r.fields['fldnObh6jNKLFQwHY'] || '',
      prepTime:    r.fields['fldywAg4Ew7tyM8jY'] || '',
      imageUrl:    r.fields['fldSvNOvCR3lJA49B'] || '',
      recipeUrl:   r.fields['fldQLGIBCKH4JAQIP'] || '',
      createdTime: r.createdTime || '',
    }));

    window.__recipesLoaded = true;
    console.log('Loaded', window.__recipes.length, 'recipes');
    document.dispatchEvent(new Event('recipesLoaded'));
  }

  fetchAllRecipes().catch(err => {
    console.error('Failed to load recipes:', err);
    document.dispatchEvent(new Event('recipesLoadFailed'));
  });

  // ── Helpers ──
  function getRecipesByCategory() {
    const g = {};
    window.__recipes.forEach(r => { if (r.category) { if (!g[r.category]) g[r.category] = []; g[r.category].push(r); } });
    return g;
  }

  function getRecentWithImages(n) {
    return [...window.__recipes].filter(r => r.imageUrl)
      .sort((a,b) => new Date(b.createdTime) - new Date(a.createdTime)).slice(0, n);
  }

  function filterRecipes(query, tags) {
    const q = query.trim().toLowerCase();
    return window.__recipes.filter(r => {
      const text = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      const tag  = tags.length === 0 || tags.some(t => r.tags.includes(t));
      return text && tag;
    });
  }

  function imgFallback(url) {
    return url || 'https://placehold.co/400x300/FAF5ED/C4623A?text=%D7%9E%D7%AA%D7%9B%D7%95%D7%9F';
  }

  // Recipe card HTML — all fields sanitized before injection
  function recipeCardHTML(r) {
    const img  = imgFallback(r.imageUrl);
    const name = sanitize(r.name);
    const prep = sanitize(r.prepTime);
    const tags = r.tags.slice(0,3).map(t => '<span class="tag-pill">' + sanitize(t) + '</span>').join('');
    const href = r.recipeUrl ? ' href="' + sanitize(r.recipeUrl) + '" target="_blank" rel="noopener"' : '';
    return '<a' + href + ' style="text-decoration:none;display:block;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(44,24,16,0.07),0 8px 32px rgba(44,24,16,0.05);transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease;" onmouseover="this.style.transform=\'translateY(-6px)\';this.style.boxShadow=\'0 4px 24px rgba(44,24,16,0.1),0 16px 48px rgba(196,98,58,0.1)\'" onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'0 2px 16px rgba(44,24,16,0.07),0 8px 32px rgba(44,24,16,0.05)\'">'
      + '<div class="recipe-img-wrap"><img src="' + img + '" alt="' + name + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x300/FAF5ED/C4623A?text=%D7%9E%D7%AA%D7%9B%D7%95%D7%9F\'" /></div>'
      + '<div style="padding:20px;">'
      + '<h3 style="font-family:\'Frank Ruhl Libre\',serif;font-size:1.15rem;font-weight:600;color:var(--color-dark);margin:0 0 8px;line-height:1.3;">' + name + '</h3>'
      + (prep ? '<p style="font-size:0.8rem;color:var(--color-muted);margin:0 0 12px;">⏱ ' + prep + '</p>' : '')
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + tags + '</div>'
      + '</div></a>';
  }
  </script>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 datalayer
```

Expected: Page looks identical — data layer is invisible. No JS console errors. (With real token: `Loaded 223 recipes` in console.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: Airtable data layer with sanitization, pagination, and recipe helpers"
```

---

## Chunk 3: Recipe Sections + Search Logic

### Task 7: Recipe Categories Grid

**Files:**
- Modify: `index.html` — replace `<!-- categories goes here -->`

- [ ] **Step 1: Add categories section HTML**

Replace `<!-- categories goes here -->` with:

```html
  <section id="recipes" style="background:var(--color-bg-alt);padding:96px 32px;">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:56px;">
        <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:var(--color-primary);text-transform:uppercase;margin:0 0 8px;">הארכיון</p>
        <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:700;letter-spacing:-0.03em;color:var(--color-dark);margin:0;">כל המתכונים</h2>
      </div>
      <div id="cat-skeleton" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;" class="three-col">
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
        <div class="skeleton" style="height:200px;border-radius:16px;"></div>
      </div>
      <div id="cat-grid" style="display:none;grid-template-columns:repeat(3,1fr);gap:24px;" class="three-col"></div>
    </div>
  </section>
```

- [ ] **Step 2: Add categories rendering JS (after data layer script)**

```html
  <script>
  // ═══ CATEGORIES ═══
  function renderCategories() {
    const groups = getRecipesByCategory();
    const grid = document.getElementById('cat-grid');
    const skel = document.getElementById('cat-skeleton');
    const html = Object.entries(groups).map(([cat, recipes]) => {
      const img  = (recipes.find(r => r.imageUrl) || {}).imageUrl;
      const src  = img || 'https://placehold.co/400x260/FAF5ED/C4623A?text=' + encodeURIComponent(cat);
      const n    = sanitize(String(recipes.length));
      const c    = sanitize(cat);
      return '<div class="transition-lift" style="position:relative;border-radius:16px;overflow:hidden;cursor:pointer;box-shadow:0 2px 16px rgba(44,24,16,0.06);" onclick="filterByCategory(\'' + c.replace(/'/g, "\\'") + '\')">'
        + '<img src="' + src + '" alt="' + c + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x260/FAF5ED/C4623A?text=' + encodeURIComponent(cat) + '\'" style="width:100%;height:200px;object-fit:cover;display:block;" />'
        + '<div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(44,24,16,0.7) 0%,rgba(44,24,16,0.1) 60%);"></div>'
        + '<div style="position:absolute;bottom:0;right:0;left:0;padding:20px 16px;">'
        + '<h3 style="font-family:\'Frank Ruhl Libre\',serif;font-size:1.15rem;font-weight:600;color:#FAF5ED;margin:0 0 4px;">' + c + '</h3>'
        + '<span style="font-size:0.75rem;color:rgba(250,245,237,0.7);">' + n + ' מתכונים</span>'
        + '</div></div>';
    }).join('');
    grid.innerHTML = html;
    skel.style.display = 'none';
    grid.style.display = 'grid';
  }

  function filterByCategory(cat) {
    const el = document.getElementById('cat-results');
    if (!el) return;
    const items = window.__recipes.filter(r => r.category === cat);
    renderRecipeGrid(el, items, 'מתכוני ' + cat);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('recipesLoaded', renderCategories);
  document.addEventListener('recipesLoadFailed', () => { document.getElementById('cat-skeleton').style.display = 'none'; });
  </script>
```

- [ ] **Step 3: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 categories
```

Expected: 6 skeleton cards in 3-column grid. (Real token: filled with category cards showing image, name, and recipe count.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: recipe categories grid with skeleton and dynamic rendering"
```

---

### Task 8: Featured Recipes + Grid Renderer

**Files:**
- Modify: `index.html` — replace `<!-- featured goes here -->`

- [ ] **Step 1: Add featured section HTML**

Replace `<!-- featured goes here -->` with:

```html
  <section style="background:var(--color-bg);padding:96px 32px;">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:56px;">
        <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:var(--color-primary);text-transform:uppercase;margin:0 0 8px;">האחרונים</p>
        <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:700;letter-spacing:-0.03em;color:var(--color-dark);margin:0 0 8px;">מתכונים אהובים</h2>
      </div>
      <div id="cat-results" style="margin-bottom:64px;"></div>
      <div id="feat-skeleton" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;" class="three-col">
        <div class="skeleton" style="height:360px;border-radius:16px;"></div>
        <div class="skeleton" style="height:360px;border-radius:16px;"></div>
        <div class="skeleton" style="height:360px;border-radius:16px;"></div>
      </div>
      <div id="feat-grid" style="display:none;grid-template-columns:repeat(3,1fr);gap:24px;" class="three-col"></div>
      <div style="text-align:center;margin-top:48px;">
        <a href="#recipes" style="font-family:'Heebo',sans-serif;font-size:0.95rem;color:var(--color-primary);text-decoration:none;font-weight:600;border-bottom:2px solid rgba(196,98,58,0.3);padding-bottom:2px;transition:border-color 0.2s;" onmouseover="this.style.borderColor='var(--color-primary)'" onmouseout="this.style.borderColor='rgba(196,98,58,0.3)'">לכל המתכונים ←</a>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Add featured JS + generic grid renderer**

```html
  <script>
  // ═══ FEATURED RECIPES + GENERIC GRID RENDERER ═══
  function renderRecipeGrid(container, recipes, title) {
    if (!container) return;
    if (!recipes.length) { container.innerHTML = '<p style="text-align:center;color:var(--color-muted);padding:32px 0;">לא נמצאו מתכונים</p>'; return; }
    const titleHTML = title ? '<h3 style="font-family:\'Frank Ruhl Libre\',serif;font-size:1.5rem;font-weight:600;color:var(--color-dark);margin:0 0 24px;">' + sanitize(title) + '</h3>' : '';
    container.innerHTML = titleHTML + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;">' + recipes.map(recipeCardHTML).join('') + '</div>';
  }

  function renderFeatured() {
    const feat = getRecentWithImages(3);
    const grid = document.getElementById('feat-grid');
    const skel = document.getElementById('feat-skeleton');
    grid.innerHTML = feat.map(recipeCardHTML).join('');
    skel.style.display = 'none';
    grid.style.display = 'grid';
  }

  document.addEventListener('recipesLoaded', renderFeatured);
  document.addEventListener('recipesLoadFailed', () => { document.getElementById('feat-skeleton').style.display = 'none'; });
  </script>
```

- [ ] **Step 3: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 featured
```

Expected: 3 tall skeleton cards. (Real token: 3 latest recipe cards with images, names, tags.)

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: featured recipes section with generic grid renderer"
```

---

### Task 9: Hero Search & Filter Logic

**Files:**
- Modify: `index.html` — add search JS

- [ ] **Step 1: Add search JS**

```html
  <script>
  // ═══ HERO SEARCH & FILTER ═══
  let activeTags = [];

  function toggleTag(btn) {
    const tag = btn.dataset.tag;
    const idx = activeTags.indexOf(tag);
    if (idx === -1) {
      activeTags.push(tag);
      btn.dataset.active = 'true';
      btn.style.background = 'var(--color-primary)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--color-primary)';
    } else {
      activeTags.splice(idx, 1);
      delete btn.dataset.active;
      btn.style.background = 'rgba(250,245,237,0.15)';
      btn.style.color = 'rgba(250,245,237,0.85)';
      btn.style.borderColor = 'rgba(250,245,237,0.3)';
    }
    runHeroSearch();
  }

  function runHeroSearch() {
    const query = (document.getElementById('hero-search') || {}).value || '';
    const panel = document.getElementById('search-results');
    if (!panel) return;
    if (!query && !activeTags.length) { panel.style.display = 'none'; return; }
    if (!window.__recipesLoaded) {
      panel.style.display = 'block';
      panel.innerHTML = '<p style="text-align:center;padding:24px;color:var(--color-muted);">טוענת מתכונים...</p>';
      return;
    }
    const results = filterRecipes(query, activeTags);
    panel.style.display = 'block';
    if (!results.length) {
      panel.innerHTML = '<p style="text-align:center;color:var(--color-muted);padding:24px 0;">לא נמצאו מתכונים. נסי מילת חיפוש אחרת.</p>';
      return;
    }
    const clearBtn = '<button onclick="clearSearch()" style="background:none;border:none;cursor:pointer;font-size:0.875rem;color:var(--color-primary);font-family:\'Heebo\',sans-serif;">נקי חיפוש ✕</button>';
    const countTxt = '<span style="font-size:0.875rem;color:var(--color-muted);">נמצאו ' + sanitize(String(results.length)) + ' מתכונים</span>';
    const grid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">' + results.slice(0,12).map(recipeCardHTML).join('') + '</div>';
    const more = results.length > 12 ? '<p style="text-align:center;font-size:0.8rem;color:var(--color-muted);margin-top:16px;">מציגה 12 מתוך ' + sanitize(String(results.length)) + ' תוצאות</p>' : '';
    panel.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' + countTxt + clearBtn + '</div>' + grid + more;
  }

  function clearSearch() {
    const inp = document.getElementById('hero-search');
    if (inp) inp.value = '';
    activeTags = [];
    document.querySelectorAll('.hero-tag').forEach(btn => {
      delete btn.dataset.active;
      btn.style.background = 'rgba(250,245,237,0.15)';
      btn.style.color = 'rgba(250,245,237,0.85)';
      btn.style.borderColor = 'rgba(250,245,237,0.3)';
    });
    document.getElementById('search-results').style.display = 'none';
  }

  const searchInput = document.getElementById('hero-search');
  if (searchInput) searchInput.addEventListener('input', runHeroSearch);
  </script>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 search
```

Expected: Visually identical to previous. Manually verify: typing in search box shows results panel. Tag pills turn terracotta when active.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: hero search and tag filter with sanitized live results"
```

---

## Chunk 4: About, Testimonials, Newsletter, Instagram, Footer, Polish

### Task 10: About Adi

**Files:**
- Modify: `index.html` — replace `<!-- about goes here -->`

- [ ] **Step 1: Add about section**

Replace `<!-- about goes here -->` with:

```html
  <section id="about" style="background:var(--color-bg-alt);padding:96px 32px;">
    <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;" class="two-col">
      <div>
        <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:var(--color-primary);text-transform:uppercase;margin:0 0 12px;">הסיפור שלי</p>
        <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:700;letter-spacing:-0.03em;color:var(--color-dark);margin:0 0 24px;">שלום, אני עדי</h2>
        <p style="font-size:1.05rem;line-height:1.8;color:var(--color-muted);margin:0 0 20px;">התחלתי את התפריט מתוך הצורך האישי שלי — להכין ארוחה אחת שכל המשפחה יכולה לאכול, בלי שאף אחד ירגיש שונה על השולחן.</p>
        <p style="font-size:1.05rem;line-height:1.8;color:var(--color-muted);margin:0 0 32px;">היום, קהילה של מעל 115,000 נשים מכינות מתכונים דלי פחמימה, ללא גלוטן, שכולם אוהבים — גם הסוכרתיים, גם הצליאקיים, גם הילדים הבררניים.</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <span style="padding:6px 16px;border-radius:999px;font-size:0.8rem;font-weight:500;background:rgba(196,98,58,0.1);color:var(--color-primary);border:1px solid rgba(196,98,58,0.2);">סוכרת ✓</span>
          <span style="padding:6px 16px;border-radius:999px;font-size:0.8rem;font-weight:500;background:rgba(107,122,78,0.1);color:var(--color-olive);border:1px solid rgba(107,122,78,0.2);">צליאק ✓</span>
          <span style="padding:6px 16px;border-radius:999px;font-size:0.8rem;font-weight:500;background:rgba(107,122,78,0.1);color:var(--color-olive);border:1px solid rgba(107,122,78,0.2);">דל פחמימה ✓</span>
          <span style="padding:6px 16px;border-radius:999px;font-size:0.8rem;font-weight:500;background:rgba(44,24,16,0.06);color:var(--color-muted);border:1px solid rgba(44,24,16,0.1);">115K+ קהילה ❤️</span>
        </div>
      </div>
      <div style="position:relative;">
        <div style="border-radius:24px;overflow:hidden;box-shadow:0 8px 48px rgba(44,24,16,0.12);">
          <img src="https://placehold.co/600x700/F0E8D8/2C1810?text=%D7%A2%D7%93%D7%99" alt="עדי גוירצמן" style="width:100%;display:block;object-fit:cover;" />
        </div>
        <div style="position:absolute;bottom:-20px;left:-20px;width:100px;height:100px;background:rgba(196,98,58,0.12);border-radius:50%;z-index:-1;"></div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Screenshot and verify**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 about
```

Expected: Two-column — bio + tags on right, placeholder photo on left.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: About Adi section"
```

---

### Task 11: Testimonials, Newsletter, Instagram CTA, Footer

**Files:**
- Modify: `index.html` — replace last 4 section placeholders

- [ ] **Step 1: Add testimonials**

Replace `<!-- testimonials goes here -->` with:

```html
  <section style="background:var(--color-bg);padding:96px 32px;">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:56px;">
        <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:var(--color-primary);text-transform:uppercase;margin:0 0 8px;">הקהילה מספרת</p>
        <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(2rem,4vw,2.8rem);font-weight:700;letter-spacing:-0.03em;color:var(--color-dark);margin:0;">מה הן אומרות</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;" class="three-col">
        <div style="background:var(--color-bg-alt);border-radius:20px;padding:36px 32px;position:relative;box-shadow:0 2px 16px rgba(44,24,16,0.05);">
          <span style="font-family:'Frank Ruhl Libre',serif;font-size:4rem;color:var(--color-primary);opacity:0.25;line-height:1;position:absolute;top:16px;right:24px;">"</span>
          <p style="font-size:1rem;line-height:1.75;color:var(--color-dark);margin:0 0 24px;position:relative;z-index:1;">הבן שלי עם סכרת נעורים וצליאק, בזכותך אוכל אוכל טעים. כדאי להדגיש שטוב לצליאקיים.</p>
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:36px;height:36px;border-radius:50%;background:rgba(196,98,58,0.15);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">👩</div><span style="font-size:0.8rem;color:var(--color-muted);">חברת קהילה</span></div>
        </div>
        <div style="background:var(--color-bg-alt);border-radius:20px;padding:36px 32px;position:relative;box-shadow:0 2px 16px rgba(44,24,16,0.05);margin-top:24px;">
          <span style="font-family:'Frank Ruhl Libre',serif;font-size:4rem;color:var(--color-primary);opacity:0.25;line-height:1;position:absolute;top:16px;right:24px;">"</span>
          <p style="font-size:1rem;line-height:1.75;color:var(--color-dark);margin:0 0 24px;position:relative;z-index:1;">יש דברים שהמשפחה אוכלת ואפילו לא שמים לב לזה שזה דל״פ. אף אחד לא מרגיש שהכל ללא גלוטן.</p>
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:36px;height:36px;border-radius:50%;background:rgba(107,122,78,0.15);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">👩</div><span style="font-size:0.8rem;color:var(--color-muted);">חברת קהילה</span></div>
        </div>
        <div style="background:var(--color-bg-alt);border-radius:20px;padding:36px 32px;position:relative;box-shadow:0 2px 16px rgba(44,24,16,0.05);">
          <span style="font-family:'Frank Ruhl Libre',serif;font-size:4rem;color:var(--color-primary);opacity:0.25;line-height:1;position:absolute;top:16px;right:24px;">"</span>
          <p style="font-size:1rem;line-height:1.75;color:var(--color-dark);margin:0 0 24px;position:relative;z-index:1;">אחרי כל סדנה שלך אני אומרת לעצמי איפה הייתי עד היום. נותן המון מוטיבציה וחיזוק.</p>
          <div style="display:flex;align-items:center;gap:12px;"><div style="width:36px;height:36px;border-radius:50%;background:rgba(196,98,58,0.15);display:flex;align-items:center;justify-content:center;font-size:0.9rem;">👩</div><span style="font-size:0.8rem;color:var(--color-muted);">חברת קהילה</span></div>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Add newsletter**

Replace `<!-- newsletter goes here -->` with:

```html
  <section id="newsletter" style="background:var(--color-dark);padding:96px 32px;text-align:center;position:relative;overflow:hidden;">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(196,98,58,0.12) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:relative;z-index:1;max-width:560px;margin:0 auto;">
      <p style="font-family:'Cormorant Garamond',serif;font-size:0.85rem;letter-spacing:0.15em;color:rgba(250,245,237,0.5);text-transform:uppercase;margin:0 0 12px;">הישארי מעודכנת</p>
      <h2 style="font-family:'Frank Ruhl Libre',serif;font-size:clamp(1.8rem,4vw,2.5rem);font-weight:700;letter-spacing:-0.03em;color:#FAF5ED;line-height:1.3;margin:0 0 12px;">מתכון חדש כל שבוע</h2>
      <p style="font-size:1rem;color:rgba(250,245,237,0.6);line-height:1.7;margin:0 0 36px;">שמתאים לכולם — גם לסוכרתיים, גם לצליאקיים, גם לילדים הבררניים.</p>
      <form id="nl-form" onsubmit="handleNewsletter(event)" style="display:flex;gap:0;max-width:440px;margin:0 auto 12px;border-radius:999px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.2);">
        <input type="email" id="nl-email" placeholder="כתובת האימייל שלך" required style="flex:1;border:none;background:rgba(250,245,237,0.95);padding:14px 20px;font-family:'Heebo',sans-serif;font-size:0.95rem;color:var(--color-dark);direction:rtl;outline:none;" />
        <button type="submit" style="background:var(--color-primary);border:none;padding:14px 24px;cursor:pointer;color:white;font-family:'Heebo',sans-serif;font-size:0.9rem;font-weight:600;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#A84E2A'" onmouseout="this.style.background='#C4623A'">הצטרפי</button>
      </form>
      <div id="nl-success" style="display:none;color:rgba(250,245,237,0.85);font-size:0.95rem;padding:12px 0;">תודה! נשלח לך מתכון בקרוב 🙏</div>
      <p style="font-size:0.75rem;color:rgba(250,245,237,0.35);margin:8px 0 0;">בלי ספאם. בלי שטויות. רק מתכונים טובים.</p>
    </div>
  </section>
```

- [ ] **Step 3: Add Instagram CTA**

Replace `<!-- instagram goes here -->` with:

```html
  <section style="background:var(--color-bg);padding:56px 32px;border-top:3px solid rgba(196,98,58,0.15);border-bottom:3px solid rgba(196,98,58,0.15);text-align:center;">
    <div style="max-width:600px;margin:0 auto;">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--color-primary);margin-bottom:12px;"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
      <h3 style="font-family:'Frank Ruhl Libre',serif;font-size:1.5rem;font-weight:600;color:var(--color-dark);margin:0 0 8px;">עקבי אחרינו באינסטגרם</h3>
      <p style="font-size:0.9rem;color:var(--color-muted);margin:0 0 24px;">@hatafrit · 115,000 עוקבים</p>
      <a href="https://www.instagram.com/hatafrit/" target="_blank" rel="noopener" style="display:inline-block;border:2px solid var(--color-primary);color:var(--color-primary);text-decoration:none;padding:10px 28px;border-radius:999px;font-family:'Heebo',sans-serif;font-size:0.9rem;font-weight:600;transition:background 0.2s,color 0.2s,transform 0.2s;" onmouseover="this.style.background='var(--color-primary)';this.style.color='white';this.style.transform='scale(1.03)'" onmouseout="this.style.background='transparent';this.style.color='var(--color-primary)';this.style.transform='scale(1)'">עקבי אחרינו באינסטגרם ←</a>
    </div>
  </section>
```

- [ ] **Step 4: Add footer**

Replace `<!-- footer goes here -->` with:

```html
  <footer style="background:var(--color-dark);padding:56px 32px 32px;color:rgba(250,245,237,0.6);">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:32px;padding-bottom:32px;border-bottom:1px solid rgba(250,245,237,0.08);" class="footer-grid">
        <div style="display:flex;gap:24px;flex-wrap:wrap;">
          <a href="#recipes" style="color:rgba(250,245,237,0.5);text-decoration:none;font-size:0.85rem;transition:color 0.2s;" onmouseover="this.style.color='rgba(250,245,237,0.9)'" onmouseout="this.style.color='rgba(250,245,237,0.5)'">מתכונים</a>
          <a href="#about" style="color:rgba(250,245,237,0.5);text-decoration:none;font-size:0.85rem;transition:color 0.2s;" onmouseover="this.style.color='rgba(250,245,237,0.9)'" onmouseout="this.style.color='rgba(250,245,237,0.5)'">על עדי</a>
          <a href="#program" style="color:rgba(250,245,237,0.5);text-decoration:none;font-size:0.85rem;transition:color 0.2s;" onmouseover="this.style.color='rgba(250,245,237,0.9)'" onmouseout="this.style.color='rgba(250,245,237,0.5)'">שיטת שולחן אחד</a>
        </div>
        <a href="/" style="text-decoration:none;"><span style="font-family:'Frank Ruhl Libre',serif;font-size:1.6rem;font-weight:700;color:var(--color-primary);letter-spacing:-0.02em;">התפריט</span></a>
        <div style="display:flex;gap:16px;justify-content:flex-end;">
          <a href="https://www.instagram.com/hatafrit/" target="_blank" rel="noopener" style="color:rgba(250,245,237,0.4);transition:color 0.2s;" onmouseover="this.style.color='rgba(250,245,237,0.9)'" onmouseout="this.style.color='rgba(250,245,237,0.4)'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
          <a href="https://www.facebook.com/hatafrit" target="_blank" rel="noopener" style="color:rgba(250,245,237,0.4);transition:color 0.2s;" onmouseover="this.style.color='rgba(250,245,237,0.9)'" onmouseout="this.style.color='rgba(250,245,237,0.4)'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
        </div>
      </div>
      <div style="text-align:center;padding-top:24px;font-size:0.75rem;color:rgba(250,245,237,0.25);">© 2026 התפריט — עדי גוירצמן. כל הזכויות שמורות.</div>
    </div>
  </footer>
```

- [ ] **Step 5: Add newsletter JS + scroll animations**

Add before `</body>` (replace `<!-- SCRIPTS GO HERE -->`):

```html
  <script>
  function handleNewsletter(e) {
    e.preventDefault();
    const email = document.getElementById('nl-email').value;
    if (!email || !email.includes('@')) return;
    document.getElementById('nl-form').style.display = 'none';
    document.getElementById('nl-success').style.display = 'block';
  }

  // Scroll-triggered fade-in for non-hero content
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('section > div > div > h2, section > div > h2, section > div > p').forEach(el => {
    if (el.closest('#hero')) return; // skip hero — already animated
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.2,0.64,1)';
    scrollObserver.observe(el);
  });
  </script>
```

- [ ] **Step 6: Full-page screenshot — desktop**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 complete
```

Read the screenshot. Verify all sections are present and styled correctly.

- [ ] **Step 7: Second pass screenshot**

```powershell
& 'C:\Program Files\nodejs\node.exe' screenshot.mjs http://localhost:3000 complete-pass2
```

Compare against previous. Fix any regressions.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat: testimonials, newsletter, Instagram CTA, footer, scroll animations — complete homepage"
```

---

## Post-Implementation Checklist

- [ ] Replace `AIRTABLE_TOKEN` constant with real read-only personal access token
- [ ] Verify browser console shows `Loaded 223 recipes` with real token
- [ ] Drop `brand_assets/adi-hero.jpg` → update hero `background-image` URL
- [ ] Drop `brand_assets/adi-about.jpg` → update about `img src`
- [ ] Drop `brand_assets/logo.svg` → replace text wordmark `<span>` with `<img>`
- [ ] Test recipe search, category filter, tag pills end-to-end
- [ ] Verify RTL layout at 1280px and 375px viewports
- [ ] Confirm hero headline above fold on 1280px desktop
- [ ] Visual sign-off from Adi Gewirtzman
