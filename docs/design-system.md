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
| `--destructive` | red-600 | Error states, validation |
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

## Font Families

| Token | Tailwind class | Stack | Usage |
|---|---|---|---|
| `--font-display` | `font-display` | Playfair Display, serif | Headings, brand text |
| `--font-sans` | `font-sans` | system-ui, sans-serif | Body text, UI, forms |
| `--font-accent` | `font-accent` | Caveat, cursive | Handwritten highlights |
| `--font-marker` | `font-marker` | Permanent Marker, cursive | Playful emphasis |
| `--font-impact` | `font-impact` | Anton, sans-serif | Bold impact headers |
| `--font-serif-alt` | `font-serif-alt` | DM Serif Display, serif | Alt serif display |

**Proposed consolidation (Commander decision pending):** keep `font-display` (Playfair) + `font-sans` (system-ui) as the core pair. The other four families are used sparingly (Caveat 53x, Permanent Marker 25x, Anton 15x, DM Serif Display 12x) and could be reduced in follow-up work.

## Rules

1. **No new inline hex.** Use a token or Tailwind class. If none fits, propose a new token in a PR.
2. **Semantic first.** Reach for `text-foreground`, `bg-primary`, `text-muted-foreground` before `text-wd-brown-900`.
3. **Brand primitives for one-offs.** Gradient CTAs, specific decorative elements — use `--wd-*` tokens directly.
4. **Font classes, not inline font-family.** Use `font-display`, `font-sans`, `font-accent`, etc.
5. **Dark mode coherent.** Every new component must look correct in `.dark` — the token layer handles the swap.

## Font loading

Pages that use the V3 tropical aesthetic load Google Fonts via `useHead()`:

```ts
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})
```

Pages using `layout: 'default'` (the shadcn admin layout) rely on system fonts only.

## Inline style inventory

As of this PR, **80 `.vue` files** still contain inline `style=""` hex values (~2,500 occurrences across 87 distinct colours). This PR migrated:

- `SiteHeader.vue` — fully tokenised
- `SiteFooter.vue` — fully tokenised
- `SignUpModal.vue` — fully tokenised
- `ReportProblem.vue` — fully tokenised
- `FieldError.vue` — fully tokenised

Page-by-page migration is planned in follow-up batches of ~10 files each.
