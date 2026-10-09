---
title: "Booking Engine"
type: Task
id: RAZ-158
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["from-github", "cuj:C6", "jtbd:J6", "aud:Organizer", "status:partial"]
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "Urgent"
estimate: null
parent: null
created: 2026-07-16T16:13:45.225Z
started: "2026-10-06T08:23:19.907Z"
completed: "2026-10-06T08:42:30.645Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/161", "https://github.com/razbakov/wedance-2026/pull/152"]
linear_url: https://linear.app/alosha/issue/RAZ-158/booking-engine
exported: 2026-10-09
---

# RAZ-158 — Booking Engine

> Migrated from GitHub [razbakov/wedance-2026#56](<https://github.com/razbakov/wedance-2026/issues/56>)

**Booking subsystem for professional profiles (venues/artists)**

## Tension

Pro profiles (venues especially) have no way to be booked. Organizers can't find/request space.

## Driver

Turns WeDance into infrastructure for organizers, not just dancers. Depends on unified profiles.

## Requirement

* `bookable_spaces` (a profile offers N areas: capacity, floor type, price/inquiry, photos).
* `availability` (slots/calendar).
* `booking_requests` (organizer→venue: date, area, headcount, message, status).
* T&C accepted at request time (#57). Connector model first (no payments held).

## Response Options

1. Connector MVP (no payment) — recommended first.
2. Payments/deposits — bigger + regulated, later.

Depends on: unify-profiles. Plan: 2026-07-07-unified-profiles-booking-plan.md

## Links

- [fix(booking): harden security, timezone, and validation for availability slots](https://github.com/razbakov/wedance-2026/pull/161)
- [feat(booking): venue-published availability slots (RAZ-158)](https://github.com/razbakov/wedance-2026/pull/152)

## Comments

### Aleksey Razbakov · 2026-07-18 11:37 UTC

**Progress 2026-07-18** — organiser↔booking link shipped in [razbakov/wedance-2026@01d0282](https://github.com/razbakov/wedance-2026/commit/01d0282):
- Nullable `organizer_id` FK on `booking_requests` (migration 0017).
- `booking.request` accepts `organizerHandle` → resolves to an organizer profile.
- `upcomingByCity` returns organiser + artists so the city page can match.
- Optional organiser field on the venue booking form.

Still **partial** — availability/calendar and payments/deposits remain (per Response Options).

### Aleksey Razbakov · 2026-09-29 17:51 UTC

Dispatcher: **no PR was opened, because the connector MVP is already on main.** Routed Matrix → Neo. The dispatcher checked these citations against origin/main 7ee41b2:
- `bookable_spaces` → `server/database/schema.ts:312`
- `booking_requests`, with `terms_accepted_at` → `schema.ts:327`, `:353`
- Unified `profiles` → `schema.ts:278`
- Router → `server/trpc/routers/booking.ts` (the agent reports that `request` validates termsAccepted at :129-134), plus a test file `entityBooking.test.ts`
- UI → `app/components/AvailabilityCalendar.vue`, used in `app/pages/@[handle].vue`; `app/pages/booking-terms.vue`
- There are no payments, so it follows the connector model.

**One possible gap:** there is no dedicated `availability` table. The calendar appears to come from the profile's event schedule (`scheduleForProfile`), not from bookable slots. If venues must be able to publish open slots, that is the remaining work.

**Correction to the agent's report:** it said main's build fails on Button.vue:9. That is false. main 7ee41b2 reports Vercel **success**, and the agent most likely built a stale local checkout.

**Needs your call:** close RAZ-158 as delivered, or re-scope it to "venue-published availability slots" and re-dispatch.

Moving to **Backlog** (no PR to gate). It does not go back to Todo.

### Linear · 2026-10-06 08:23 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 08:43 UTC

### ✅ Done — Venues can now publish weekly availability slots for booking

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/152

**Try it**
1. Open a venue profile page (e.g. https://2026.wedance.vip/@handle)
2. The availability calendar now shows greyed-out days when the venue has published hours
3. Booking requests on unavailable days are rejected

**Follow-ups:** RAZ-257
