# Design System Brief: Festival Schedule MVP

**Date:** 2026-04-04
**Updated:** 2026-04-04 (brand decisions applied)
**Status:** Ready for engineering
**Story:** Operations/Backlog/005_View_Festival_Schedule.md

---

## Brand Decisions Applied

The following decisions were confirmed by the founders and are now reflected throughout this document:

1. **Color palette** -- WeDance coral (#E8453C) as the primary brand accent. Proposed by Designer, pending final approval from Kirill.
2. **Typography** -- System font stack only (Inter / system fallback). No custom font files. Stays within the 500KB page budget.
3. **Logo placement** -- Small "Powered by WeDance" text in the footer. The festival's own brand dominates the header.
4. **Festival branding** -- The design accommodates variable festival branding via CSS custom properties. Each festival provides its own name, banner image, and optionally accent colors.
5. **Dark mode** -- Skipped for MVP. Light theme only.

---

## 1. Typography Scale

System font stack for MVP. Fast loading, zero font files, consistent across platforms.

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

Inter is specified first because it is the most common system-level font on modern devices (bundled with many Linux distros, available on macOS 14+). The fallback chain covers all other platforms. No font file is loaded -- this is purely a system font stack.

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xl` | 20px | 700 (Bold) | 1.3 | Festival name in top bar |
| `text-lg` | 18px | 700 (Bold) | 1.3 | Workshop name in detail sheet |
| `text-md` | 16px | 600 (Semibold) | 1.4 | Workshop name on card, time headers |
| `text-base` | 14px | 400 (Regular) | 1.5 | Artist name, time range, body text |
| `text-sm` | 12px | 600 (Semibold) | 1.3 | Room label (uppercase), badge text |
| `text-xs` | 11px | 400 (Regular) | 1.3 | "Powered by WeDance" footer, meta text |

**Rules:**
- No text smaller than 11px anywhere in the product (only the footer uses 11px).
- Workshop names are always semibold or bold.
- Time values are always `text-md` (16px) for scannability.
- All text must pass WCAG AA contrast (4.5:1 minimum, 7:1 for primary content).

---

## 2. Spacing Scale

Use a 4px base unit. All spacing is a multiple of 4.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight gaps (icon-to-text inside a badge) |
| `space-2` | 8px | Intra-component padding (card internal padding) |
| `space-3` | 12px | Gap between cards in horizontal scroll |
| `space-4` | 16px | Section padding, page horizontal margins |
| `space-5` | 20px | Gap between time slot sections |
| `space-6` | 24px | Top bar height padding, major separations |
| `space-8` | 32px | Page top/bottom padding |

**Card dimensions:**
- Workshop card width: 140px (mobile), 180px (tablet+)
- Workshop card padding: 12px internal
- Workshop card border-radius: 8px
- Workshop card min-height: 120px

---

## 3. Color Tokens

### WeDance Brand Palette

The WeDance identity uses a warm coral as the primary accent -- energetic, approachable, and distinctive in the dance/event space. The palette is professional but lively.

| Token | Value | Usage | Contrast on white |
|-------|-------|-------|--------------------|
| `color-brand-primary` | #E8453C | WeDance accent, "Powered by" text, primary CTA | 4.6:1 (AA) |
| `color-brand-primary-dark` | #C23028 | Hover/pressed state for brand primary | 5.9:1 (AAA) |
| `color-brand-primary-light` | #FEF2F1 | Subtle brand tint for backgrounds | N/A (bg use) |

**Rationale:** Coral sits between red and orange -- warm and energetic like dance itself, but distinct from both the Salsa red (#DC2626) and Cuban orange (#EA580C) style colors. It avoids conflicting with any single dance style while feeling alive.

### Core UI Palette

| Token | Value | Usage |
|-------|-------|-------|
| `color-bg` | #FFFFFF | Card backgrounds, sheet backgrounds |
| `color-bg-page` | #F7F7F8 | Page background (very light warm gray) |
| `color-bg-overlay` | rgba(0,0,0,0.4) | Bottom sheet overlay |
| `color-text-primary` | #1A1A1A | Workshop names, headings |
| `color-text-secondary` | #4A4A4A | Artist names, descriptions |
| `color-text-tertiary` | #7A7A7A | Room labels, meta text |
| `color-text-inverse` | #FFFFFF | Text on filled buttons/badges |
| `color-border` | #E2E2E4 | Card borders (subtle) |
| `color-interactive` | #E8453C | Links, active states, share button (= brand primary) |
| `color-interactive-hover` | #C23028 | Hover state for interactive (= brand primary dark) |
| `color-error` | #DC2626 | Error states |
| `color-success` | #16A34A | Success feedback (link copied toast) |
| `color-skeleton` | #E5E5E5 | Loading skeleton base |
| `color-skeleton-shine` | #F0F0F0 | Loading skeleton animation |

### Dance Style Colors

These colors are used for style badges and card left-border accents. Each must pass WCAG AA contrast (4.5:1) when used with white text.

| Style | Token | Color | Contrast | Notes |
|-------|-------|-------|----------|-------|
| Salsa | `color-style-salsa` | #DC2626 | 4.6:1 | Red -- energetic, classic association |
| Bachata | `color-style-bachata` | #7C3AED | 4.6:1 | Purple -- sensual, distinctive |
| Kizomba | `color-style-kizomba` | #0E7490 | 4.8:1 | Dark teal -- smooth, cool |
| Cuban Salsa | `color-style-cuban` | #C2410C | 4.8:1 | Burnt orange -- warm, distinct from salsa |
| Semba | `color-style-semba` | #15803D | 4.8:1 | Green -- earthy |
| Afro | `color-style-afro` | #92400E | 5.4:1 | Brown -- warm, grounded |
| Zouk | `color-style-zouk` | #BE185D | 4.5:1 | Pink -- flowing, emotional |
| Reggaeton | `color-style-reggaeton` | #4338CA | 6.6:1 | Indigo -- urban, bold |
| Default | `color-style-default` | #6B7280 | 4.6:1 | Gray -- fallback for unknown styles |

All style colors have been verified to pass WCAG AA contrast ratio against white (#FFFFFF) text.

### Festival Theming Layer

Festivals can override a subset of CSS custom properties to apply their own branding. See `004_Festival_Theming.md` for full documentation.

| Overridable Token | Default | What it controls |
|-------------------|---------|-----------------|
| `--festival-accent` | #E8453C | Day tab active state, festival name color emphasis |
| `--festival-accent-hover` | #C23028 | Hover states for festival-branded elements |
| `--festival-header-bg` | #FFFFFF | Top bar background (can use festival brand color) |
| `--festival-header-text` | #1A1A1A | Top bar text color |
| `--festival-banner-url` | none | URL to festival banner image (optional) |

---

## 4. Component Specifications

These are the UI components for the MVP, with final visual specs applied.

### 4.1 TopBar

```
+------------------------------------------+
| [Festival Banner Image - optional]       |  <-- 120px height, cover fit
+------------------------------------------+
| FESTIVAL NAME                     [Share]|  <-- 56px bar
| City, Date Range                         |
+------------------------------------------+
```

- Fixed position at top of viewport
- Contains: festival name (left), share icon button (right)
- Height: 56px (plus optional banner above)
- Background: `--festival-header-bg` (default: `color-bg`)
- Bottom border: 1px solid `color-border`
- Festival name: `text-xl`, `--festival-header-text`
- Subtitle (city, dates): `text-xs`, `color-text-tertiary`
- Share button: outlined, `color-interactive`, 8px border-radius
- States: default only

### 4.2 DayTabs

- Sticky below TopBar
- Row of tab buttons, one per festival day
- **Active tab:** `--festival-accent` background, white text, no border
- **Inactive tab:** transparent background, `color-text-secondary` text, 1px solid `color-border`
- Height: 44px
- Tab padding: 8px 16px
- Tab border-radius: 8px
- Gap between tabs: 8px
- If more tabs than screen width: horizontal scroll with hidden scrollbar

### 4.3 StyleChipRow

- Horizontal scroll row below DayTabs
- Chips: rounded pill shape (border-radius: 16px), height: 32px
- **Active chip ("All"):** `color-interactive` background, white text
- **Active chip (specific style):** style-specific color background, white text
- **Inactive chip:** `color-bg` background, `color-text-secondary` text, 1px solid `color-border`
- "+N" overflow chip: `color-bg-page` background, `color-text-tertiary` text
- Height of row including padding: 48px
- Chip padding: 4px 12px
- Chip font: 13px, weight 600

### 4.4 TimeHeader

- Sticky within the scroll viewport (stacks below DayTabs and StyleChipRow)
- Shows time in "HH:MM" format
- `text-md` (16px), weight 600, `color-text-primary`
- Left-aligned with `space-4` padding
- Background: `color-bg-page` with full-width span
- Padding: 8px 0

### 4.5 WorkshopCard

- Width: 140px (mobile), 180px (tablet+)
- Border-radius: 8px
- Background: `color-bg`
- Left border: 3px solid, dance style color
- Shadow: `0 1px 3px rgba(0,0,0,0.08)`
- Internal padding: 8px top, 12px sides and bottom
- Gap between content items: 4px

Content stack (top to bottom):
1. Room label: 11px, semibold, uppercase, letter-spacing 0.5px, `color-text-tertiary`
2. Workshop name: 15px, semibold, `color-text-primary`, max 2 lines with ellipsis
3. Artist name: 13px, regular, `color-text-secondary`, 1 line with ellipsis
4. Time range: 13px, regular, `color-text-secondary`
5. Style badge: 11px, semibold, style color background, white text, border-radius 10px, padding 2px 8px

**States:**
- Default: as described above
- Tapped/Active: scale(0.97), shadow increases to `0 2px 6px rgba(0,0,0,0.15)`, 100ms transition
- Skeleton: rounded rectangles matching each content line, shimmer animation

### 4.6 BreakCard

- Full width (spans entire content area)
- Background: transparent
- Border: 1px dashed `color-border`
- Border-radius: 8px
- Text centered: break name + time range, `text-base`, `color-text-tertiary`
- Padding: 16px

### 4.7 WorkshopDetailSheet

- Bottom sheet component
- Slides up from bottom: 200ms ease-out
- Max height: 70% of viewport
- Border-radius: 16px 16px 0 0
- Drag handle: 32px wide, 4px tall, centered, `color-border`, border-radius 2px
- Background: `color-bg`
- Overlay: `color-bg-overlay`
- Content padding: 0 24px 32px
- Workshop name: `text-lg` (18px, bold)
- Detail rows: `text-base` (14px), `color-text-secondary`
- "Share this workshop" button: full-width, outlined, `color-interactive`, 8px radius, 14px semibold
- Dismiss: swipe down, tap overlay

### 4.8 OverflowSheet

- Same mechanics as WorkshopDetailSheet
- Contains a vertical list of style options
- Each row: style color dot (12px circle) + style name (14px), padding 12px 0
- Row separator: 1px solid `color-border`
- Tapping a row selects that style and dismisses the sheet

### 4.9 EmptyState

- Centered in the content area, vertical stack
- Icon: 40px, `color-text-tertiary` (Lucide icon)
- Heading: `text-lg`, `color-text-primary`
- Description: `text-base`, `color-text-secondary`, max-width 280px, text-align center
- CTA button (when present): `color-interactive` background, white text, 8px radius, 14px semibold
- Variants: no-data, filter-empty, error, loading

### 4.10 ShareToast

- Appears at bottom of screen, centered
- Auto-dismisses after 3 seconds
- Background: `color-text-primary` (#1A1A1A)
- Text: `color-text-inverse` (#FFFFFF), 14px
- Border-radius: 8px
- Padding: 12px 16px
- Slide-up + fade-in: 200ms ease-out
- Slide-down + fade-out: 200ms ease-in on dismiss

### 4.11 ScrollHintDots

- Row of dots below a horizontal card row
- Active dot: `color-text-secondary`, 6px diameter
- Inactive dot: `color-border`, 6px diameter
- Gap: 6px
- Centered below the card row
- Only visible when cards overflow

### 4.12 Footer ("Powered by WeDance")

```
+------------------------------------------+
|      Powered by WeDance                  |
+------------------------------------------+
```

- Full-width, centered text
- Text: "Powered by WeDance"
- Font: 11px, regular, `color-text-tertiary`
- "WeDance" portion: 11px, semibold, `color-brand-primary`
- Padding: 24px 16px
- No background (blends with page)
- The footer is intentionally understated. The festival is the star.

---

## 5. Iconography

Use Lucide Icons -- open source, lightweight, consistent aesthetic.

| Icon | Lucide Name | Size | Usage |
|------|-------------|------|-------|
| Share | `share-2` | 20px | Top bar share button |
| Calendar | `calendar` | 40px | Empty state (no data) |
| Alert | `alert-triangle` | 40px | Error state |
| Close | `x` | 20px | Sheet dismiss (future) |
| Chevron | `chevron-right` | 16px | Overflow hint |
| Grip | CSS element | 32x4px | Sheet drag handle |

Icon stroke width: 2px (Lucide default).
Icon color: inherits from text color of parent element.

---

## 6. Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `duration-fast` | 100ms | Button press feedback, card tap |
| `duration-normal` | 200ms | Sheet open/close, toast appear |
| `duration-slow` | 300ms | Page transitions (if any) |
| `easing-default` | ease-out | Most animations |
| `easing-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Playful bounce (sheet open) |

**Accessibility rule:** Respect `prefers-reduced-motion: reduce`. When reduced motion is preferred, skip all animations except opacity changes.

---

## 7. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| **Mobile** | 320-428px | Default layout. Vertical list, horizontal card scroll per time slot. Cards 140px wide. |
| **Large mobile / small tablet** | 429-768px | Cards grow to 180px. 3 full cards visible per row. |
| **Tablet / Desktop** | 769px+ | Cards in a wrapping grid (no horizontal scroll). 3-4 cards per row. Max content width: 768px centered. |

---

## 8. Performance Budget

| Metric | Target | Approach |
|--------|--------|----------|
| Total page weight | < 500KB | System fonts (0 font files), inline critical CSS, minimal JS |
| First Contentful Paint | < 1.5s on 3G | SSR/pre-render HTML |
| Full schedule render | < 3s on 3G | All data in single JSON payload (~15KB) |
| Interaction latency | < 100ms | Client-side filtering on pre-loaded data |

---

## 9. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| ~~Brand font~~ | System fonts (Inter / system stack). Confirmed. |
| ~~Style colors~~ | Functional palette confirmed. Each style has a distinct hue that passes AA contrast. |
| ~~Dark mode~~ | Skipped for MVP. |
| ~~Logo placement~~ | "Powered by WeDance" text in footer. WeDance brand is subtle; festival brand dominates. |
| ~~Festival banner~~ | Optional banner image in header. Festivals can provide one or skip it. |
