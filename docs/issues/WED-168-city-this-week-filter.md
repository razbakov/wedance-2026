---
title: "City This-Week Filter"
type: Story
id: WED-168
p: E811
linear_url: https://linear.app/wedance/issue/WED-168
audience: Dancer
cuj: "C3 — Regular — Find your floor (weekly socials, local scene)"
jtbd: "J3 — Never dance alone — go with people I know"
status: built
wsjf: TBD  # to score
origin: engineering-backlog (shipped 2026-07-18, commit 01d0282)
---

As a regular, I want a city's venues/organisers/artists to surface **who's active this week** first, so the city page reflects the living local floor instead of a static roster.

Shipped 2026-07-18 in [razbakov/wedance-2026@01d0282](https://github.com/razbakov/wedance-2026/commit/01d0282).

## What shipped
- City page (`/cities/[city]`): tabs reordered **Venues → Organisers → Artists** (Venues default).
- Each tab shows **only who has an event this week**, with a single "All &lt;city&gt; &lt;role&gt; →" link to the full directory.
- Moved `[city].vue` → `[city]/index.vue` so the listing pages are standalone.

## Fixes bundled
- This-week date-set timezone bug: use local `YYYY-MM-DD` instead of `toISOString`, which shifted every day back one in CEST.
- `TeacherProfile` "Full profile" link now uses the real `@handle` instead of slugifying the name (killed dead links like `@pinakothek-der-moderne-open-air`).

## Acceptance Criteria
- Opening a city shows venues/organisers/artists that have an event this week.
- A single link per tab opens the full directory.
- This-week membership is computed in local time (no CEST day-shift).

Enhancement over [P217 City Community](P217-find-your-citys-community.md) (WED-45). Not a landing-promise.
