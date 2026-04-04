# Wireframes: Festival Schedule MVP

**Date:** 2026-04-04
**Status:** Draft for Kirill's review
**Story:** Operations/Backlog/005_View_Festival_Schedule.md

---

## Screen 1: Schedule Day View (Main Screen)

This is the primary screen. A dancer opens a shared link and lands here.

### Layout: Chronological List (recommended over grid -- see UI Spec for rationale)

```
+------------------------------------------+
|  FESTIVAL NAME                     [Share]|
|  City, Date Range                         |
+------------------------------------------+
|  [ Fri ]  [ SAT ]  [ Sun ]               |  <-- Day tabs, SAT is active
+------------------------------------------+
|  All | Salsa | Bachata | Kizomba | +3    |  <-- Style filter chips, horiz scroll
+------------------------------------------+
|                                           |
|  10:00                                    |  <-- Time header, sticky on scroll
|  +---------+  +---------+  +---------+   |
|  | ROOM A  |  | ROOM B  |  | ROOM C  |   |  <-- Horizontally scrollable cards
|  | Lady    |  | Bachata  |  | Kizomba |   |
|  | Styling |  | Sensual  |  | Fusion  |   |
|  | w/ Ana  |  | w/ Marco |  | w/ Yoko |   |
|  | 10:00-  |  | 10:00-  |  | 10:00-  |   |
|  | 11:30   |  | 11:30   |  | 11:30   |   |
|  |  Salsa  |  | Bachata |  | Kizomba |   |  <-- Style badge (colored)
|  +---------+  +---------+  +---------+   |
|                                           |
|  11:45                                    |  <-- Next time slot
|  +---------+  +---------+                 |
|  | ROOM A  |  | ROOM B  |                 |
|  | Partnerw|  | Bachata  |                 |
|  | ork     |  | Footwork |                 |
|  | w/ Juan |  | w/ Lisa  |                 |
|  | 11:45-  |  | 11:45-  |                 |
|  | 13:15   |  | 13:15   |                 |
|  |  Salsa  |  | Bachata |                 |
|  +---------+  +---------+                 |
|                                           |
|  13:15                                    |
|  +--------------------------------------+|
|  |          LUNCH BREAK                  ||
|  |          13:15 - 14:30                ||
|  +--------------------------------------+|
|                                           |
|  ...                                      |
|                                           |
+------------------------------------------+
|  WeDance                           v0.1  |  <-- Minimal footer
+------------------------------------------+
```

### Annotations

1. **Day tabs** -- The active day is visually emphasized (bold, underline or filled background). Tapping a tab reloads the schedule for that day. The current day is auto-selected when the festival is live.

2. **Style filter chips** -- Horizontal scroll row. "All" is selected by default. Tapping a style chip filters the visible workshops to only that style. Multiple selection is NOT supported in MVP (simplicity). The "+3" chip opens a small dropdown with remaining styles.

3. **Time header** -- Sticky: stays visible as the user scrolls within a time slot. Shows the start time of the slot in large text.

4. **Workshop cards** -- Each card shows:
   - Room name (top, muted/small)
   - Workshop name (primary, bold)
   - Artist/teacher name (secondary)
   - Time range (tertiary)
   - Dance style badge (bottom, colored chip)

5. **Concurrent workshops** -- Cards within the same time slot are arranged in a horizontal scroll row. This solves the "how to show parallel workshops" problem without a complex grid.

6. **Share button** -- Top right, always visible. See Screen 4.

7. **Empty state** -- If no workshops match the active filter: "No [Style] workshops on [Day]. Try another day or style." with a button to clear filters.

---

## Screen 2: Filter Interaction

Filters are inline, not a separate screen. This keeps the dancer in context.

### Day Tabs

```
+------------------------------------------+
|  [ Fri ]  [ SAT ]  [ Sun ]               |
+------------------------------------------+
```

- Horizontal row of day abbreviations.
- Active day: filled background, bold text.
- Inactive days: outlined, regular text.
- Tapping switches the entire schedule view.
- If festival spans 4+ days, tabs scroll horizontally.

### Style Chips

```
+------------------------------------------+
|  [All] [Salsa] [Bachata] [Kizomba] [+3]  |
+------------------------------------------+
```

- Horizontal scroll row below day tabs.
- "All" is the default selection (no filter).
- Active chip: filled background with the style's color.
- Inactive chips: outlined, muted.
- Tapping a chip = instant filter. The list below updates immediately (no page reload, no animation delay beyond a quick fade).
- The "+3" overflow chip: tapping opens a bottom sheet listing remaining styles. Tapping a style in the sheet selects it and closes the sheet.

### Overflow Bottom Sheet

```
+------------------------------------------+
|                                           |
|  (dimmed background)                      |
|                                           |
+------------------------------------------+
|  ____  (drag handle)                      |
|                                           |
|  More styles                              |
|                                           |
|  [ ] Cuban Salsa                          |
|  [ ] Semba                                |
|  [ ] Afro                                 |
|                                           |
+------------------------------------------+
```

- Half-screen bottom sheet.
- Tapping a style selects it, replaces "+3" with that style's chip, closes sheet.
- Swipe down to dismiss.

---

## Screen 3: Workshop Detail Card (Tap to Expand)

Tapping a workshop card in the schedule expands it inline or opens a bottom sheet (bottom sheet recommended for MVP -- less layout jank).

### Collapsed State (in schedule list)

```
+---------+
| ROOM A  |
| Lady    |
| Styling |
| w/ Ana  |
| 10-11:30|
|  Salsa  |
+---------+
```

### Expanded State (bottom sheet)

```
+------------------------------------------+
|                                           |
|  (dimmed background, tap to dismiss)      |
|                                           |
+------------------------------------------+
|  ____  (drag handle)                      |
|                                           |
|  Lady Styling                             |  <-- Workshop name, large
|  with Ana Garcia                          |  <-- Full artist name
|                                           |
|  SAT  10:00 - 11:30                       |  <-- Day + full time
|  Room A                                   |  <-- Room
|  Salsa                                    |  <-- Style badge (colored)
|                                           |
|  Level: Intermediate                      |  <-- If available in data
|                                           |
|  Description text if available. Most      |
|  festival schedules do not include        |
|  descriptions, so this field is optional  |
|  and should collapse gracefully when      |
|  empty.                                   |
|                                           |
|  [Share this workshop]                    |  <-- Secondary action
|                                           |
+------------------------------------------+
```

### Annotations

1. The bottom sheet appears with a slide-up animation (200ms ease-out).
2. Swipe down or tap dimmed background to dismiss.
3. If no description is available, the sheet is shorter -- no "Description: N/A" placeholder.
4. "Share this workshop" generates a deep link to the schedule with this workshop pre-highlighted (anchor or query param).
5. Future (v1.1): "Add to my plan" button would go here.

---

## Screen 4: Share Flow

### Share Button (top bar)

Tapping the share button in the top bar triggers the native Web Share API (on mobile) or shows a copy-link fallback (on desktop).

### Mobile: Native Share Sheet

```
Tap [Share] -->  Native OS share sheet appears
                 (Messages, WhatsApp, Telegram, Copy Link, etc.)
                 
                 Shared URL: wedance.vip/f/pilot-fest?day=sat&utm_source=share
```

### Desktop / Fallback: Copy Link

```
+------------------------------------------+
|  Link copied!                             |
|                                           |
|  wedance.vip/f/pilot-fest?day=sat         |
|                                           |
|  [Copy]  (already copied, shows check)    |
+------------------------------------------+
```

This is a small toast or inline popover near the share button.

### Link Preview (when shared in chat apps)

The shared URL should generate an Open Graph preview:

```
+------------------------------------------+
|  +------+                                 |
|  | OG   |  Festival Name - Saturday       |
|  | img  |  12 Salsa, 8 Bachata workshops  |
|  |      |  wedance.vip                    |
|  +------+                                 |
+------------------------------------------+
```

**OG meta tags required:**
- `og:title` -- "[Festival Name] - [Day] Schedule"
- `og:description` -- "[N] workshops: [Style1], [Style2], ..."
- `og:image` -- Festival banner or generated social card
- `og:url` -- Canonical URL with UTM stripped

### Annotations

1. UTM parameters (`utm_source=share`, `utm_medium=social`) are appended for analytics tracking but stripped from og:url.
2. The share URL preserves the current day tab so the recipient lands on the same day.
3. Workshop-level share (from detail card) adds `&ws=lady-styling` to deep-link to that specific workshop.

---

## Screen 5: Empty / Loading / Error States

### Loading

```
+------------------------------------------+
|  FESTIVAL NAME                     [Share]|
|  City, Date Range                         |
+------------------------------------------+
|  [ Fri ]  [ SAT ]  [ Sun ]               |
+------------------------------------------+
|                                           |
|  [skeleton]  [skeleton]  [skeleton]       |
|  [skeleton]  [skeleton]                   |
|  [skeleton]  [skeleton]  [skeleton]       |
|                                           |
+------------------------------------------+
```

Skeleton cards in the same layout as real cards. 3 seconds max (acceptance criteria).

### Empty (no schedule data)

```
+------------------------------------------+
|                                           |
|        (calendar icon)                    |
|                                           |
|  Schedule coming soon                     |
|  We are preparing the workshop            |
|  schedule for this festival.              |
|                                           |
+------------------------------------------+
```

### Error (network failure)

```
+------------------------------------------+
|                                           |
|        (warning icon)                     |
|                                           |
|  Could not load schedule                  |
|  Check your connection and try again.     |
|                                           |
|  [Retry]                                  |
|                                           |
+------------------------------------------+
```

### Filter Empty

```
+------------------------------------------+
|                                           |
|  No Kizomba workshops on Saturday.        |
|                                           |
|  [Show all styles]                        |
|                                           |
+------------------------------------------+
```
