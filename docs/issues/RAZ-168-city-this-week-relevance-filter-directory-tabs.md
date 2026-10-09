---
title: "City this-week relevance filter + directory tabs"
type: Task
id: RAZ-168
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["cuj:C3", "aud:Dancer", "jtbd:J3", "status:built", "Feature"]
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-07-18T11:36:31.955Z
started: "2026-10-05T16:15:55.207Z"
completed: "2026-10-09T09:23:36.584Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-168/city-this-week-relevance-filter-directory-tabs
exported: 2026-10-09
---

# RAZ-168 — City this-week relevance filter + directory tabs

As a regular, I want a city's venues/organisers/artists to surface **who's active this week** first, so the city page reflects the living local floor instead of a static roster.

Shipped 2026-07-18 in [razbakov/wedance-2026@01d0282](<https://github.com/razbakov/wedance-2026/commit/01d0282>).

## What shipped

* City page (`/cities/[city]`): tabs reordered **Venues → Organisers → Artists** (Venues default).
* Each tab shows **only who has an event this week**, with a single "All <city> <role> →" link to the full directory.
* Moved `[city].vue` → `[city]/index.vue` so listing pages are standalone.

## Fixes bundled

* This-week date-set timezone bug: use local `YYYY-MM-DD` instead of `toISOString`, which shifted every day back one in CEST.
* `TeacherProfile` "Full profile" link now uses the real `@handle` instead of slugifying the name (killed dead links like `@pinakothek-der-moderne-open-air`).

## Acceptance Criteria

* Opening a city shows venues/organisers/artists that have an event this week.
* A single link per tab opens the full directory.
* This-week membership is computed in local time (no CEST day-shift).

---

Enhancement over P217 City Community ([WED-45](https://linear.app/wedance/issue/WED-45/city-community)). Not a landing-promise. WSJF: to score.

## Relations

- related → RAZ-45 City Community
- related ← RAZ-71 Weekly Floor

## Comments

### Linear · 2026-10-09 09:17 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-09 09:19 UTC

### 👀 Ready for your review — Already shipped — all acceptance criteria met on main

**Live:** https://2026.wedance.vip/cities/munich

**Try it**
1. Open https://2026.wedance.vip/cities/munich
2. See Venues / Organisers / Artists tabs showing this-week active entries
3. Click 'All Munich venues →' to see the full directory
