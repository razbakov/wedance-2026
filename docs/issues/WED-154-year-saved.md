---
title: "Year, Saved"
type: Story
id: WED-154
p: E802
source_github: "razbakov/wedance-2026#47"
linear_url: https://linear.app/wedance/issue/WED-154
audience: Traveler
cuj: "C4 — Traveler — Plan your festival year (festivals, tickets, travel)"
jtbd: "J4 — Plan and afford my dance travel"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
origin: engineering-backlog (migrated from GitHub Issues 2026-07-16)
---

> Migrated from GitHub [razbakov/wedance-2026#47](https://github.com/razbakov/wedance-2026/issues/47) · tracked in Linear **WED-154** (https://linear.app/wedance/issue/WED-154).

**Original title:** Persist my-year (year-plan) server-side → festivals on profile + real 'friends going'

## Tension
`/my-year` and the my-plan festival layer are client-local (localStorage / mock `friendsGoing`). So a dancer's festival attendance can't be shown on their public profile, and the 'friends going' social proof can't link to real profiles — the marquee use case the profile was built for.

## Driver
The profile (#45/#46) is meant to be what 'friends going' links to. That needs festival attendance persisted per dancer server-side.

## Requirement
- A `dancer_festivals` table (dancerId, festivalSlug, role, ticketStatus…) + tRPC to add/remove/list.
- Migrate `useYearPlan` from localStorage to tRPC.
- Show a dancer's upcoming festivals on `/u/<username>`.
- Replace mock `friendsGoing` with real attendees linking to `/u/<username>`.

## Response Options
1. New table + move year-plan to backend (recommended).
2. Keep client-local, sync opportunistically (rejected — no cross-user visibility).

Blocks: festivals-on-profile, real friends-going links. Related: #45, #46.
