---
title: "Request a Date"
type: Story
id: P816
page: /venues
audience: Client
p: P816
cuj: "C6 — Host — Private event & venue"
jtbd: "J6 — Run a great event / throw a great night"
status: built
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 3
wsjf_job_size: 1
wsjf: 16.0
source: "Dance-ready venues across the network. Pick one and request a date directly."
linear: RAZ-135
linear_state: Done
linear_closed: 2026-10-08T15:03:46.529Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-135/request-a-date
---

As someone planning a dance event, I want to pick a dance-ready venue and request a date directly, so that I can secure a suitable space quickly.

## Acceptance Criteria
- The Venues page shows dance-ready venues from across the network.
- I can pick a venue to see its details.
- I can request a specific date directly from the venue's page.
- After I submit a request, I receive confirmation that it was sent to the venue.

## Linear history — RAZ-135 (Done, 2026-10-08)

Archived from https://linear.app/alosha/issue/RAZ-135/request-a-date on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As someone planning a dance event, I want to pick a dance-ready venue and request a date directly, so that I can secure a suitable space quickly.

## Acceptance Criteria

* The Venues page shows dance-ready venues from across the network.
* I can pick a venue to see its details.
* I can request a specific date directly from the venue's page.
* After I submit a request, I receive confirmation that it was sent to the venue.

---

Promise P816 · page /venues · audience Client · status **built**
CUJ C6 — Host — Private event & venue · JTBD J6 — Run a great event / throw a great night
WSJF 16.0 = (value 8 + time 5 + risk/opp 3) / size 1
Source: "Dance-ready venues across the network. Pick one and request a date directly."

</details>

### Comments

#### Linear · 2026-10-08 14:59 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-08 15:02 UTC

All acceptance criteria for RAZ-135 are verified as complete:

**AC 1 — Venues page shows dance-ready venues:** `/venues` (`app/pages/venues.vue:39-42`) renders `BookableVenuesSection` which fetches all visible venue profiles via `$trpc.entity.listVenues.query()` (`server/trpc/routers/entity.ts:14-26`).

**AC 2 — Pick a venue to see its details:** Each venue card links to `/@${v.username}` (`app/components/BookableVenuesSection.vue:41`), which resolves to the full profile page (`app/pages/@[handle].vue:38-49`) showing name, address, map, styles, socials, schedule, and bookable spaces.

**AC 3 — Request a specific date from the venue's page:** Two paths exist: (a) click any free cell on the `AvailabilityCalendar` (`app/components/AvailabilityCalendar.vue:112`) which pre-fills the date in the booking modal (`app/pages/@[handle].vue:124-127`), or (b) click the "Propose an event" button (`ap
