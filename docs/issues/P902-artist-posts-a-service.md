---
title: "Offer a Service"
type: Story
id: P902
page: /gigs
audience: Artist
p: P902
cuj: "C5 — Pro — Take the stage / get booked (artists, gigs)"
jtbd: "J5 — Get discovered and booked as an artist"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 3
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 4.7
source: "Offering — artist posts a service"
linear: RAZ-148
linear_state: Done
linear_closed: 2026-10-05T20:08:57.571Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-148/offer-a-service
---

As an artist, I want to post a service marked "Offering", so that organizers know what I do and can hire me.

## Acceptance Criteria
- I can create a gig listing labelled "Offering".
- The listing shows my service, my style, and how to reach me.
- Organizers can see my listing on the Gigs board and contact me.
- My "Offering" listing is visually distinct from organizers' "Wanted" listings.

## Linear history — RAZ-148 (Done, 2026-10-05)

Archived from https://linear.app/alosha/issue/RAZ-148/offer-a-service on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an artist, I want to post a service marked "Offering", so that organizers know what I do and can hire me.

## Acceptance Criteria

* I can create a gig listing labelled "Offering".
* The listing shows my service, my style, and how to reach me.
* Organizers can see my listing on the Gigs board and contact me.
* My "Offering" listing is visually distinct from organizers' "Wanted" listings.

---

Promise P902 · page /gigs · audience Artist · status **partial**
CUJ C5 — Pro — Take the stage / get booked (artists, gigs) · JTBD J5 — Get discovered and booked as an artist
WSJF 4.7 = (value 8 + time 3 + risk/opp 3) / size 3
Source: "Offering — artist posts a service"

</details>

### Relations

- related ← RAZ-145 Get Booked

### Comments

#### Aleksey Razbakov · 2026-09-23 16:13 UTC

**Dispatched by autopilot — PR open.**

PR: https://github.com/razbakov/wedance-2026/pull/94
Branch: `razbakovaleksey/raz-148-offer-a-service` (5 files, +516/-44)

Adds a real `gigs` table, a tRPC gigs router (`list` / `getById` / `create` / `close`), swaps `/gigs` off mock data onto the API, and adds an authenticated create form. `kind: 'role' | 'offer'` carries the Wanted/Offering distinction; Offering renders a green badge against Wanted's red.

**Verified by the dispatcher:** PR exists, is OPEN, on the correct branch; diff touches `app/pages/gigs/index.vue`, `server/database/schema.ts`, `server/trpc/index.ts`, `server/trpc/routers/gigs.ts`, `server/database/migrations/0017_gigs_table.sql`.

**For Architect at the merge gate:**
- **This PR carries a schema migration** (`0017_gigs_table.sql`). Inspected: it is a pure additive `CREATE TABLE "gigs"` with no `DROP` or `ALTER` of existing objects, so a git revert leaves no orphaned destructive change. On the reserved-class test ("would a revert undo it?") this reads as **not** reserved — but it does mean the merge needs the migration actually applied, which is a deploy step beyond the code landing.
- **Deploy (check 6) is not discharged.** The agent reported an HTTP 200 from the preview, but WeDance previews return 200 *with a login page* behind Vercel protection — per `wedance-preview-behind-vercel-protection.md` that is blocked, not passing. Nobody has seen this render.
- The `/gigs` page moves from mock data to live API. Worth confirming the board is not empty on first load with no seeded rows.

Issue stays **In Progress**. The dispatcher does not merge.

#### Aleksey Razbakov · 2026-09-28 14:42 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/94 merged by razbakov at 2026-09-24T06:06:11Z outside the gate — no merge record; flagged for Trinity's audit.

#### Tobiloba · 2026-09-30 13:16 UTC

Same useTRPC error also breaks [RAZ-148](https://linear.app/alosha/issue/RAZ-148/offer-a-service) (Offering listings). Confirmed on the live /gigs page.

#### Linear · 2026-10-01 11:12 UTC

This thread is for an agent session with forge.

#### Tobiloba · 2026-10-05 15:48 UTC

Tested on the live site and all four acceptance criteria pass. /gigs loads without the useTRPC error, and I can create an "Offering" listing that shows my service, style and contact details. It's visible on the Gigs board and clearly displays "offering"
