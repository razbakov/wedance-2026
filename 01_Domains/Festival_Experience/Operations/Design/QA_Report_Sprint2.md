# QA Report: Design Spec vs Implementation (Sprint 2)

**Date:** 2026-04-04
**Author:** Designer Agent
**Scope:** Compare implemented app code against UI Spec (002), Design System Brief (003), and Festival Theming Guide (004)

**Files reviewed:**
- `app/app/pages/index.vue`
- `app/app/components/WorkshopCard.vue`
- `app/app/components/ScheduleFilters.vue`
- `app/app/components/EmptyState.vue`
- `app/app/composables/useSchedule.ts`
- `app/app/app.vue`
- `app/tailwind.config.ts`
- `app/nuxt.config.ts`

---

## Summary

The current implementation delivers a functional schedule viewer with filtering, but the layout pattern, visual tokens, interaction model, and multiple spec-required components diverge significantly from the design specs. The app uses a generic vertical card list with Tailwind gray defaults instead of the specified chronological-list-with-horizontal-card-rows pattern. No CSS custom properties, festival theming, or design system tokens are present. Several entire components from the spec are missing.

**Issue counts:** P0: 6 | P1: 14 | P2: 8

---

## P0 -- Blocks Launch

### QA-001: Layout pattern is wrong -- vertical grid instead of horizontal card rows per time slot

**Description:** The spec calls for a chronological list where each time slot is a section with a `TimeHeader` and a horizontal scroll row of `WorkshopCard` components (140px wide cards, scroll-snap, scroll hint dots). The implementation uses a vertical `grid gap-3 sm:grid-cols-2` layout that groups workshops by day, not by time slot. There is no time-slot grouping, no horizontal scrolling, and no `TimeHeader` component.

**Spec reference:** 002_UI_Spec, Section 1 (Layout Pattern), Section 2 (TimeHeader, CardRow, ScrollHintDots), Section 3 (Concurrent Workshop Visibility)

**Severity:** P0

**Suggested fix:** Restructure `workshopsByDay` to group by `(day, startTime)` pairs. For each time slot, render a sticky `TimeHeader` with the time, followed by a horizontal flex container with overflow-x scroll, containing 140px-wide `WorkshopCard` components. Add `ScrollHintDots` below each row when cards overflow.

---

### QA-002: WorkshopCard design does not match spec -- wrong dimensions, no style-color left border, wrong internal layout

**Description:** The spec defines a compact card: 140px wide (mobile) / 180px (tablet+), min-height 120px, 3px left border colored by dance style, vertical content stack (room, name, artist, time, style badge). The implementation is a full-width horizontal card with `rounded-lg border border-gray-200`, no left border accent, a side-by-side layout (name+badge row, then meta row with inline SVG icons), and a description line-clamp. The card shows room/time/level in an icon row instead of the specified stacked layout.

**Spec reference:** 002_UI_Spec, Section 2 (WorkshopCard), 003_Design_System, Section 4.5

**Severity:** P0

**Suggested fix:** Redesign `WorkshopCard.vue` to: fixed width 140px (with CSS variable for 180px at tablet), vertical flex layout, 3px left border using the dance style color from the design system palette, content stack: room (11px uppercase), name (15px semibold, max 2 lines), artist (13px), time (13px), style badge (11px, filled style color background with white text). Remove inline SVG icons and description preview.

---

### QA-003: No CSS custom properties or design tokens implemented

**Description:** The design system defines a full set of CSS custom properties (`--color-brand-primary`, `--color-bg-page`, `--color-text-primary`, `--festival-accent`, etc.) in both the Design System Brief and the Festival Theming Guide. The implementation has no global CSS file, no `:root` variables, and `tailwind.config.ts` has an empty `extend` block. All colors are Tailwind defaults (`gray-900`, `gray-100`, etc.) which do not match the spec values.

**Spec reference:** 003_Design_System, Section 3 (Color Tokens); 004_Festival_Theming, Section 3 (Implementation)

**Severity:** P0

**Suggested fix:** Create a global CSS file (e.g., `app/app/assets/css/main.css`) that defines all `:root` CSS custom properties from the design system. Alternatively, extend `tailwind.config.ts` to include the spec colors. Reference these tokens throughout all components. At minimum, set: `--festival-accent`, `--color-bg-page` (#F7F7F8), `--color-text-primary` (#1A1A1A), `--color-text-secondary` (#4A4A4A), `--color-text-tertiary` (#7A7A7A), `--color-border` (#E2E2E4), `--color-brand-primary` (#E8453C).

---

### QA-004: Dance style colors are pastel badges instead of spec-defined solid colors

**Description:** The spec defines specific solid dance style colors (Salsa: #DC2626, Bachata: #7C3AED, Kizomba: #0E7490, etc.) used as: filled badge backgrounds with white text, and 3px left border accents on cards. The implementation uses Tailwind pastel variants (`bg-red-100 text-red-800`, `bg-purple-100 text-purple-800`, etc.) -- light background with dark text. This fails to match the visual design and loses the quick-scan color coding that the spec was designed for.

**Spec reference:** 003_Design_System, Section 3 (Dance Style Colors); 002_UI_Spec, Section 2 (WorkshopCard style badge)

**Severity:** P0

**Suggested fix:** Replace `styleColorMap` in `WorkshopCard.vue` with the exact hex colors from the spec. Style badges should use `background: [style-color]; color: #FFFFFF`. The same color map should be used for the 3px left border on each card. Consider extracting the style color map to a shared utility or composable.

---

### QA-005: Workshop Detail bottom sheet is completely missing

**Description:** The spec defines a bottom sheet that opens when a user taps a workshop card (Screen 3). It contains the full workshop details: name, artist, day/time, room, style badge, level, description, and a "Share this workshop" button. The implementation has a `handleTap()` that only fires an analytics event -- there is no bottom sheet component, no overlay, no drag handle, no detailed view of any kind.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 3: Workshop Detail), 003_Design_System, Section 4.7 (WorkshopDetailSheet)

**Severity:** P0

**Suggested fix:** Create a new `WorkshopDetail.vue` component implementing the bottom sheet. It should: slide up from the bottom (200ms ease-out), have a max-height of 70vh, 16px border-radius top corners, a drag handle, overlay with `rgba(0,0,0,0.4)`, and dismiss on overlay tap or swipe down. Show all workshop fields. Include a full-width "Share this workshop" outlined button.

---

### QA-006: Share flow is completely missing

**Description:** The spec defines share functionality in two places: a Share button in the TopBar (shares the current schedule day view) and a Share button in the workshop detail sheet (shares a deep link to a specific workshop). The implementation has no Share button anywhere. No native share API integration, no clipboard copy fallback, no ShareToast component.

**Spec reference:** 002_UI_Spec, Section 2 (TopBar share button, Screen 4: Share Flow), 003_Design_System, Section 4.10 (ShareToast)

**Severity:** P0

**Suggested fix:** Add a Share button to the header (right side, outlined, coral #E8453C). Implement share logic: on mobile, use `navigator.share()` with URL format `wedance.vip/f/{festival-slug}?day={day}&utm_source=share&utm_medium=social`. On desktop fallback, copy URL to clipboard and show a `ShareToast` component ("Link copied!", dark background, auto-dismiss after 3 seconds).

---

## P1 -- Should Fix Before Pilot

### QA-007: TopBar does not match spec -- wrong height, no sticky position, no subtitle line, missing share button

**Description:** The spec defines a 56px sticky TopBar with festival name (20px/700), subtitle (12px/400, city + dates), and share button. The implementation uses a non-sticky `<header>` with `py-6` padding (taller than 56px), font size `text-2xl` (24px, not 20px), no share button, and the subtitle shows venue+city but not dates.

**Spec reference:** 002_UI_Spec, Section 2 (TopBar); 003_Design_System, Section 4.1

**Severity:** P1

**Suggested fix:** Make the header `sticky top-0 z-30`, set height to 56px with `py-0` and vertical centering, use 20px font for the festival name, add the date range to the subtitle, add the share button on the right.

---

### QA-008: DayTabs do not match spec -- wrong visual style, not sticky, wrapped in a filter section

**Description:** The spec defines DayTabs as pill-shaped buttons (8px border-radius, 8px 16px padding, 14px/600 font) that are sticky at `top: 56px` below the TopBar. Active state uses `--festival-accent` background with white text. The implementation renders day buttons inside a white card (`rounded-lg bg-white p-4 shadow-sm`) with `rounded-full` shape, using `bg-gray-900` for the active state instead of the festival accent color.

**Spec reference:** 002_UI_Spec, Section 2 (DayTabs); 003_Design_System, Section 4.2

**Severity:** P1

**Suggested fix:** Extract DayTabs from the filter section into their own sticky bar. Use `border-radius: 8px` (not full), active background `var(--festival-accent)` with white text, inactive with border. Make sticky at `top: 56px`.

---

### QA-009: StyleChipRow does not match spec -- wrong visual style, no "All" chip, no "+N" overflow, not sticky

**Description:** The spec defines style chips as pills (border-radius 16px, 13px/600 font, 4px 12px padding) in a horizontal scroll row, sticky at `top: 108px`. It includes an "All" chip as the default active state and a "+N" overflow chip when there are more styles than fit. The implementation has `rounded-full` buttons (close to 16px radius) but uses `bg-gray-900` for active state instead of the dance style color, has no "All" chip, no "+N" overflow chip, and is not sticky.

**Spec reference:** 002_UI_Spec, Section 2 (StyleChipRow, Screen 2: Filter Interaction); 003_Design_System, Section 4.3

**Severity:** P1

**Suggested fix:** Add an "All" chip as the first option (active by default, uses `color-interactive` / #E8453C). When a specific style is active, use that style's color as the chip background. Make the row sticky. Implement "+N" overflow when chips exceed the viewport width, opening a bottom sheet with the remaining options.

---

### QA-010: Loading state (skeleton cards) is missing

**Description:** The spec defines a loading state with skeleton cards (140px wide, 120px tall, #E5E5E5 background, shimmer animation) arranged in the same layout as real content -- 3 per row, 2 rows. The implementation has no loading state. The schedule renders from mock data synchronously.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 5: Loading State); 003_Design_System, Section 4.5 (Skeleton state)

**Severity:** P1

**Suggested fix:** Add a skeleton loading state that displays while schedule data is being fetched. Use the same horizontal card row layout with 6 skeleton placeholders (3 per row, 2 rows). Apply a shimmer animation (`linear-gradient` sweep from #E5E5E5 to #F0F0F0, 1.5s infinite). Add a 3-second timeout before showing the error state.

---

### QA-011: Error state is missing

**Description:** The spec defines an error state with an `alert-triangle` Lucide icon (40px, #DC2626), heading "Could not load schedule", description text, and a Retry button (#E8453C background, white text). The implementation has no error handling for data loading failures.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 5: Error State); 003_Design_System, Section 4.9

**Severity:** P1

**Suggested fix:** Add an error state to `EmptyState.vue` (or create a separate component). Show when data fetch fails. Include a Retry button that re-triggers the data fetch. Use the spec icon, colors, and typography.

---

### QA-012: EmptyState component does not match spec -- wrong icon, wrong colors, wrong text, wrong button style

**Description:** The spec defines two empty states: (a) "No data" with a Lucide `calendar` icon (40px, #7A7A7A), heading "Schedule coming soon" (18px/700), and description; (b) "Filter empty" with specific text pattern "No {Style} workshops on {Day}" and a text-only "Show all styles" link in coral. The implementation uses an inline SVG calendar icon at 64px (#D1D5DB gray-300), heading "No schedule available yet" (different text), and for filter empty, a filled `bg-gray-900` button "Clear filters" instead of the spec's text-only coral link.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 5: No Data State, Filter Empty State); 003_Design_System, Section 4.9

**Severity:** P1

**Suggested fix:** Use Lucide icons (install `lucide-vue-next`). Match the heading text, description text, icon size (40px), and icon color (#7A7A7A) from the spec. For filter empty state, use the specific copy pattern and replace the filled button with a text-only link in #E8453C.

---

### QA-013: "Powered by WeDance" footer does not match spec

**Description:** The spec defines the footer as: "Powered by" in 11px/400/#7A7A7A and "WeDance" in 11px/600/#E8453C (coral). Padding 24px 16px, transparent background. The implementation uses `text-sm text-gray-400` (14px, #9CA3AF) with a white background, top border, and does not split the text to apply coral color to "WeDance".

**Spec reference:** 002_UI_Spec, Section 2 (Footer); 003_Design_System, Section 4.12

**Severity:** P1

**Suggested fix:** Change footer to transparent background (no `bg-white`, no `border-t`). Split text so "WeDance" is wrapped in a `<span>` with `font-semibold` and coral color (#E8453C). Reduce font size to 11px. Use padding `24px 16px`.

---

### QA-014: Page background is white instead of spec's light gray (#F7F7F8)

**Description:** The spec uses `#F7F7F8` (`color-bg-page`) as the page background so white cards stand out with separation. The implementation uses `bg-gray-50` which is #F9FAFB -- close but not matching the spec value, and more importantly, the cards sit inside a `main` with no explicit background, losing the intended card-on-page contrast.

**Spec reference:** 003_Design_System, Section 3 (Core UI Palette, `color-bg-page`); 002_UI_Spec, Section 4

**Severity:** P1

**Suggested fix:** Set page background to `#F7F7F8` either via a CSS custom property or a custom Tailwind color. Ensure card backgrounds are explicitly `#FFFFFF` for contrast.

---

### QA-015: Font stack not set to spec's system font stack

**Description:** The spec requires `font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. The implementation relies on Tailwind's default sans-serif stack, which is similar but not identical (Tailwind uses `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"` and does not prioritize Inter).

**Spec reference:** 003_Design_System, Section 1 (Typography Scale)

**Severity:** P1

**Suggested fix:** Override Tailwind's `fontFamily.sans` in `tailwind.config.ts` to use the spec's font stack with Inter first.

---

### QA-016: BreakCard component is missing

**Description:** The spec defines a `BreakCard` for displaying breaks between workshop sessions: full-width, transparent background, 1px dashed border, centered text with break name and time. There is no BreakCard component in the implementation, and the data model does not appear to support break entries.

**Spec reference:** 002_UI_Spec, Section 2 (BreakCard); 003_Design_System, Section 4.6

**Severity:** P1

**Suggested fix:** Create a `BreakCard.vue` component matching the spec. Add support for break entries in the schedule data model or derive breaks from gaps between time slots.

---

### QA-017: No OG meta tags for link previews

**Description:** The spec requires Open Graph meta tags for social sharing link previews: `og:title` ("[Festival Name] - [Day] Schedule"), `og:description` ("[N] workshops: [Style1], [Style2], ..."), `og:image`, and `og:url`. The implementation only sets a basic `<title>` and `<meta name="description">` via `useHead()`, with no OG tags.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 4: OG Meta Tags)

**Severity:** P1

**Suggested fix:** Add `og:title`, `og:description`, `og:image`, and `og:url` meta tags in the `useHead()` call. Generate the description dynamically from the workshop count and style list. Use the festival banner image (if available) for `og:image`.

---

### QA-018: Workshops not grouped by time slot -- no concurrent workshop visibility

**Description:** The spec's core UX pattern is grouping concurrent workshops by time slot so dancers can see "what is happening now." The implementation groups workshops only by day, with no sub-grouping by start time. A dancer cannot visually scan which workshops are happening simultaneously.

**Spec reference:** 002_UI_Spec, Section 3 (Concurrent Workshop Visibility)

**Severity:** P1

**Suggested fix:** In `useSchedule.ts`, add a computed property that groups workshops within each day by `startTime`. The template should iterate over these time-slot groups, rendering a `TimeHeader` and then a horizontal card row for each.

---

### QA-019: No `prefers-reduced-motion` support

**Description:** The design system requires respecting `prefers-reduced-motion: reduce` -- skipping all animations except opacity changes when the user prefers reduced motion. The implementation has no animations to reduce, but also has no foundation for when animations are added.

**Spec reference:** 003_Design_System, Section 6 (Animation Tokens, accessibility rule)

**Severity:** P1

**Suggested fix:** Add a global CSS rule: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`. As animations are added (bottom sheet, toast, card tap), ensure they check this media query.

---

### QA-020: Festival theming layer not implemented

**Description:** The theming guide specifies that festivals can override `--festival-accent`, `--festival-accent-hover`, `--festival-header-bg`, `--festival-header-text`, and `--festival-banner-url` via CSS custom properties or JSON config. None of this infrastructure exists. The `FestivalMetadata` type has no theme fields, and no CSS custom properties are defined anywhere.

**Spec reference:** 004_Festival_Theming, Sections 2-3

**Severity:** P1

**Suggested fix:** Add theme fields to `FestivalMetadata` (or a separate config). Define `:root` CSS custom properties with defaults. Reference them in components (TopBar background, DayTabs active color, etc.). For the MVP, these can be hardcoded per festival; the architecture just needs to be in place.

---

## P2 -- Nice to Have

### QA-021: No Festival Banner component

**Description:** The spec includes an optional festival banner image (120px height, cover fit, scrolls with content) above the TopBar. This is not implemented and there is no placeholder logic.

**Spec reference:** 002_UI_Spec, Section 2 (Festival Banner)

**Severity:** P2

**Suggested fix:** Add an optional `<img>` above the header. Show only if a banner URL is provided. Use `height: 120px; object-fit: cover; width: 100%`.

---

### QA-022: No scroll hint animation for horizontal card rows

**Description:** The spec defines a one-time auto-scroll animation (100ms right 20px, 100ms back) on the first time slot to hint at horizontal scrollability. Since horizontal scroll rows are not implemented yet, this is deferred, but it should be noted for when the layout is corrected.

**Spec reference:** 002_UI_Spec, Section 3 (Scroll discoverability)

**Severity:** P2

**Suggested fix:** After implementing horizontal card rows, add a one-time scroll hint using `sessionStorage` to avoid repeating. Animate the first card row 20px right and back.

---

### QA-023: No OverflowSheet for "+N" style chips

**Description:** The spec defines a bottom sheet that opens when the "+N" overflow chip is tapped, showing remaining style options in a vertical list. This is not implemented.

**Spec reference:** 002_UI_Spec, Section 2 (Screen 2: "+N" Overflow Interaction); 003_Design_System, Section 4.8

**Severity:** P2

**Suggested fix:** Create an `OverflowSheet.vue` bottom sheet component. Show style options as rows with a 12px colored dot and style name. Tapping a row selects that filter and dismisses the sheet.

---

### QA-024: Keyboard navigation not implemented

**Description:** The spec defines keyboard interactions for desktop: Left/Right arrows for day tab navigation, Tab for focus movement, Enter for activation, Escape to dismiss bottom sheets. None of these are implemented.

**Spec reference:** 002_UI_Spec, Section 5 (Keyboard interactions)

**Severity:** P2

**Suggested fix:** Add keyboard event listeners for arrow key navigation on day tabs, ensure all interactive elements have proper `tabindex`, and add Escape key handler for bottom sheets.

---

### QA-025: No ARIA labels or roles on interactive elements

**Description:** The spec mentions accessible, semantic, screen-reader friendly design. The implementation lacks: `role="tablist"` on day tab containers, `role="tab"` and `aria-selected` on tab buttons, `aria-label` on the share button, `aria-live` region for filter result updates, and `role="dialog"` for the bottom sheet (when added).

**Spec reference:** 002_UI_Spec, Section 1 (Accessible -- linear reading order, semantic headings, screen-reader friendly)

**Severity:** P2

**Suggested fix:** Add ARIA roles and attributes: `role="tablist"` on the day tab row, `role="tab"` + `aria-selected` on each tab, `aria-label="Share schedule"` on the share button, and `aria-live="polite"` on the schedule content area so filter changes are announced.

---

### QA-026: Responsive breakpoints not properly configured

**Description:** The spec defines three breakpoints: Mobile (320-428px, cards 140px), Large mobile (429-768px, cards 180px), Desktop (769px+, cards wrap in grid, max-width 768px centered). The implementation uses `sm:grid-cols-2` (Tailwind `sm` = 640px) which does not align with the spec breakpoints. There is no `max-width: 428px` for mobile or `max-width: 768px` for desktop content centering (the implementation uses `max-w-4xl` which is 896px).

**Spec reference:** 002_UI_Spec, Section 7 (Responsive Behavior); 003_Design_System, Section 7

**Severity:** P2

**Suggested fix:** Add custom breakpoints in `tailwind.config.ts` matching the spec (428px, 768px). Change `max-w-4xl` to a custom max-width of 768px for the content container. On desktop, switch from horizontal scroll to a wrapping grid layout.

---

### QA-027: Card tap interaction state not implemented

**Description:** The spec defines card tap feedback: `scale(0.97)`, increased box-shadow, 100ms transition. The implementation has only a hover shadow increase (`hover:shadow-md`) but no active/tap state with scale transform.

**Spec reference:** 002_UI_Spec, Section 2 (WorkshopCard interaction states); 003_Design_System, Section 4.5

**Severity:** P2

**Suggested fix:** Add `active:scale-[0.97] active:shadow-lg transition-all duration-100` to the card's class list.

---

### QA-028: Lucide icons not used -- inline SVGs instead

**Description:** The spec mandates Lucide Icons for consistency (share-2, calendar, alert-triangle, etc.). The implementation uses hand-drawn inline SVG paths that approximate but do not match Lucide icons.

**Spec reference:** 003_Design_System, Section 5 (Iconography)

**Severity:** P2

**Suggested fix:** Install `lucide-vue-next` and use the proper Lucide icon components (`Calendar`, `AlertTriangle`, `Share2`, `Clock`, `MapPin`, `Zap`) instead of inline SVGs.

---

## Summary Table

| ID | Description | Spec | Severity |
|----|-------------|------|----------|
| QA-001 | Layout is vertical grid, not horizontal card rows per time slot | 002 S1,S2,S3 | P0 |
| QA-002 | WorkshopCard wrong dimensions, no style-color border, wrong layout | 002 S2, 003 S4.5 | P0 |
| QA-003 | No CSS custom properties or design tokens | 003 S3, 004 S3 | P0 |
| QA-004 | Dance style colors are pastel instead of spec solid colors | 003 S3, 002 S2 | P0 |
| QA-005 | Workshop Detail bottom sheet is missing | 002 S2 (Screen 3) | P0 |
| QA-006 | Share flow is completely missing | 002 S2 (Screen 4) | P0 |
| QA-007 | TopBar wrong height, not sticky, no subtitle dates, no share button | 002 S2, 003 S4.1 | P1 |
| QA-008 | DayTabs wrong style, not sticky, no festival accent color | 002 S2, 003 S4.2 | P1 |
| QA-009 | StyleChips no "All" chip, no "+N" overflow, not sticky, wrong active color | 002 S2, 003 S4.3 | P1 |
| QA-010 | Loading state (skeleton cards) is missing | 002 S2 (Screen 5) | P1 |
| QA-011 | Error state is missing | 002 S2 (Screen 5) | P1 |
| QA-012 | EmptyState wrong icon, colors, text, button style | 002 S2, 003 S4.9 | P1 |
| QA-013 | Footer wrong font size, no coral on "WeDance", wrong background | 002 S2, 003 S4.12 | P1 |
| QA-014 | Page background #F9FAFB not spec #F7F7F8 | 003 S3 | P1 |
| QA-015 | Font stack not set to spec's Inter-first system stack | 003 S1 | P1 |
| QA-016 | BreakCard component missing | 002 S2, 003 S4.6 | P1 |
| QA-017 | No OG meta tags for link previews | 002 S2 (Screen 4) | P1 |
| QA-018 | Workshops not grouped by time slot | 002 S3 | P1 |
| QA-019 | No prefers-reduced-motion support | 003 S6 | P1 |
| QA-020 | Festival theming layer not implemented | 004 S2-3 | P1 |
| QA-021 | No Festival Banner component | 002 S2 | P2 |
| QA-022 | No scroll hint animation | 002 S3 | P2 |
| QA-023 | No OverflowSheet for "+N" style chips | 002 S2, 003 S4.8 | P2 |
| QA-024 | Keyboard navigation not implemented | 002 S5 | P2 |
| QA-025 | No ARIA labels or roles | 002 S1 | P2 |
| QA-026 | Responsive breakpoints not matching spec | 002 S7, 003 S7 | P2 |
| QA-027 | Card tap interaction state not implemented | 002 S2, 003 S4.5 | P2 |
| QA-028 | Lucide icons not used | 003 S5 | P2 |

---

## Recommended Fix Order

The P0 issues are interconnected. The recommended order for addressing them:

1. **QA-003** (design tokens) -- foundation for everything else
2. **QA-004** (style colors) -- needed before card redesign
3. **QA-001 + QA-018** (layout restructure + time slot grouping) -- the biggest structural change
4. **QA-002** (WorkshopCard redesign) -- depends on layout and colors
5. **QA-005** (Workshop Detail bottom sheet) -- new component
6. **QA-006** (Share flow) -- new component + integration

Then P1 issues, starting with the sticky navigation (QA-007, QA-008, QA-009) as a group, then states (QA-010, QA-011, QA-012), then the remaining items.
