# Zenith Design Website — Claude Context

## Project Overview

Static marketing website for Zenith Design, a boutique UI/UX design studio in Tokyo.
Single-page HTML/CSS/JS site with i18n support (EN / ZH / JA).

**Stack:** Plain HTML + CSS + Vanilla JS (no framework)
**Fonts:** PolySans Trial (local) + DM Sans (Google Fonts)
**QA:** BackstopJS pixel-comparison against Figma reference images

---

## Required Skills

When working on any iterative improvement task with a numeric target (QA mismatch %, performance score, error count), **always invoke `approach-pivot-detection` before starting**.

---

## Repository

- **GitHub:** https://github.com/phw771211/zenith-design-website
- **Figma file key:** `QTyUfUwoqT0MFxPE1xIawe`
- **Figma page node:** `30:4` ("Big In Japan" — the full page frame)

---

## Key Commands

```bash
npm start              # Serve at http://localhost:3000 (required before QA)
npm run qa             # Run BackstopJS pixel comparison
npm run qa:approve     # Approve current screenshots as new reference
npm run qa:update-refs # Fetch Figma references (requires FIGMA_TOKEN in .env)
npm run qa:report      # Open BackstopJS HTML report
```

---

## Fonts

All fonts are loaded locally from `polysans-font-family/` via `@font-face` with `font-display: block`.

| Family | File | Usage |
|--------|------|-------|
| PolySans Bulky | `polysanstrial-bulky.otf` | Section headings (hero title, approach title, services title) |
| PolySans Median | `polysanstrial-median.otf` | Card titles, service names, buttons |
| PolySans Neutral | `polysanstrial-neutral.otf` | Small labels (approach stage numbers) |
| PolySans Neutral Mono | `polysanstrial-neutralmono.otf` | Service item numbers (01, 02, 03) |
| DM Sans | Google Fonts | Body text, descriptions |

**Note:** PolySans Trial is a commercial font. Do not commit the OTF files to public repos.

---

## QA Pipeline

**Tool:** BackstopJS 6.x with Puppeteer
**Viewport:** 1440 × 900 desktop only
**Threshold:** 5% mismatch (fail if above)
**`requireSameDimensions: false`** — height differences between test and reference do not count as failure; Resemble.js compares only up to the minimum of both heights.

### Figma Reference Generation

`scripts/fetch-figma-references.js` downloads the full Figma page, crops each section to the browser-rendered height, and saves to `backstop_data/bitmaps_reference/`.

**Requires `FIGMA_TOKEN` in `.env`** — personal access token from Figma Settings → Security. Token expires periodically; when expired, use Figma MCP server tools instead.

### Current QA Scores (baseline after pixel-perfect rewrites)

| Section | Selector | Score | Status |
|---------|----------|-------|--------|
| 01_hero | `.hero` | 3.07% | ✅ Pass |
| 02_approach | `.section-approach` | 3.26% | ✅ Pass |
| 03_services | `.section-services` | 4.94% | ✅ Pass |
| 04_works | `.section-works` | 18.87% | ⚠️ Exempted |
| 05_impact | `.section-impact` | 4.52% | ✅ Pass |
| 06_contact | `.section-contact` | 3.30% | ✅ Pass |

**04_works is permanently exempted** — the reference image doesn't match the current implementation and is not a priority.

### Irreducible Rendering Floor

~3–4% mismatch is irreducible even with pixel-perfect positioning and identical fonts. This is caused by anti-aliasing and sub-pixel rendering differences between Figma's renderer and Chrome/Puppeteer. Do not chase scores below ~3%.

---

## CSS Architecture

**Pixel-perfect approach** — sections use `position: absolute` with exact pixel coordinates from Figma metadata, not responsive grid/flex layouts. This is intentional for desktop (1440px) fidelity.

**Responsive CSS** is handled via media queries that reflow to normal flow at ≤900px.

### Figma Section Coordinates (page node 30:4)

| Section | Figma Y | Figma Height |
|---------|---------|--------------|
| Hero | 0 | 980px |
| Approach | 980 | 967px |
| Services | 2081 | 595px |
| Works | 2816 | 1037px |
| Impact | 4013 | 990px |
| Contact | 5003 | 1037px |

### Key Design Decisions

- **Hero:** 3D image full-width; text overlay at `margin-top: -302px` to match Figma y=589. Backdrop blur `blur(5px)` on text frame. `padding-top: 17px` on `.hero-visual` to match Figma image starting at y=81 (not y=64 from nav).
- **Approach:** Black section, 6 cards in 3-column grid (407/406/407px), absolute-positioned stage labels and h3 titles within each card.
- **Services:** Full-width 1440px absolute layout. Left col at x=100, services list at x=676. PolySans Bulky 74px title `white-space: nowrap`.
- **Impact:** Contains a large sphere decorative image (`impact-sphere.png`) positioned with `::before` pseudo-element.

---

## i18n

Language switching via i18next (CDN). Locale files in `locales/en.json`, `locales/zh.json`, `locales/ja.json`.
All user-visible strings use `data-i18n` attributes. Default language enforced to English for QA via `backstop_data/engine_scripts/puppet/setLanguage.js`.

---

## Pixel-Perfect Implementation Strategy

When a section's mismatch is >5%, the correct approach is:

1. Use Figma MCP tool `get_design_context` (or `get_metadata`) to retrieve exact pixel coordinates for every element in the section.
2. Rewrite the section's CSS using `position: absolute` with those exact coordinates.
3. Do NOT attempt incremental CSS value tweaking — it has a structural ceiling of ~7% and cannot reach <5%.

This strategy reduced services from 9.71% → 4.94% and approach from ~12% → 3.26%.
