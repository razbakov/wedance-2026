# User Story: View Festival Schedule

**Requirement:** Operations/Backlog/001_Build_Interactive_Schedule_MVP.md
**Priority:** High
**Status:** Done

## Story
As a dancer attending a festival, I want to see the full workshop schedule with time, room, dance style, and artist so that I can decide which workshops to attend.

## Acceptance Criteria
- [ ] Schedule displays all workshops for the festival, grouped by day
- [ ] Each workshop entry shows: name, artist/teacher, time (start–end), room, and dance style
- [ ] Workshops are sorted chronologically within each day
- [ ] Concurrent workshops (same time slot, different rooms) are visually distinguishable
- [ ] The schedule loads in under 3 seconds on a 3G connection
- [ ] An empty state is shown if no schedule data is available yet

## Scope
**In scope:**
- Read-only schedule view
- Multi-day festival support (day tabs or sections)
- Workshop data: name, artist, time, room, dance style
- Static data (no real-time updates needed for MVP)

**Out of scope:**
- Editing or uploading schedule data (separate operations task)
- Personal plan / bookmarking workshops (v1.1)
- User accounts or login
- Push notifications for upcoming workshops

## Dependencies
- Schedule data format defined (JSON schema or equivalent)
- At least one real festival schedule converted to structured data (Operations item 002)

## Notes
- This is the core story — all other MVP stories (filter, share, mobile) build on this view.
- The data model should support the fields needed for filtering (style, day) even if filters are built separately.
- Consider a timetable/grid layout (rooms as columns, time as rows) vs. a list layout. Both should be evaluated against the "better than a photo of the schedule" bar.
- ⚠️ ASSUMPTION: Schedule data will be manually entered or imported before launch — no self-serve upload for MVP. Needs Alex's confirmation on data format.

## Delivered (2026-04-04)
- Schedule view implemented in `app/pages/index.vue`
- Workshops grouped by day with chronological sorting
- Workshop cards show name, artist, time, room, and dance style (`WorkshopCard.vue`)
- Multi-day support with day sections and date labels
- Mock Rovinj data loaded (30 workshops across 4 days)
- Deployed to https://app-wedance.vercel.app
