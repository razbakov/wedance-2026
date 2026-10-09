---
title: "RAZ-158 follow-up: booking security, timezone, and validation hardening"
type: Task
id: RAZ-257
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-10-06T08:42:46.006Z
started: "2026-10-06T15:56:23.274Z"
completed: "2026-10-06T16:03:26.487Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/161"]
linear_url: https://linear.app/alosha/issue/RAZ-257/raz-158-follow-up-booking-security-timezone-and-validation-hardening
exported: 2026-10-09
---

# RAZ-257 — RAZ-158 follow-up: booking security, timezone, and validation hardening

Follow-up from PR [https://github.com/razbakov/wedance-2026/pull/152](<https://github.com/razbakov/wedance-2026/pull/152>) (RAZ-158 booking availability slots).

Bot reviewers (CodeRabbit + Codex Connector) flagged these improvements:

1. **Security — setAvailability is a publicProcedure** (server/trpc/routers/booking.ts:206): should be a protectedProcedure restricted to venue owners/stewards. Anyone can currently overwrite a space's availability.
2. **Timezone-dependent weekday calculation** (server/trpc/routers/booking.ts:\~145, app/components/AvailabilityCalendar.vue): `new Date(dateString).getDay()` shifts across midnight in non-UTC timezones. Should parse the date-only string in UTC to get a stable weekday.
3. **Time window enforcement missing** (server/trpc/routers/booking.ts:\~145): validation checks day-of-week but not start/end times. A Monday 18:00–23:00 slot currently accepts a Monday 09:00 booking.
4. **Clock time validation** (server/trpc/routers/booking.ts:\~78): the HH:MM regex accepts impossible values like 29:99.
5. **Slot replacement atomicity** (server/trpc/routers/booking.ts:\~93): delete-then-insert should be wrapped in a transaction to avoid losing slots on insert failure.

## Links

- [fix(booking): harden security, timezone, and validation for availability slots](https://github.com/razbakov/wedance-2026/pull/161)

## Comments

### Linear · 2026-10-06 15:56 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:03 UTC

### ✅ Done — Booking security, timezone, and validation hardened

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/161

Nothing to try — internal change (Backend security and validation hardening — no user-visible UI change).
