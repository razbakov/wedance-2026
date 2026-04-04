# Festival Theming Guide

**Date:** 2026-04-04
**Status:** Ready for engineering
**Purpose:** Document how a festival organizer's brand colors, logo, and imagery are applied to the WeDance schedule without code changes.

---

## 1. Approach: CSS Custom Properties

Festival theming uses CSS custom properties (CSS variables) that are set per-festival. The organizer provides their brand assets and preferences, and the Operations Manager or Engineer sets the corresponding variables in the festival's configuration.

This approach was chosen because:
- **Zero JavaScript required** -- theming is pure CSS, no runtime overhead.
- **SSR-compatible** -- variables can be inlined in the `<style>` tag during server-side rendering.
- **Easy to maintain** -- adding a new festival means adding a block of CSS variables, not forking the codebase.
- **Reversible** -- if a variable is not set, the default (WeDance coral) applies automatically via the `var()` fallback syntax.

---

## 2. Theming Variables

### Required from the organizer

| What | Format | Example |
|------|--------|---------|
| Festival name | Text | "Bavarian Bachata Congress" |
| City + dates | Text | "Munich, Oct 23-25" |
| Festival slug | URL-safe string | "bavarian-bachata-2026" |

### Optional from the organizer

| What | Format | CSS Variable | Fallback |
|------|--------|-------------|----------|
| Accent color | Hex color | `--festival-accent` | #E8453C (WeDance coral) |
| Accent hover | Hex color | `--festival-accent-hover` | #C23028 |
| Header background | Hex color | `--festival-header-bg` | #FFFFFF |
| Header text color | Hex color | `--festival-header-text` | #1A1A1A |
| Banner image | URL (JPEG/PNG/WebP) | `--festival-banner-url` | none |

### What is NOT customizable

The following are fixed across all festivals to maintain consistency, accessibility, and the WeDance identity:

- Dance style colors (Salsa red, Bachata purple, etc.) -- these are universal.
- Typography (system font stack, sizes, weights) -- accessibility and performance.
- Spacing scale -- layout consistency.
- Card design and layout -- the core UX pattern.
- "Powered by WeDance" footer -- always present, always in WeDance coral.
- Page background color (#F7F7F8) -- ensures card readability.

---

## 3. Implementation

### CSS Structure

```css
/* === Default theme (WeDance) === */
:root {
  /* Festival-overridable tokens */
  --festival-accent: #E8453C;
  --festival-accent-hover: #C23028;
  --festival-header-bg: #FFFFFF;
  --festival-header-text: #1A1A1A;
  --festival-banner-url: none;

  /* Core tokens (not overridable by festivals) */
  --color-brand-primary: #E8453C;
  --color-bg: #FFFFFF;
  --color-bg-page: #F7F7F8;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #4A4A4A;
  --color-text-tertiary: #7A7A7A;
  --color-text-inverse: #FFFFFF;
  --color-border: #E2E2E4;
  --color-interactive: var(--festival-accent);
  --color-interactive-hover: var(--festival-accent-hover);
  /* ... (remaining core tokens) */
}
```

### Per-festival override

Each festival gets a scoped CSS block. This can be:
1. **Inline in the HTML** (simplest for SSR)
2. **A separate CSS file** loaded per festival
3. **Injected from the festival's JSON config** during build/render

**Option 1: Inline style tag (recommended for MVP)**

```html
<style>
  :root {
    --festival-accent: #8B1A8B;          /* Purple for a bachata festival */
    --festival-accent-hover: #6D146D;
    --festival-header-bg: #1A0A2E;       /* Dark purple header */
    --festival-header-text: #FFFFFF;      /* White text on dark bg */
  }
</style>
```

**Option 2: From festival JSON config**

```json
{
  "slug": "bavarian-bachata-2026",
  "name": "Bavarian Bachata Congress",
  "city": "Munich",
  "dates": "Oct 23-25, 2026",
  "theme": {
    "accent": "#8B1A8B",
    "accentHover": "#6D146D",
    "headerBg": "#1A0A2E",
    "headerText": "#FFFFFF",
    "bannerUrl": "/images/festivals/bavarian-bachata-banner.jpg"
  }
}
```

The build/render step converts `theme` into CSS custom properties.

---

## 4. Where Festival Branding Appears

### Festival-branded areas (customized per festival)

| Area | What changes | Variable(s) |
|------|-------------|-------------|
| Day tabs (active state) | Background color | `--festival-accent` |
| Top bar background | Background color | `--festival-header-bg` |
| Top bar text | Text color | `--festival-header-text` |
| Banner image | Displayed above top bar | `--festival-banner-url` |
| Share button hover | Tint color | Uses `--festival-accent` at 10% opacity |

### WeDance-branded areas (fixed, not customizable)

| Area | What shows | Purpose |
|------|-----------|---------|
| Footer | "Powered by WeDance" in coral | Attribution |
| Style chips (active) | Dance style colors | Universal dance style identity |
| Workshop cards | Style-colored left border | Visual scanning |
| Share button text | WeDance coral | Consistent interaction color |
| Error/empty state CTA | WeDance coral button | Consistent interaction color |

### Neutral areas (unbranded)

| Area | Color | Notes |
|------|-------|-------|
| Page background | #F7F7F8 | Always light gray |
| Card backgrounds | #FFFFFF | Always white |
| Text | #1A1A1A / #4A4A4A / #7A7A7A | Fixed for contrast |

---

## 5. Contrast Safety

When organizers provide custom colors, the system must verify contrast:

### Automated checks (build-time or config-time)

| Check | Requirement | Fallback |
|-------|------------|----------|
| `--festival-accent` on white | >= 4.5:1 (AA) | Warn and suggest darker shade |
| White text on `--festival-accent` | >= 4.5:1 (AA) | Warn and suggest lighter text or darker accent |
| `--festival-header-text` on `--festival-header-bg` | >= 4.5:1 (AA) | Warn and suggest adjustment |

### Manual review

For the MVP pilot (Bavarian Bachata Congress), the Operations Manager or Designer will manually verify that the organizer's chosen colors meet contrast requirements. An automated contrast checker can be built later.

---

## 6. Banner Image Guidelines

When a festival provides a banner image:

| Property | Recommendation |
|----------|---------------|
| Aspect ratio | 16:5 (wide banner) or 3:1 |
| Minimum width | 856px (2x for retina on 428px viewport) |
| Maximum file size | 100KB (JPEG quality 80, WebP preferred) |
| Content | Festival logo, key artists, event name |
| Safe zone | Keep text/logos in the center 60% (edges may be cropped on narrow screens) |
| Loading | `loading="lazy"`, solid color placeholder matching `--festival-header-bg` |

If no banner is provided, the banner section is omitted entirely. There is no empty placeholder or default image.

---

## 7. Example: Bavarian Bachata Congress (Pilot)

Here is how the pilot festival would be themed. These are hypothetical values pending Anna Milite's brand assets.

```css
:root {
  --festival-accent: #7C3AED;          /* Bachata purple */
  --festival-accent-hover: #6D28D9;
  --festival-header-bg: #FFFFFF;       /* White header (clean) */
  --festival-header-text: #1A1A1A;     /* Dark text */
}
```

```json
{
  "slug": "bavarian-bachata-2026",
  "name": "Bavarian Bachata Congress",
  "city": "Munich",
  "dates": "Oct 23-25, 2026",
  "theme": {
    "accent": "#7C3AED",
    "accentHover": "#6D28D9",
    "headerBg": "#FFFFFF",
    "headerText": "#1A1A1A",
    "bannerUrl": null
  }
}
```

The result: day tabs glow purple when active, matching the bachata identity. Everything else stays consistent.

---

## 8. Example: Rovinj Summer Bachata Festival (B2C Test)

The Rovinj test (June 2026) is a B2C test where we do not need organizer permission. We use their publicly available branding.

```css
:root {
  --festival-accent: #0891B2;          /* Teal -- beach/summer vibe */
  --festival-accent-hover: #0E7490;
  --festival-header-bg: #FFFFFF;
  --festival-header-text: #1A1A1A;
}
```

---

## 9. Future Considerations

These are NOT in MVP scope but the architecture supports them:

1. **Dark festival themes** -- Some festivals may want a dark header (`--festival-header-bg: #1A0A2E`). The current system supports this since header text color is also customizable.
2. **Festival favicon** -- Could add `--festival-favicon-url` for browser tab branding.
3. **Social card generation** -- Use `--festival-accent` as the background color for auto-generated OG images.
4. **Theme editor UI** -- A simple admin screen where organizers pick their accent color from a palette and upload their banner. This would generate the JSON config automatically.
5. **Multiple accent colors** -- Some festivals may want a gradient or secondary accent. The variable system can be extended without breaking existing themes.
