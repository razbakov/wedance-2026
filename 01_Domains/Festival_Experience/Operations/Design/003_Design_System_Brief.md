# Design System Brief: Festival Schedule MVP

**Date:** 2026-04-04
**Status:** Draft for Kirill's review
**Purpose:** Establish minimal design tokens and component patterns for the Festival Schedule MVP. This is intentionally small -- just enough to build consistently, not a full design system.

---

## 1. Typography Scale

Use a system font stack for MVP (fast loading, no font files to download over 3G).

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xl` | 20px | 700 (Bold) | 1.3 | Festival name in top bar |
| `text-lg` | 18px | 700 (Bold) | 1.3 | Workshop name in detail sheet |
| `text-md` | 16px | 600 (Semibold) | 1.4 | Workshop name on card, time headers |
| `text-base` | 14px | 400 (Regular) | 1.5 | Artist name, time range, body text |
| `text-sm` | 12px | 600 (Semibold) | 1.3 | Room label (uppercase), badge text |
| `text-xs` | 11px | 400 (Regular) | 1.3 | Footer, meta text |

**Rules:**
- No text smaller than 12px anywhere in the product.
- Workshop names are always semibold or bold.
- Time values are always `text-md` (16px) for scannability.

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

### Core Palette

| Token | Value | Usage |
|-------|-------|-------|
| `color-bg` | #FFFFFF | Card backgrounds, sheet backgrounds |
| `color-bg-page` | #F5F5F5 | Page background (light gray) |
| `color-bg-overlay` | rgba(0,0,0,0.4) | Bottom sheet overlay |
| `color-text-primary` | #1A1A1A | Workshop names, headings |
| `color-text-secondary` | #4A4A4A | Artist names, descriptions |
| `color-text-tertiary` | #7A7A7A | Room labels, meta text |
| `color-text-inverse` | #FFFFFF | Text on filled buttons/badges |
| `color-border` | #E0E0E0 | Card borders (subtle) |
| `color-interactive` | #2563EB | Links, active states, share button |
| `color-interactive-hover` | #1D4ED8 | Hover state for interactive |
| `color-error` | #DC2626 | Error states |
| `color-skeleton` | #E5E5E5 | Loading skeleton base |
| `color-skeleton-shine` | #F0F0F0 | Loading skeleton animation |

### Dance Style Colors

These colors are used for style badges and card left-border accents. Each must pass WCAG AA contrast (4.5:1) when used with white text.

| Style | Token | Color | Notes |
|-------|-------|-------|-------|
| Salsa | `color-style-salsa` | #DC2626 | Red -- energetic, classic association |
| Bachata | `color-style-bachata` | #7C3AED | Purple -- sensual, distinctive |
| Kizomba | `color-style-kizomba` | #0891B2 | Teal -- smooth, cool |
| Cuban Salsa | `color-style-cuban` | #EA580C | Orange -- warm, distinct from salsa |
| Semba | `color-style-semba` | #15803D | Green -- earthy |
| Afro | `color-style-afro` | #B45309 | Amber -- warm, grounded |
| Zouk | `color-style-zouk` | #BE185D | Pink -- flowing, emotional |
| Reggaeton | `color-style-reggaeton` | #4338CA | Indigo -- urban, bold |
| Default | `color-style-default` | #6B7280 | Gray -- fallback for unknown styles |

**Note for Kirill:** These are functional placeholder colors chosen for contrast and distinctiveness. The human designer should refine them to match WeDance brand aesthetics. The key constraint is: each style must be visually distinct at a glance, and all must pass AA contrast with white text.

---

## 4. Component List

These are the UI components needed for the MVP. Each is described with its variants and states.

### 4.1 TopBar
- Fixed position at top of viewport.
- Contains: festival name (left), share icon button (right).
- Height: 56px.
- Background: `color-bg` with subtle bottom border.
- States: default only.

### 4.2 DayTabs
- Sticky below TopBar.
- Row of tab buttons, one per festival day.
- Active tab: `color-interactive` background, white text.
- Inactive tab: transparent background, `color-text-secondary` text, border.
- Height: 44px.
- If more tabs than screen width: horizontal scroll with fade indicator on edges.

### 4.3 StyleChipRow
- Horizontal scroll row below DayTabs.
- Chips: rounded pill shape (border-radius: 16px), height 32px.
- Active chip: style-specific color background, white text.
- Inactive chip: `color-bg` background, `color-text-secondary` text, 1px border.
- "All" chip: when active, uses `color-interactive`.
- "+N" overflow chip: `color-bg-page` background, `color-text-tertiary` text.
- Height of row including padding: 48px.

### 4.4 TimeHeader
- Sticky within the scroll viewport (stacks below DayTabs and StyleChipRow).
- Shows time in "HH:MM" format.
- `text-md`, `color-text-primary`.
- Left-aligned with `space-4` padding.
- Background: `color-bg-page` (so it visually separates from cards above).

### 4.5 WorkshopCard
- Width: 140px (mobile), 180px (tablet+).
- Border-radius: 8px.
- Background: `color-bg`.
- Left border: 3px solid, style color.
- Shadow: 0 1px 3px rgba(0,0,0,0.1) (subtle elevation).
- Internal padding: `space-2` (8px) top, `space-3` (12px) sides and bottom.
- Content stack (top to bottom):
  1. Room label: `text-sm`, uppercase, `color-text-tertiary`
  2. Workshop name: `text-md`, `color-text-primary` (max 2 lines, truncate with ellipsis)
  3. Artist name: `text-base`, `color-text-secondary` (max 1 line, truncate)
  4. Time range: `text-base`, `color-text-secondary`
  5. Style badge: `text-sm`, style color background, white text, border-radius 10px, padding 2px 8px
- States: Default, Tapped (scale 0.97 + shadow increase, 100ms), Skeleton.
- Skeleton state: rounded rectangles matching each content line, subtle shimmer animation.

### 4.6 BreakCard
- Full width (spans entire content area).
- Background: `color-bg-page` (blends with page, less prominent than workshop cards).
- Border: 1px dashed `color-border`.
- Border-radius: 8px.
- Text centered: break name + time range, `text-base`, `color-text-tertiary`.

### 4.7 WorkshopDetailSheet
- Bottom sheet component.
- Slides up from bottom, 200ms ease-out.
- Max height: 70% of viewport.
- Border-radius: 16px 16px 0 0 (top corners only).
- Drag handle: 32px wide, 4px tall, centered, `color-border`.
- Background: `color-bg`.
- Overlay behind: `color-bg-overlay`.
- Content: full workshop details (see wireframe Screen 3).
- Dismiss: swipe down, tap overlay, or tap X button (top right).

### 4.8 OverflowSheet
- Same mechanics as WorkshopDetailSheet.
- Contains a list of additional style chips in a vertical layout.
- Each row: style color dot (12px) + style name.
- Tapping a row selects that style and dismisses the sheet.

### 4.9 EmptyState
- Centered in the content area.
- Icon (40px), heading (`text-lg`), description (`text-base`, `color-text-secondary`).
- Optional CTA button.
- Variants: no-data, filter-empty, error, loading.

### 4.10 ShareToast
- Appears at bottom of screen, above any bottom sheet.
- Auto-dismisses after 3 seconds.
- Background: `color-text-primary` (dark), text: `color-text-inverse` (white).
- Border-radius: 8px.
- Padding: `space-3` vertical, `space-4` horizontal.
- Slide-up + fade-in animation, 200ms.

### 4.11 ScrollHintDots
- Row of dots below a horizontal card row.
- Active dot: `color-text-secondary`, 6px.
- Inactive dot: `color-border`, 6px.
- Centered below the card row.
- Only visible when cards overflow (more than fit on screen).

---

## 5. Iconography

Use a minimal icon set. For MVP, only these icons are needed:

| Icon | Usage | Source |
|------|-------|--------|
| Share / Export | Top bar share button | System icon or Lucide `share-2` |
| Calendar | Empty state (no data) | Lucide `calendar` |
| Alert Triangle | Error state | Lucide `alert-triangle` |
| Chevron Right | Overflow hint | Lucide `chevron-right` |
| X / Close | Sheet dismiss | Lucide `x` |
| Grip | Sheet drag handle | CSS element (no icon needed) |

Recommendation: Use [Lucide Icons](https://lucide.dev/) -- open source, lightweight, consistent with a clean modern aesthetic.

---

## 6. Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `duration-fast` | 100ms | Button press feedback, card tap |
| `duration-normal` | 200ms | Sheet open/close, toast appear |
| `duration-slow` | 300ms | Page transitions (if any) |
| `easing-default` | ease-out | Most animations |
| `easing-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Playful bounce (sheet open) |

**Rule:** Prefer `prefers-reduced-motion: reduce` media query. When reduced motion is preferred, skip all animations except opacity changes.

---

## 7. Escalation Notes for Kirill

This design system brief is intentionally minimal and functional. The following decisions require Kirill's input or the human designer's refinement:

1. **Brand font** -- System fonts are recommended for MVP performance. If WeDance has a brand font (or wants to establish one), it should be applied after MVP validation.
2. **Style colors** -- The palette above is functional. The human designer should refine it to feel cohesive and on-brand.
3. **Illustration style** -- Empty states currently use Lucide icons. If WeDance has a custom illustration style, those should replace the icons.
4. **Dark mode** -- Tokens are structured to support a dark mode override later. Not included in MVP.
5. **Logo placement** -- The wireframes show "WeDance" text in the footer. Should this be a logo mark instead?
