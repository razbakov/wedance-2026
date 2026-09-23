---
title: "Admin CMS"
type: Story
id: WED-170
p: E813
linear_url: https://linear.app/wedance/issue/WED-170
audience: Organizer
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: built
wsjf: TBD  # to score
origin: engineering-backlog (shipped 2026-07-18, commit 01d0282)
---

As an operator, I want an admin section to manage seeded/community content, so I can curate community groups, giveaways, videos, and festivals without direct DB edits.

Shipped 2026-07-18 in [razbakov/wedance-2026@01d0282](https://github.com/razbakov/wedance-2026/commit/01d0282).

## What shipped
- Admin layout (`app/layouts/admin.vue`) + `admin/{index,community-groups,giveaways,videos,festivals}` pages.
- Admin tRPC router + supporting router changes (communityGroup, giveaway).
- Giveaways surfaced as an admin-managed ad/lottery format (per the cities ad-format idea).

## Acceptance Criteria
- Admin can list/manage community groups, giveaways, videos, and festivals from a dedicated admin section.
- Actions are backed by the admin tRPC router.

Internal ops tooling. Not a landing-promise.
