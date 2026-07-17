---
title: "Booking Engine"
type: Story
id: WED-158
p: E806
source_github: "razbakov/wedance-2026#56"
linear_url: https://linear.app/wedance/issue/WED-158
audience: Organizer
cuj: "C6 — Host — Private event & venue"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 8
wsjf: 2.25
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#56](https://github.com/razbakov/wedance-2026/issues/56) · tracked in Linear **WED-158** (https://linear.app/wedance/issue/WED-158).

**Original title:** Booking subsystem for professional profiles (venues/artists)

## Tension
Pro profiles (venues especially) have no way to be booked. Organizers can't find/request space.

## Driver
Turns WeDance into infrastructure for organizers, not just dancers. Depends on unified profiles.

## Requirement
- `bookable_spaces` (a profile offers N areas: capacity, floor type, price/inquiry, photos).
- `availability` (slots/calendar).
- `booking_requests` (organizer→venue: date, area, headcount, message, status).
- T&C accepted at request time (#57). Connector model first (no payments held).

## Response Options
1. Connector MVP (no payment) — recommended first.
2. Payments/deposits — bigger + regulated, later.

Depends on: unify-profiles. Plan: 2026-07-07-unified-profiles-booking-plan.md
