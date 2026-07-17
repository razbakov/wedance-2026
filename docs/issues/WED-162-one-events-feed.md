---
title: "One Events Feed"
type: Story
id: WED-162
p: E810
source_github: "razbakov/wedance-2026#63"
linear_url: https://linear.app/wedance/issue/WED-162
audience: Regular
cuj: "C3 — Regular — Find your floor (weekly socials, local scene)"
jtbd: "J2 — Get better and keep momentum"
status: partial
wsjf_business_value: 5
wsjf_time_criticality: 5
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 4.33
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#63](https://github.com/razbakov/wedance-2026/issues/63) · tracked in Linear **WED-162** (https://linear.app/wedance/issue/WED-162).

**Original title:** Unify city events feed — merge booked events into 'This week' (remove duplicate 'What's on')

## Tension
The city page had two event feeds: **'This week'** (the city's recurring weekly socials, from mock/listing data) and **'What's on in Munich'** (dated events from the new booking system). Two lists = duplicate/redundant. Removed the standalone 'What's on' for now, but that hides the real booked events on the city page.

## Driver
One coherent city events feed. Booked events (real, dated, incl. future weeks) should appear alongside recurring socials in a single section.

## Requirement
- Merge booked events (booking.upcomingByCity) into the main city events section.
- Reconcile the two shapes: recurring weekly (CityEvent: day/time) vs dated bookings (eventDate/startTime). The weekly view is this-week-only; bookings can be weeks out — so likely evolve 'This week' into a dated 'Upcoming' feed, or add a week-nav.
- One section, no duplication; bookings link to their venue /@handle.

## Response Options
1. Evolve WeeklyCalendar/'This week' to accept dated events + merge bookings in (recommended).
2. Keep two clearly-distinct sections (weaker; the duplication complaint stands).

Context: booked events currently still show on the venue /@handle page + calendar. Part of the #62 events work.
