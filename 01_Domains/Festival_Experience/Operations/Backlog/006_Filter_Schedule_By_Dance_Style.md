# User Story: Filter Schedule by Dance Style

**Requirement:** Operations/Backlog/001_Build_Interactive_Schedule_MVP.md
**Priority:** High
**Status:** Open

## Story
As a dancer attending a multi-style festival, I want to filter the workshop schedule by dance style so that I can quickly find workshops in the styles I dance and ignore the rest.

## Acceptance Criteria
- [ ] A filter control lists all dance styles present in the current festival's schedule
- [ ] Selecting one or more styles shows only workshops matching those styles; all others are hidden
- [ ] The filter defaults to "all styles" (no filter applied) on first load
- [ ] The active filter state is visible at all times (the dancer knows what is filtered)
- [ ] Clearing the filter restores the full schedule
- [ ] The filter state persists when switching between days (if multi-day view has day tabs)
- [ ] When a filter returns zero results for a day, a clear empty state is shown (e.g., "No bachata workshops on Friday")
- [ ] Filter interaction works without page reload (client-side)

## Scope
**In scope:**
- Multi-select style filter (e.g., Salsa AND Bachata simultaneously)
- Style labels derived from schedule data (no hardcoded list)
- Works on both mobile and desktop views

**Out of scope:**
- Combining style filter with other filters in a single UI (each filter operates independently for MVP; combined state is additive)
- Custom/saved filter presets
- Style taxonomy management (we use whatever the schedule data provides)

## Dependencies
- Story 005 (View Festival Schedule) must be built first -- this adds filtering on top of the base view
- Schedule data model includes a `style` field per workshop

## Notes
- Common dance styles at target festivals: Salsa (On1, On2, Cuban), Bachata (Sensual, Moderna, Dominicana), Kizomba, Zouk, Semba, Urban Kiz, Cha Cha Cha, Afro, Reggaeton, Lady Styling, Body Movement.
- Some festivals tag workshops with multiple styles (e.g., "Salsa/Cha Cha Cha combo"). The filter should match if ANY of the workshop's styles match the selected filter.
- The style filter is the highest-value filter because multi-style festivals are the norm and dancers typically focus on 1-2 styles. This is the primary differentiator over a static image schedule.
