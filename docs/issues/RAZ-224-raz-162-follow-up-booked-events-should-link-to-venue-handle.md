---
title: "RAZ-162 follow-up: booked events should link to venue /@handle"
type: Task
id: RAZ-224
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-01T11:49:33.330Z
started: "2026-10-07T22:21:29.212Z"
completed: "2026-10-07T22:27:30.848Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/173"]
linear_url: https://linear.app/alosha/issue/RAZ-224/raz-162-follow-up-booked-events-should-link-to-venue-handle
exported: 2026-10-09
---

# RAZ-224 — RAZ-162 follow-up: booked events should link to venue /@handle

Requirement 3 asked bookings to link to their venue /@handle. Current implementation links UUID events to /events/<id> detail pages instead. File: app/components/WeeklyCalendar.vue:146-147. From PR [https://github.com/razbakov/wedance-2026/pull/89](<https://github.com/razbakov/wedance-2026/pull/89>)

## Links

- [fix: link booked events to venue /@handle instead of /events/<id>](https://github.com/razbakov/wedance-2026/pull/173)

## Comments

### Linear · 2026-10-07 22:21 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-07 22:27 UTC

### ✅ Done — Booked events now link to venue /@handle pages

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/173

**Try it**
1. Open https://2026.wedance.vip/cities/munich
2. Look at the weekly calendar or Coming Up section
3. You should see booked events linking to venue profiles (/@handle) instead of /events/<id>
