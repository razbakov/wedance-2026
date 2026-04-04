# Feature Brief: Festival Schedule MVP -- Designer

**Date:** 2026-04-04
**From:** Product Lead
**To:** Designer
**Status:** Ready for design

## Context

WeDance is validating whether dancers will use an interactive festival schedule instead of a static image (photo/PDF). This is the first product experiment (Experiment 002, B2C pilot). The Designer needs to produce mobile-first wireframes for three areas: the schedule view, filter interaction, and share flow.

The benchmark is "better than a photo of the schedule posted in WhatsApp." A photo loads instantly, can be pinched to zoom, and works offline. Our interactive schedule must beat it on scannability, filtering, and shareability -- while matching it on speed and simplicity.

## Target Users

**Primary:** Dancers attending a multi-day festival (salsa, bachata, kizomba). Age 25-45, using smartphones (70% iOS, 30% Android based on dance community demographics). They check the schedule between dances, during breaks, or the night before to plan the next day.

**Context of use:**
- Standing in a crowded venue, holding a phone one-handed
- Poor Wi-Fi, potentially slow cellular connection
- Quick glances (5-15 seconds), not long browsing sessions
- Often comparing "what's on now" vs. "what's next"

## Area 1: Schedule View

### What it shows
A festival workshop schedule with these data fields per entry:
- Workshop name
- Artist / teacher name(s)
- Time (start - end)
- Room / location
- Dance style

Workshops are grouped by day (multi-day festivals typically run Friday through Sunday).

### Layout requirements

**Mobile (primary, <768px):**
- Vertical list layout, grouped by time slot
- Each time slot is a horizontal row header; workshops within that slot are listed below it
- Concurrent workshops (same time, different rooms) are visually grouped under the same time header
- Day selector at the top (tabs or segmented control)
- The current time slot should be visually emphasized during the festival ("Now" indicator)

**Desktop (>=768px):**
- Timetable grid layout is acceptable: rooms as columns, time slots as rows
- Day selector remains at the top

### Design constraints
- No horizontal scrolling on mobile
- Minimum 16px body text
- Minimum 44x44px tap targets
- Must work without JavaScript for initial render (progressive enhancement preferred, but not required for MVP)
- Total page weight target: under 500KB

### Key question for the Designer
How do we show concurrent workshops (3-4 happening at the same time in different rooms) on a mobile screen in a way that is scannable at a glance? The list approach risks long vertical scrolling. Consider:
- Collapsed time slots that expand on tap
- Swipeable cards within a time slot
- Compact card layout (2 columns of small cards per time slot)

Recommend one approach with a rationale.

## Area 2: Filter Interaction

### Style filter
- Displays all dance styles present in the festival schedule
- Multi-select: dancer can pick one or more styles
- Active filters are visible; clearing restores full schedule
- Filters persist when switching days

### Day and time filter
- Day selector: one day at a time (Friday / Saturday / Sunday)
- Time-of-day filter: Morning (before 13:00) / Afternoon (13:00-18:00) / Evening (after 18:00)
- "Now" shortcut: scrolls to or highlights the current time slot

### Design considerations
- Filters should be accessible without scrolling past the schedule content. Options: sticky top bar, collapsible filter drawer, or floating filter button.
- Filter state should be obvious. A dancer glancing at the screen should immediately know if filters are active and which ones.
- On mobile, screen real estate is scarce. The filter UI must be compact when collapsed and clear when expanded.
- When filters produce zero results, show a helpful empty state (not a blank page).

### Key question for the Designer
Where do filters live on mobile? Options:
1. **Sticky top bar** with horizontal scrollable chips (always visible, takes vertical space)
2. **Filter button** that opens a bottom sheet (saves space, but adds a tap)
3. **Collapsible section** above the schedule (compromise)

Recommend one approach. Consider: dancers filter once and browse, or do they change filters frequently?

## Area 3: Share Flow

### What happens when a dancer taps "Share"
1. On supported browsers (most mobile): the device native share sheet opens (Web Share API). The link includes the current festival schedule URL with any active filters encoded as query parameters.
2. On unsupported browsers: the link is copied to clipboard and a toast notification confirms "Link copied!"

### Share button placement
- Prominent but not intrusive. Should be visible on the schedule page without scrolling.
- Options: top-right icon in the header, floating action button, or inline in the day header.

### Design considerations
- The share link should include the current filter state so the recipient sees the same filtered view. This means the URL updates as filters change (no visual impact, but the Designer should know this when considering share placement relative to filters).
- When sharing to WhatsApp or Facebook, the link preview (Open Graph card) will show a title and description. This is a separate engineering task, but the Designer should know it exists -- the shared experience starts in the messaging app, not on our page.
- Consider a pre-filled share message suggestion: "Check out the [Festival Name] schedule!" -- editable by the dancer.

### Key question for the Designer
Should the share button be:
1. **Always visible** (header icon or FAB) -- easy to find, takes space
2. **Contextual** (appears after the dancer has scrolled or used a filter) -- assumes share intent comes after engagement

Recommend one approach.

## Deliverables Requested

1. **Mobile wireframes** (primary): Schedule list view with day selector, filter UI (expanded and collapsed states), share flow, and empty/error states.
2. **Desktop wireframes** (secondary): Schedule grid/timetable view with filter sidebar or top bar.
3. **Interaction notes**: How filters open/close, how the "Now" indicator works, how the share flow behaves.
4. **Recommendations** on the three key questions above (concurrent workshops layout, filter placement, share button placement) with brief rationale.

## What exists so far

- No designs yet. This is the first design pass.
- User stories 005-009 in `Operations/Backlog/` contain acceptance criteria and scope details.
- Requirement 002 (`Requirements_Mapping/Requirement_002_Festival_Schedule.md`) describes the full B2C experiment and success metrics.

## Timeline

Design wireframes are needed before engineering can start the MVP build. Target: wireframes delivered within 1 week of this brief. Engineering start is blocked on wireframes + pilot festival selection.

## Open questions (for Designer to address or escalate)

1. Should the schedule show artist photos or just names? (Photos add visual richness but increase page weight and require data we may not have.)
2. How prominent should the "last updated" timestamp be? (Dancers need to trust the schedule is current, especially if the organizer changes rooms.)
3. Is a "What's happening now?" landing state better than showing the full day? (Opinionated default vs. complete overview.)
