---
title: "RAZ-162 follow-up: support beyond-this-week bookings in city events feed"
type: Task
id: RAZ-223
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
created: 2026-10-01T11:48:53.601Z
started: "2026-10-06T16:41:48.373Z"
completed: "2026-10-06T16:46:08.981Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/165"]
linear_url: https://linear.app/alosha/issue/RAZ-223/raz-162-follow-up-support-beyond-this-week-bookings-in-city-events
exported: 2026-10-09
---

# RAZ-223 — RAZ-162 follow-up: support beyond-this-week bookings in city events feed

WeeklyCalendar filters bookings to thisWeekDates only — events beyond the current week are dropped. The original requirement asked for bookings 'weeks out' via a dated Upcoming feed or week-nav. File: app/pages/cities/\[city\]/index.vue:70. From PR [https://github.com/razbakov/wedance-2026/pull/89](<https://github.com/razbakov/wedance-2026/pull/89>)

## Links

- [feat(city): include beyond-this-week bookings in upcoming events feed](https://github.com/razbakov/wedance-2026/pull/165)

## Comments

### Linear · 2026-10-06 16:41 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:46 UTC

### ✅ Done — Booked events beyond this week now show in Coming Up section

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/165

**Try it**
1. Open https://2026.wedance.vip/cities/munich
2. Scroll to the 'Coming up' section
3. You should see booked events from future weeks alongside synced events, sorted by date
