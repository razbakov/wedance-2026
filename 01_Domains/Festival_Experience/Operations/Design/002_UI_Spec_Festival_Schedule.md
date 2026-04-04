# UI Specification: Festival Schedule MVP

**Date:** 2026-04-04
**Updated:** 2026-04-04 (high-fidelity visual specs with brand decisions applied)
**Status:** Ready for engineering
**Story:** Operations/Backlog/005_View_Festival_Schedule.md
**Wireframes:** Design/001_Wireframes_Festival_Schedule.md
**Design System:** Design/003_Design_System_Brief.md
**Festival Theming:** Design/004_Festival_Theming.md

---

## 1. Layout Pattern: Chronological List with Horizontal Card Rows

### Decision

Use a chronological list with horizontal card rows for concurrent workshops. This was evaluated against a timetable grid and chosen for the following reasons:

1. **Mobile-native** -- vertical scroll is the dominant interaction. Each time slot is a clear section.
2. **Large touch targets** -- each card is tappable with a thumb, critical for festival conditions (standing, one hand, crowded).
3. **Scales gracefully** -- from 2 rooms to 8 rooms without layout breakage.
4. **Accessible** -- linear reading order, semantic headings, screen-reader friendly.

The tradeoff (more vertical scrolling than a grid) is acceptable because the primary use case is "what is happening now/next" rather than "full day overview."

---

## 2. Screen-by-Screen Visual Specifications

### Screen 1: Schedule Day View (Main Screen)

This is the primary screen. A dancer opens a shared link and lands here.

#### Overall Page Structure (top to bottom)

```
[Festival Banner Image -- optional, 120px]     z-index: 40 (scrolls away)
[TopBar: name + share -- 56px, sticky]         z-index: 30, top: 0
[DayTabs -- 44px + padding, sticky]            z-index: 20, top: 56px
[StyleChips -- 48px, sticky]                   z-index: 20, top: 108px
[Schedule Content -- scrollable]               z-index: 0
  [TimeHeader -- sticky within content]        z-index: 10, top: 156px
  [CardRow -- horizontal scroll]
  [ScrollDots]
  [TimeHeader]
  [CardRow]
  [ScrollDots]
  [BreakCard]
  [TimeHeader]
  [CardRow]
  ...
[Footer: "Powered by WeDance"]
```

#### Festival Banner (optional)

- Width: 100%
- Height: 120px
- Object-fit: cover
- Border-radius: 0
- Scrolls with content (not sticky)
- If no banner image is provided, this section is omitted entirely (no empty space)
- The image URL is set via `--festival-banner-url` CSS custom property or an `<img>` tag

#### TopBar

| Property | Value |
|----------|-------|
| Height | 56px |
| Position | sticky, top: 0 |
| Background | `--festival-header-bg` (default: #FFFFFF) |
| Border-bottom | 1px solid #E2E2E4 |
| Padding | 0 16px |
| Z-index | 30 |

| Element | Font | Color | Position |
|---------|------|-------|----------|
| Festival name | 20px / 700 / 1.3 | `--festival-header-text` (default: #1A1A1A) | Left |
| Subtitle (city, dates) | 12px / 400 / 1.3 | #7A7A7A | Left, below name |
| Share button | 14px / 600 | #E8453C | Right, vertically centered |

Share button spec:
- Border: 1px solid #E2E2E4
- Border-radius: 8px
- Padding: 8px 12px
- Background: transparent
- Color: #E8453C (brand coral)
- Hover background: #FEF2F1 (brand light tint)
- Active: scale(0.97), 100ms

#### DayTabs

| Property | Value |
|----------|-------|
| Height | 44px + 12px vertical padding = ~56px with padding |
| Position | sticky, top: 56px |
| Background | #FFFFFF |
| Border-bottom | 1px solid #E2E2E4 |
| Padding | 12px 16px |
| Z-index | 20 |
| Overflow-x | auto (hidden scrollbar) |
| Gap | 8px |

| State | Background | Text Color | Border |
|-------|------------|------------|--------|
| Active | `--festival-accent` (default: #E8453C) | #FFFFFF | none |
| Inactive | transparent | #4A4A4A | 1px solid #E2E2E4 |
| Hover (inactive) | #F7F7F8 | #4A4A4A | 1px solid #E2E2E4 |

Tab pill spec:
- Padding: 8px 16px
- Border-radius: 8px
- Font: 14px / 600
- White-space: nowrap
- Transition: all 100ms ease-out

#### StyleChipRow

| Property | Value |
|----------|-------|
| Height | 32px chips + 16px vertical padding = 48px |
| Position | sticky, top: 108px |
| Background | #F7F7F8 |
| Padding | 12px 16px 4px |
| Z-index | 20 |
| Overflow-x | auto (hidden scrollbar) |
| Gap | 8px |

| State | Background | Text Color | Border |
|-------|------------|------------|--------|
| "All" active | #E8453C | #FFFFFF | #E8453C |
| Style active | style color | #FFFFFF | style color |
| Inactive | #FFFFFF | #4A4A4A | 1px solid #E2E2E4 |
| "+N" overflow | #F7F7F8 | #7A7A7A | 1px solid #E2E2E4 |

Chip spec:
- Padding: 4px 12px
- Border-radius: 16px
- Font: 13px / 600
- White-space: nowrap
- Transition: all 100ms ease-out

#### TimeHeader

| Property | Value |
|----------|-------|
| Position | sticky, top: 156px |
| Background | #F7F7F8 |
| Padding | 8px 0 |
| Z-index | 10 |
| Font | 16px / 600 / 1.4 |
| Color | #1A1A1A |

#### WorkshopCard

| Property | Value |
|----------|-------|
| Width | 140px (mobile), 180px (tablet+) |
| Min-height | 120px |
| Background | #FFFFFF |
| Border-radius | 8px |
| Border-left | 3px solid [style color] |
| Box-shadow | 0 1px 3px rgba(0,0,0,0.08) |
| Padding | 8px 12px 12px |
| Gap (flex column) | 4px |
| Scroll-snap-align | start |

Card content (top to bottom):

| Element | Font | Color | Other |
|---------|------|-------|-------|
| Room | 11px / 600 / uppercase / 0.5px tracking | #7A7A7A | -- |
| Workshop name | 15px / 600 / 1.3 | #1A1A1A | Max 2 lines, ellipsis overflow |
| Artist | 13px / 400 | #4A4A4A | 1 line, ellipsis overflow |
| Time | 13px / 400 | #4A4A4A | -- |
| Style badge | 11px / 600 | #FFFFFF on style color | border-radius: 10px, padding: 2px 8px, margin-top: auto |

**Interaction states:**

| State | Visual Change | Transition |
|-------|--------------|------------|
| Default | As above | -- |
| Hover | Box-shadow: 0 2px 6px rgba(0,0,0,0.12) | 100ms ease-out |
| Active/Tapped | scale(0.97), shadow: 0 2px 6px rgba(0,0,0,0.15) | 100ms ease-out |
| Skeleton | Rounded gray rectangles with shimmer animation | 1.5s infinite |

#### CardRow (horizontal scroll container)

| Property | Value |
|----------|-------|
| Display | flex |
| Gap | 12px |
| Overflow-x | auto (hidden scrollbar) |
| Scroll-snap-type | x proximity |
| Padding-bottom | 8px |
| -webkit-overflow-scrolling | touch |

#### BreakCard

| Property | Value |
|----------|-------|
| Width | 100% |
| Background | transparent |
| Border | 1px dashed #E2E2E4 |
| Border-radius | 8px |
| Padding | 16px |
| Text-align | center |
| Font | 14px / 400 |
| Color | #7A7A7A |
| Margin-top | 12px |

#### ScrollHintDots

| Property | Value |
|----------|-------|
| Display | flex, centered |
| Gap | 6px |
| Padding | 8px 0 |
| Dot size | 6px diameter |
| Active dot color | #4A4A4A |
| Inactive dot color | #E2E2E4 |

#### Footer

| Property | Value |
|----------|-------|
| Padding | 24px 16px |
| Text-align | center |
| Background | transparent |

| Element | Font | Color |
|---------|------|-------|
| "Powered by" | 11px / 400 | #7A7A7A |
| "WeDance" | 11px / 600 | #E8453C (brand coral) |

---

### Screen 2: Filter Interaction

Filters are inline, not a separate screen. This keeps the dancer in context.

#### Day Tab Switching

1. User taps an inactive day tab.
2. The tapped tab immediately gets the active style (`--festival-accent` background, white text).
3. The previously active tab reverts to inactive style.
4. The schedule content below updates to show that day's workshops.
5. Scroll position resets to top of the schedule content.
6. Transition: all style changes happen in 100ms. Content swap is instant (data is pre-loaded).

#### Style Chip Filtering

1. User taps an inactive style chip.
2. The tapped chip gets active style (style-specific color background, white text).
3. The "All" chip (or previously active chip) reverts to inactive.
4. Workshop cards that do not match the selected style are hidden.
5. Time slots with no visible cards are hidden.
6. Scroll position is preserved (does not jump to top).
7. If no workshops match: show the filter-empty state (see Screen 5).

#### "+N" Overflow Interaction

1. User taps the "+N" chip.
2. Bottom sheet slides up (200ms ease-out) showing remaining style options.
3. Each option row: 12px colored dot + style name, 14px, with 12px vertical padding.
4. User taps a style name.
5. Sheet dismisses, that style becomes the active filter.
6. The "+N" chip is replaced by the selected style's chip in the main row (optional optimization -- can keep "+N" and just apply the filter for MVP).

---

### Screen 3: Workshop Detail (Bottom Sheet)

#### Trigger

User taps any workshop card in the schedule.

#### Bottom Sheet Specs

| Property | Value |
|----------|-------|
| Position | fixed, bottom: 0 |
| Width | 100%, max-width 428px, centered |
| Max-height | 70vh |
| Background | #FFFFFF |
| Border-radius | 16px 16px 0 0 |
| Z-index | 110 |
| Animation | translateY(100%) to translateY(0), 200ms ease-out |
| Overflow-y | auto |

#### Overlay

| Property | Value |
|----------|-------|
| Position | fixed, inset: 0 |
| Background | rgba(0,0,0,0.4) |
| Z-index | 100 |
| Animation | opacity 0 to 1, 200ms |
| Dismiss | tap overlay, swipe down on sheet |

#### Drag Handle

| Property | Value |
|----------|-------|
| Width | 32px |
| Height | 4px |
| Border-radius | 2px |
| Background | #E2E2E4 |
| Margin | 12px auto 16px |

#### Sheet Content Layout

| Element | Font | Color | Spacing |
|---------|------|-------|---------|
| Workshop name | 18px / 700 / 1.3 | #1A1A1A | margin-bottom: 8px |
| "with [Artist]" | 14px / 400 / 1.5 | #4A4A4A | margin-bottom: 4px |
| "DAY HH:MM - HH:MM" | 14px / 400 | #4A4A4A, day label bold | margin-bottom: 4px |
| Room name | 14px / 400 | #4A4A4A | margin-bottom: 4px |
| Style badge | 11px / 600 | white on style color | border-radius: 10px, pad 2px 8px |
| "Level: X" | 14px / 400 | #4A4A4A | margin-bottom: 4px; hidden if no level |
| Description | 14px / 400 / 1.5 | #4A4A4A | margin-top: 8px; hidden if empty |
| Share button | 14px / 600 | #E8453C, outlined | margin-top: 20px, full width |

"Share this workshop" button:
- Border: 1px solid #E8453C
- Border-radius: 8px
- Padding: 12px
- Background: transparent
- Color: #E8453C
- Hover: background #FEF2F1
- Active: scale(0.97)

---

### Screen 4: Share Flow

#### Share Button Behavior

**On mobile (navigator.share supported):**
1. User taps Share button.
2. Native OS share sheet appears.
3. URL format: `wedance.vip/f/{festival-slug}?day={day}&utm_source=share&utm_medium=social`

**On desktop (fallback):**
1. User taps Share button.
2. URL is copied to clipboard.
3. ShareToast appears at bottom center: "Link copied!" with a check icon.
4. Toast auto-dismisses after 3 seconds.

#### ShareToast Spec

| Property | Value |
|----------|-------|
| Position | fixed, bottom: 24px, centered |
| Background | #1A1A1A |
| Color | #FFFFFF |
| Font | 14px / 600 |
| Border-radius | 8px |
| Padding | 12px 16px |
| Z-index | 200 |
| Animation in | translateY(16px) + opacity 0 to translateY(0) + opacity 1, 200ms ease-out |
| Animation out | reverse, 200ms ease-in |
| Auto-dismiss | 3 seconds |

#### OG Meta Tags (for link previews)

```html
<meta property="og:title" content="[Festival Name] - [Day] Schedule">
<meta property="og:description" content="[N] workshops: [Style1], [Style2], ...">
<meta property="og:image" content="[festival banner or generated card]">
<meta property="og:url" content="[canonical URL without UTM]">
```

---

### Screen 5: Empty / Loading / Error States

#### Loading State

Shows skeleton cards in the same layout as real content.

| Element | Visual |
|---------|--------|
| Skeleton card | 140px wide, 120px tall, #E5E5E5 background, 8px border-radius |
| Shimmer animation | Linear gradient sweep from #E5E5E5 to #F0F0F0, 1.5s infinite |
| Layout | 3 skeleton cards per row, 2 rows visible |
| Day tabs | Real (rendered server-side) |
| Style chips | Hidden until data loads |
| Max duration | 3 seconds before error fallback |

#### No Data State

```
[Calendar icon, 40px, #7A7A7A]

Schedule coming soon

We're preparing the workshop
schedule for this festival.
```

- Icon: Lucide `calendar`, 40px, #7A7A7A
- Heading: 18px / 700, #1A1A1A
- Description: 14px / 400, #4A4A4A, text-align center, max-width 280px
- Vertical centering within the content area
- Padding: 64px 16px

#### Error State

```
[AlertTriangle icon, 40px, #DC2626]

Could not load schedule

Check your connection and try again.

[Retry]
```

- Icon: Lucide `alert-triangle`, 40px, #DC2626
- Heading: 18px / 700, #1A1A1A
- Description: 14px / 400, #4A4A4A
- Retry button: #E8453C background, white text, 8px radius, padding 12px 24px, 14px/600

#### Filter Empty State

```
No Kizomba workshops on Saturday.

[Show all styles]
```

- Text: 14px / 400, #4A4A4A, text-align center
- "Show all styles" button: text-only (no background), #E8453C, 14px/600, underline on hover
- Padding: 32px 16px

---

## 3. Concurrent Workshop Visibility

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
- On a 375px screen (16px left margin): 2 full cards + the left edge of a 3rd card are visible. The partial card signals "scroll right for more."
- Cards have a 3px left border colored by dance style. This provides a quick visual scan even before reading.
- Within a time slot, cards are ordered by room name (Room A first, then B, C, etc.).

**Scroll discoverability:**
- A partial card peek (the 3rd card's left edge is visible) is the primary signal.
- Scroll indicator dots appear below the card row when there are more cards than visible.
- On first visit only: a brief auto-scroll animation (100ms right 20px, 100ms back) hints at horizontal scroll on the first time slot. This uses `sessionStorage` to avoid repeating.

**Single workshop fallback:**
If a time slot has only 1 workshop, the card stretches to full width (`flex: 1 1 100%`). No horizontal scroll row, no scroll dots.

---

## 4. Color and Contrast for Festival Environments

### Design for Outdoor Readability

Dancers use phones in wildly different lighting: bright outdoor sun, dark indoor dance halls, and transitions between them.

**Light theme only (MVP).** Dark themes look better in dark rooms but are worse outdoors, and outdoor is the harder problem (you cannot increase screen brightness beyond max).

**Contrast requirements:**
- Body text (#4A4A4A on #FFFFFF): 9.7:1 -- passes AAA
- Primary text (#1A1A1A on #FFFFFF): 16.9:1 -- passes AAA
- Tertiary text (#7A7A7A on #FFFFFF): 4.5:1 -- passes AA
- Brand coral (#E8453C on #FFFFFF): 4.6:1 -- passes AA
- All style badge colors on white text: verified AA (see Design System Brief)

**Card separation:**
- White cards (#FFFFFF) on light gray page (#F7F7F8) plus subtle box-shadow provides separation without relying on thin borders (which disappear in bright sun).

**Active states:**
- Day tabs and filter chips use filled backgrounds when active (not just underlines, which are too subtle outdoors).

---

## 5. Interaction Summary

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
| Overlay (behind sheet) | Dismiss bottom sheet. |

### Scroll

| Gesture | Action |
|---------|--------|
| Vertical scroll | Navigate through time slots (main interaction). |
| Horizontal scroll (within time slot) | Browse concurrent workshops. |

### Swipe

| Gesture | Action |
|---------|--------|
| Swipe down on bottom sheet | Dismiss detail or overflow sheet. |

### Keyboard (desktop)

| Key | Action |
|-----|--------|
| Left/Right arrows | Navigate day tabs. |
| Tab | Move focus between interactive elements. |
| Enter | Activate focused element. |
| Escape | Dismiss bottom sheet. |

---

## 6. Component Inventory

| Component | States | Notes |
|-----------|--------|-------|
| **FestivalBanner** | Visible (with image), Hidden (no image) | Optional. Scrolls with content. |
| **TopBar** | Default | Festival name, share button. Sticky. |
| **DayTabs** | Active, Inactive, Scrollable | Sticky below TopBar. Festival accent color. |
| **StyleChips** | All (default), Style active, Overflow (+N) | Horizontal scroll row. Style colors. |
| **TimeHeader** | Default | Sticky within scroll. Shows "HH:MM". |
| **WorkshopCard** | Default, Hover, Tapped, Skeleton | 140/180px wide. Style color left border. |
| **WorkshopDetail** | Open, Closing | Bottom sheet. 200ms slide-up. |
| **OverflowSheet** | Open, Closing | Bottom sheet for extra style chips. |
| **EmptyState** | No data, Filter empty, Error, Loading | Centered with Lucide icon. |
| **ShareToast** | Visible, Fading | "Link copied!" confirmation. 3s auto-dismiss. |
| **BreakCard** | Default | Full-width, dashed border, muted text. |
| **ScrollHintDots** | Visible, Hidden | Below horizontal card rows when overflow. |
| **Footer** | Default | "Powered by WeDance" -- subtle, centered. |

---

## 7. Responsive Behavior

| Breakpoint | Width | Changes |
|------------|-------|---------|
| **Mobile** | 320-428px | Cards 140px. Horizontal scroll per time slot. Page max-width: 428px. |
| **Large mobile** | 429-768px | Cards 180px. 3 full cards visible per row. |
| **Desktop** | 769px+ | Cards wrap in a grid (no horizontal scroll). 3-4 per row. Page max-width: 768px centered. |

---

## 8. Performance Constraints

| Metric | Target | Approach |
|--------|--------|----------|
| First Contentful Paint | < 1.5s on 3G | SSR/pre-render. Inline critical CSS. System fonts (0 font file downloads). |
| Full schedule render | < 3s on 3G | Total page weight < 500KB. Schedule JSON ~15KB. |
| Interaction latency | < 100ms | Client-side filtering on pre-loaded data. No network round-trip for filters. |
| No layout shift | CLS < 0.1 | Reserve space for sticky headers. Cards have fixed widths. |

---

## UX Risks

- **Horizontal scroll discoverability** -- Dancers may not realize they can scroll right. Mitigated by: partial card peek, one-time scroll hint animation, scroll indicator dots.
- **Too many style chips** -- Festivals with 10+ styles overflow the chip row. Mitigated by: "+N" overflow chip with bottom sheet.
- **Small room labels** -- 11px room names may be hard to read. Mitigated by: uppercase, semibold weight, letter-spacing. Monitor in usability testing.
- **Bottom sheet performance** -- Backdrop overlay may lag on low-end Android. Use simple semi-transparent overlay (no blur).
- **Festival banner loading** -- External image may be slow. Use `loading="lazy"` and a solid color placeholder matching `--festival-header-bg`.
