# User Story: Filter Schedule by Day and Time

**Requirement:** Operations/Backlog/001_Build_Interactive_Schedule_MVP.md
**Priority:** High
**Status:** In Progress

## Story
As a dancer attending a multi-day festival, I want to filter the schedule by day and time slot so that I can focus on what is happening now or during a specific part of the festival.

## Acceptance Criteria
- [ ] The schedule supports switching between days (e.g., Friday / Saturday / Sunday tabs or segments)
- [ ] The currently selected day is visually highlighted
- [ ] A time-of-day filter allows narrowing to morning, afternoon, or evening workshops
- [ ] Time-of-day boundaries are: Morning (before 13:00), Afternoon (13:00-18:00), Evening (after 18:00)
- [ ] Combining day + time-of-day shows only workshops matching both criteria
- [ ] A "Now" shortcut highlights or scrolls to the current time slot during the festival (based on device local time)
- [ ] The default view on festival days shows the current day; before the festival starts it shows the first day
- [ ] Filter interaction works without page reload (client-side)

## Scope
**In scope:**
- Day selector (one day at a time)
- Time-of-day filter (Morning / Afternoon / Evening)
- "Now" indicator or shortcut during live festival days
- Works on both mobile and desktop views

**Out of scope:**
- Arbitrary time range picker (too complex for MVP)
- Timezone selection (assume festival local time; device time for "Now")
- Calendar integration (export to Google Calendar, iCal) -- potential v1.1 feature

## Dependencies
- Story 005 (View Festival Schedule) must be built first
- Schedule data model includes date and start/end time per workshop

## Notes
- Day switching may already be partially addressed in Story 005's "multi-day support" acceptance criteria. This story adds the time-of-day sub-filter and the "Now" shortcut, which are distinct functionality.
- The "Now" shortcut is high value during the festival itself -- dancers pull out their phone and want to see "what's happening right now" without scrolling through past workshops.
- Time-of-day boundaries (Morning/Afternoon/Evening) are a simplification. If festivals commonly have workshops starting at 10:00, 14:00, and 21:00, these buckets map naturally. Adjust boundaries if pilot data suggests otherwise.

## Progress (2026-04-04)
- Day filter implemented in `ScheduleFilters.vue` with toggle buttons per day
- Day switching tracked via `trackDaySwitched` analytics event
- Remaining: time-of-day sub-filter (Morning/Afternoon/Evening) not yet implemented
- Remaining: "Now" shortcut not yet implemented
