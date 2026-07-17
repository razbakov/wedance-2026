---
title: "Artist's Events"
type: Story
id: WED-161
p: E809
source_github: "razbakov/wedance-2026#61"
linear_url: https://linear.app/wedance/issue/WED-161
audience: Artist
cuj: "C5 — Pro — Take the stage / get booked (artists, gigs)"
jtbd: "J5 — Get discovered and booked as an artist"
status: partial
wsjf_business_value: 5
wsjf_time_criticality: 3
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 3.67
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#61](https://github.com/razbakov/wedance-2026/issues/61) · tracked in Linear **WED-161** (https://linear.app/wedance/issue/WED-161).

**Original title:** Events on artist profiles — surface an artist's events on their /@handle

## Tension
Events now store their artists (names or @handles) and link to /@handle, and events show on the venue profile + city 'What's on'. But an artist's own profile doesn't yet list the events they're part of — the Commander's third surface.

## Driver
Complete the cross-surfacing: venue ✓ · city ✓ · artist ✗. An artist page should show every event that lists them.

## Requirement
- Artists as unified /@handle profiles (type=artist) — depends on #55.
- A reverse query: events where `artists` contains the artist's handle/name.
- An 'Events' section on the artist profile listing them (linking to the venue).
- Ideally match by @handle (stable) with a name fallback.

## Response Options
1. Store artist @handles on events; query events by handle for the artist page (recommended once artist profiles exist).
2. Free-text names only (weaker linking).

Depends on: #55 (unified profiles). Part of the calendar/events work in #59.
