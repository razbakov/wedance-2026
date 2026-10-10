# WeDance Design System

Design tokens, font families, and component conventions for the 2026 tropical aesthetic.

Live reference: [`/styleguide`](/styleguide) (noindex, internal only).

## Tokens

All tokens are defined in `app/assets/css/tailwind.css`. They fall into three layers:

### 1. Brand primitives (`--wd-*`)

Raw palette values. Use these only when a semantic token doesn't fit.

| Token | Hex | Tailwind class | Role |
|---|---|---|---|
| `--wd-cream` | `#fbf5ea` | `bg-wd-cream` | Warm background |
| `--wd-brown-900` | `#3b1f0d` | `text-wd-brown-900` | Deepest brown (headings) |
| `--wd-brown-700` | `#5b3a1d` | `text-wd-brown-700` | Body text brown |
| `--wd-amber-600` | `#9a5614` | `text-wd-amber-600` | Accent / section labels |
| `--wd-red-600` | `#dc2626` | `bg-wd-red-600` | Primary CTA red |
| `--wd-red-800` | `#b91c1c` | `bg-wd-red-800` | Button shadow |
| `--wd-orange-500` | `#f97316` | `bg-wd-orange-500` | Gradient accent |
| `--wd-green-600` | `#16a34a` | `bg-wd-green-600` | Success green |
| `--wd-cyan-600` | `#0891b2` | `bg-wd-cyan-600` | Info cyan |
| `--wd-amber-500` | `#f59e0b` | `bg-wd-amber-500` | Warning amber |

### 2. Semantic tokens (shadcn mapping)

These drive all shared UI components (`app/components/ui/*`). Prefer these over primitives.

| Token | Light value | Usage |
|---|---|---|
| `--background` | cream | Page background |
| `--foreground` | brown-900 | Default text |
| `--primary` | red-600 | CTAs, links, active states |
| `--primary-foreground` | white | Text on primary backgrounds |
| `--secondary` | amber-600 | Section labels, captions |
| `--secondary-foreground` | cream | Text on secondary backgrounds |
| `--muted` | cream/brown mix | Subtle backgrounds |
| `--muted-foreground` | brown-700 | Body text, descriptions |
| `--accent` | amber tint | Hover/highlight backgrounds |
| `--accent-foreground` | amber-600 | Text on accent backgrounds |
| `--destructive` | red-600 | Error states, validation, destructive buttons/badges |
| `--destructive-foreground` | white | Text on destructive backgrounds (use `text-destructive` for red text on light) |
| `--card` | white | Card surfaces |
| `--border` | brown-900 @ 13% | Borders, dividers |
| `--input` | brown-900 @ 20% | Input borders |
| `--ring` | amber-600 | Focus rings |

### 3. Status colours

| Token | Hex | Usage |
|---|---|---|
| `--success` | `#16a34a` | Success messages, confirmations |
| `--info` | `#0891b2` | Informational highlights |
| `--warning` | `#f59e0b` | Warnings, caution states |

### 4. Extended palette

Accents and tints pages use beyond the core brand (purple, pink, violet, sky, rose, sand, extra amber/red/green/cyan steps …). Full list with swatches on `/styleguide`; definitions in `tailwind.css` under "Extended palette". Same naming: `var(--wd-purple-500)`, `bg-wd-purple-500`.

### 5. JS mirror — `app/lib/brand.ts`

`WD` exports every `--wd-*` hex for places where the colour is computed in JS — accent rotations (`[WD.red600, WD.cyan600][i]`) and alpha suffixes (`accent + '55'`), which a CSS variable can't take. `app/lib/brand.test.ts` fails if `WD` and `tailwind.css` drift apart.

Rule of thumb: **CSS context → `var(--wd-*)`; JS value → `WD.*`.**

Alpha tints in CSS: `color-mix(in srgb, var(--wd-red-600) 13%, transparent)` (not `#dc262622`).

## Font Families

Consolidated 2026-10-10 to one pair. Caveat, Permanent Marker, Anton and DM Serif Display are retired.

| Token | Tailwind class | Inline CSS | Stack | Usage |
|---|---|---|---|---|
| `--wd-font-display` | `font-display` | `font-family:var(--wd-font-display)` | Playfair Display, serif | Headings, brand text |
| `--wd-font-display` + italic | `font-display italic` | `…;font-style:italic` | Playfair Display italic | Handwritten-feel highlights (the old Caveat slot) |
| `--wd-font-sans` | `font-sans` | `font-family:var(--wd-font-sans)` | system-ui, sans-serif | Body text, UI, forms |

## Rules

1. **No new inline hex.** Use a token or Tailwind class. If none fits, propose a new token in a PR.
2. **Semantic first.** Reach for `text-foreground`, `bg-primary`, `text-muted-foreground` before `text-wd-brown-900`.
3. **Brand primitives for one-offs.** Gradient CTAs, specific decorative elements — use `--wd-*` tokens directly.
4. **Font classes, not inline font-family.** Use `font-display`, `font-sans`, `font-accent`, etc.
5. **Dark mode coherent.** Every new component must look correct in `.dark` — the token layer handles the swap.

## Font loading

Pages using the tropical aesthetic load Playfair Display (incl. italic) via `useHead()`:

```ts
{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' }
```

Never add another Google Font without a design-system PR.

## Inline style inventory

Phase 2 (2026-10-10) migrated all product pages and components (sketches excluded):

- ~2,050 inline CSS hex values → `var(--wd-*)` / `color-mix(...)`
- ~410 JS hex literals → `WD.*`
- ~660 inline `font-family` declarations → font tokens
- Verified by full-page pixel diff of 24 routes: identical except intended font changes.

What still holds a literal hex (by design or below the token threshold):

- `app/pages/sketches/**` — frozen design explorations, not product.
- `app/data/mock-*.ts` — festival accent colours are content, not design.
- ~30 one-off colours used ≤3 times (e.g. `#166534`, `#f5f0e8`, `#1f0f06`). Promote to a token the second time someone needs one.
- `rgba(...)` shadows — left as-is.
