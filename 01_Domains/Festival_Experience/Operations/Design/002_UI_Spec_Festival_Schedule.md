# UI Specification: Festival Schedule MVP

**Date:** 2026-04-04
**Status:** Draft for Kirill's review
**Story:** Operations/Backlog/005_View_Festival_Schedule.md
**Wireframes:** Design/001_Wireframes_Festival_Schedule.md

---

## 1. Layout Pattern Recommendation

### Option A: Timetable Grid (rooms as columns, time as rows)

**Pros:**
- Familiar to dancers who have seen printed festival schedules
- Shows concurrency at a glance (you literally see the columns side by side)
- Dense -- a full day fits on one screen

**Cons:**
- Breaks on mobile. A festival with 4-5 rooms means 4-5 columns on a 375px screen. Either the text is unreadable or you must scroll horizontally AND vertically.
- Touch targets become tiny. Tapping a cell in a dense grid is error-prone, especially in festival conditions (standing, crowded, one hand).
- Workshops of different durations create awkward cell heights.
- Not accessible -- screen readers struggle with complex table layouts.

### Option B: Chronological List with Horizontal Card Rows (RECOMMENDED)

**Pros:**
- Mobile-native. Vertical scroll is the dominant interaction. Each time slot is a clear section.
- Concurrent workshops are shown as a horizontal scroll row of cards within each time slot. This preserves the "what is happening at 10:00" mental model without forcing a full grid.
- Large touch targets. Each card is tappable with a thumb.
- Scales gracefully from 2 rooms to 8 rooms.
- Accessible -- linear reading order, semantic headings.

**Cons:**
- Less spatially compact than a grid (more scrolling for a full day overview).
- Horizontal scroll within a time slot is a secondary gesture that may not be immediately discoverable.

### Decision

**Use Option B (chronological list with horizontal card rows).** Rationale:

1. The primary use case is "what is happening now / next" -- a list sorted by time directly serves this.
2. Mobile-first is a hard constraint (dancers at festivals).
3. The grid can always be offered as a desktop alternative in a future version.
4. The horizontal scroll for concurrent workshops can be hinted with partial card visibility (the rightmost card peeks in from the edge).

---

## 2. Concurrent Workshop Visibility

### Problem
At any time slot, 2-5 workshops may run simultaneously in different rooms. On a 375px screen, showing all of them is the core design challenge.

### Solution: Horizontal Scroll Row per Time Slot

```
|  10:00                                    |
|  [Card A]  [Card B]  [Card C -->          |
|                       partially visible   |
```

**Rules:**
- Each card is 140px wide, 12px gap between cards.
- On a 375px screen, 2 full cards + the left edge of a 3rd card are visible. The partial card signals "scroll right for more."
- Cards have a subtle left border colored by dance style (2px solid, style color). This provides a quick visual scan even before reading.
- Within a time slot, cards are ordered: Room A first, then B, C, etc. (consistent room ordering across all time slots).

**Scroll indicators:**
- A subtle horizontal scroll indicator (dots or a thin progress bar) appears below the card row if there are more cards than fit on screen.
- On first visit, a brief auto-scroll animation (200ms right, 200ms back) hints at the horizontal scroll on the first time slot only.

### Fallback for 1 Workshop
If a time slot has only 1 workshop, the card stretches to full width (no horizontal scroll row needed).

---

## 3. Color and Contrast for Festival Environments

### Problem
Dancers use phones in wildly different lighting:
- Bright outdoor sun (low contrast, washed-out screens)
- Dark indoor dance halls (bright screens are blinding, dark UI is easier on eyes)
- Moving between the two within minutes

### Recommendations

**Use a light theme as default.** Dark themes look better in dark rooms but are worse outdoors, and outdoor is the harder problem (you cannot increase screen brightness beyond max, but you can turn it down in a dark room).

**High contrast text:**
- Body text: minimum 4.5:1 contrast ratio (WCAG AA)
- Important text (workshop name, time): minimum 7:1 contrast ratio (WCAG AAA)
- Use near-black on white, not gray-on-gray

**Style color badges:**
- Each dance style gets a distinct color (see Design System brief).
- Badge colors must pass AA contrast against white for the text inside the badge.
- Avoid relying on color alone -- the style name is always written out.

**Card backgrounds:**
- White cards on a light gray (#F5F5F5) page background.
- Provides separation without relying on thin borders (which disappear in bright sun).

**Active / selected states:**
- Day tabs and filter chips use filled backgrounds when active (not just underlines, which are hard to see outdoors).

**Font sizes:**
- Minimum 14px for any text. Festival conditions = squinting at a distance.
- Workshop name: 16px bold. Time: 16px. Room: 12px caps (the one exception, acceptable because room names are short).

---

## 4. Interaction Patterns

### Tap

| Target | Action |
|--------|--------|
| Day tab | Switch schedule to that day. Scroll resets to top. |
| Style chip | Filter workshops to that style. Scroll stays at current position. |
| Workshop card | Open detail bottom sheet. |
| Share button (top bar) | Trigger native share or copy link. |
| Share button (detail sheet) | Share deep link to that specific workshop. |
| Retry button (error state) | Re-fetch schedule data. |
| "Show all styles" (filter empty) | Clear style filter, return to "All". |

### Scroll

| Gesture | Action |
|---------|--------|
| Vertical scroll | Navigate through time slots (main interaction). |
| Horizontal scroll (within time slot) | Browse concurrent workshops. |
| Overscroll top | Pull-to-refresh (optional for MVP, nice-to-have). |

### Swipe

| Gesture | Action |
|---------|--------|
| Swipe down on bottom sheet | Dismiss detail or overflow sheet. |
| Swipe left/right on day tabs | Switch to previous/next day (optional shortcut). |

### Keyboard (desktop)

| Key | Action |
|-----|--------|
| Left/Right arrows | Navigate day tabs. |
| Tab | Move focus between interactive elements. |
| Enter | Activate focused element. |
| Escape | Dismiss bottom sheet. |

---

## 5. Component Inventory

| Component | States | Notes |
|-----------|--------|-------|
| **TopBar** | Default | Festival name, share button. Fixed at top. |
| **DayTabs** | Active, Inactive, Scrollable | Sticky below TopBar. |
| **StyleChips** | All (default), Style active, Overflow (+N) | Horizontal scroll row. |
| **TimeHeader** | Default | Sticky within scroll. Shows time like "10:00". |
| **WorkshopCard** | Default, Tapped/Active, Skeleton | 140px wide. Style color left border. |
| **WorkshopDetail** | Open, Closing | Bottom sheet. Slide-up animation. |
| **OverflowSheet** | Open, Closing | Bottom sheet for extra style chips. |
| **EmptyState** | No data, Filter empty, Error, Loading | Centered content with icon. |
| **ShareToast** | Visible, Fading | "Link copied" confirmation. |
| **BreakCard** | Default | Full-width card for lunch/breaks. Muted styling. |
| **ScrollHint** | Visible, Hidden | Dots or bar below horizontal card rows. |

---

## 6. Responsive Breakpoints

The MVP is mobile-first. Desktop is a stretch goal but the layout should not break.

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| **Mobile** | 320-428px | Default layout. Vertical list, horizontal card scroll per time slot. Cards 140px wide. |
| **Large mobile / small tablet** | 429-768px | Cards grow to 180px. 3 full cards visible per row. |
| **Tablet / Desktop** | 769px+ | Cards arranged in a wrapping grid (no horizontal scroll needed). 3-4 cards per row. Time headers span full width. Consider showing a timetable grid as an alternative view toggle (v1.1). |

---

## 7. Performance Constraints

| Metric | Target | How |
|--------|--------|-----|
| First Contentful Paint | < 1.5s on 3G | SSR or pre-render the HTML. Inline critical CSS. |
| Full schedule render | < 3s on 3G | Total page weight < 200KB (HTML + CSS + JS + data). No framework unless needed. |
| Interaction latency | < 100ms | Filtering and tab switching happen client-side on pre-loaded data. No network round-trip for filters. |

All schedule data for the entire festival should be loaded in a single request (it is small -- a 3-day festival with 60 workshops is ~15KB of JSON). Filters operate on the client side.

---

## 8. Open Questions for Kirill

1. **Style colors** -- Should each dance style have a brand-specific color, or should we use a generic palette? The wireframes assume distinct colors per style.
2. **Festival banner/header image** -- Should the top bar include a small festival banner image, or keep it text-only for speed?
3. **Dark mode** -- Should we support an auto dark mode toggle, or ship light-only for MVP?
4. **Typography** -- Is there an existing WeDance brand font, or should we use a system font stack for performance?

---

## UX Risks

- **Horizontal scroll discoverability** -- Dancers may not realize they can scroll right to see more workshops in a time slot. Mitigated by: partial card peek + one-time scroll hint animation + scroll indicator dots.
- **Too many style chips** -- Festivals with 10+ styles will overflow the chip row. Mitigated by: "+N" overflow chip with bottom sheet.
- **Small room labels** -- 12px room names may be hard to read. Mitigated by: using uppercase and high-contrast color. Monitor in usability testing.
- **Bottom sheet on older phones** -- Bottom sheets with backdrop blur may have performance issues on low-end Android devices. Use a simple semi-transparent overlay instead of blur.
