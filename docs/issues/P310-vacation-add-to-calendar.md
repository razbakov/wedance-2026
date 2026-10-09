---
title: "Book Vacation"
type: Story
id: P310
page: /my-plan
audience: Traveler
p: P310
cuj: "C4 — Traveler — Plan your festival year (festivals, tickets, travel)"
jtbd: "J4 — Plan and afford my dance travel"
status: partial
wsjf_business_value: 5
wsjf_time_criticality: 5
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 4.3
source: "Vacation — Add to calendar (book vacation from work)"
linear: RAZ-104
linear_state: Done
linear_closed: 2026-10-05T20:17:44.557Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-104/book-vacation
---

As a traveling dancer, I want to add a festival's dates to my calendar, so that I can book time off work and protect the trip.

## Acceptance Criteria
- Each festival on my plan shows an "Add to calendar" action.
- Selecting it produces a calendar entry covering the festival's start and end dates.
- The entry includes the festival name and location.
- I can save the entry to my own calendar app.
- Festivals already added show as added on my plan.

## Linear history — RAZ-104 (Done, 2026-10-05)

Archived from https://linear.app/alosha/issue/RAZ-104/book-vacation on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As a traveling dancer, I want to add a festival's dates to my calendar, so that I can book time off work and protect the trip.

## Acceptance Criteria

* Each festival on my plan shows an "Add to calendar" action.
* Selecting it produces a calendar entry covering the festival's start and end dates.
* The entry includes the festival name and location.
* I can save the entry to my own calendar app.
* Festivals already added show as added on my plan.

---

Promise P310 · page /my-plan · audience Traveler · status **partial**
CUJ C4 — Traveler — Plan your festival year (festivals, tickets, travel) · JTBD J4 — Plan and afford my dance travel
WSJF 4.3 = (value 5 + time 5 + risk/opp 3) / size 3
Source: "Vacation — Add to calendar (book vacation from work)"

</details>

### Comments

#### Aleksey Razbakov · 2026-09-29 17:51 UTC

Dispatcher: **no PR was opened, because the feature is already on main.** Routed Matrix → Neo. Neo checked main before building anything and found every criterion already met. The dispatcher confirmed the citations against origin/main 7ee41b2:
- "Add to calendar" action → `app/pages/my-plan.vue:450`: `{ label: 'Add to calendar', href: gcalLink(f), external: true }`
- Start–end entry with name and location → `gcalLink()` at `my-plan.vue:376`. It builds a Google Calendar template and sets the end to end+1 day.
- Save to own calendar → it opens Google Calendar in a new tab. There is no .ics download, so Apple and Outlook users would need one if that matters.
- Already-added state → the `vacationBooked` track (`:442-452`) shows "On the calendar".

**Needs your call:** if Google Calendar is enough, close RAZ-104 as already delivered. If .ics or other calendar apps are required, name that gap and it can be re-dispatched.

Moving to **Backlog** (no PR to gate). It does not go back to Todo.

#### Linear · 2026-10-05 20:16 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-05 20:17 UTC

Now I have a complete picture. The feature is fully implemented on main. Let me verify against each acceptance criterion:

1. **"Each festival on my plan shows an 'Add to calendar' action"** — `my-plan.vue:620`: `action: p.vacationBooked ? null : { label: 'Add to calendar', href: gcalLink(f), external: true }`
2. **"Selecting it produces a calendar entry covering the festival's start and end dates"** — `my-plan.vue:546-554`: `gcalLink()` builds a Google Calendar URL with `dates=${start}/${endStr}` (end+1 for all-day exclusivity)
3. **"The entry includes the festival name and location"** — `my-plan.vue:551-553`: title = `Vacation · ${f.name}`, location = `${f.venue}, ${f.location}`
4. **"I can save the entry to my own calendar app"** — Opens Google Calendar in a new tab where the user saves it. No .ics download, so this is Google Calendar only.
5. **"Festivals already added show as added
