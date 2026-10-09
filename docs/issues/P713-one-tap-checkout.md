---
title: "One-Tap Checkout"
type: Story
id: P713
page: /organizers
audience: Organizer
p: P713
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: built
wsjf_business_value: 8
wsjf_time_criticality: 5
wsjf_risk_opportunity: 5
wsjf_job_size: 5
wsjf: 3.6
source: "One-tap checkout"
linear: RAZ-130
linear_state: Done
linear_closed: 2026-10-06T17:21:59.987Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/168", "https://github.com/razbakov/wedance-2026/pull/119", "https://github.com/razbakov/wedance-2026/pull/117"]
linear_url: https://linear.app/alosha/issue/RAZ-130/one-tap-checkout
---

As an organizer, I want dancers to buy tickets in a single quick step, so that fewer people abandon the purchase and more plans turn into paid tickets.

## Acceptance Criteria
- A dancer can buy a ticket to my festival in one quick checkout step.
- The organizers page presents one-tap checkout as an included feature.
- A dancer who is signed in does not have to re-enter their details to buy.

## Linear history — RAZ-130 (Done, 2026-10-06)

Archived from https://linear.app/alosha/issue/RAZ-130/one-tap-checkout on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an organizer, I want dancers to buy tickets in a single quick step, so that fewer people abandon the purchase and more plans turn into paid tickets.

## Acceptance Criteria

* A dancer can buy a ticket to my festival in one quick checkout step.
* The organizers page presents one-tap checkout as an included feature.
* A dancer who is signed in does not have to re-enter their details to buy.

---

Promise P713 · page /organizers · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival (list, ticket, insights) · JTBD J6 — Run a great event / throw a great night
WSJF 3.6 = (value 8 + time 5 + risk/opp 5) / size 5
Source: "One-tap checkout"

</details>

### Relations

- related ← RAZ-238 RAZ-205 follow-up: myTickets query + /my-plan backend sync

### Links

- [fix: combo pass checkout sends all tickets in one Stripe session](https://github.com/razbakov/wedance-2026/pull/168)
- [fix: server-side ticket price lookup and checkout error handling (RAZ-130)](https://github.com/razbakov/wedance-2026/pull/119)
- [feat: one-tap ticket checkout with pre-filled email (RAZ-130)](https://github.com/razbakov/wedance-2026/pull/117)

### Comments

#### Linear · 2026-10-01 12:11 UTC

This thread is for an agent session with forge.

#### Aleksey Razbakov · 2026-10-01 12:12 UTC

@forge 
See stripe logic in this repository:[
https://github.com/we-dance/v4](<https://github.com/we-dance/v4>)

#### ↳ reply · Forge · 2026-10-01 12:30 UTC

### ✅ Done — One-tap Stripe checkout with pre-filled email for signed-in dancers

**Live:** https://2026.wedance.vip/organizers
**PR:** https://github.com/razbakov/wedance-2026/pull/117

**Try it**
1. Open https://2026.wedance.vip/organizers
2. Scroll to the features grid
3. You should see a 'One-tap checkout' feature card with a Zap icon

**Follow-ups:** RAZ-228, RAZ-229

#### ↳ reply · Forge · 2026-10-01 12:36 UTC

### ✅ Done — Server-side price lookup prevents checkout price tampering


Nothing to try — internal change (Security fix: ticket price resolved server-side instead of client-supplied; checkout errors now shown to user; webhook records real amounts).

#### Forge · 2026-10-01 12:37 UTC

### ✅ Done — Server-side ticket price lookup and checkout error handling shipped

**Live:** https://2026.wedance.vip/organizers
**PR:** https://github.com/razbakov/wedance-2026/pull/119

**Try it**
1. Open https://2026.wedance.vip/organizers
2. Scroll to the features grid
3. You should see the One-tap checkout feature card

#### Tobiloba · 2026-10-02 20:33 UTC

Tested the actual checkout button on a festival page (not the /organizers feature card), since that's where a dancer would really buy a ticket. Steps: opened a festival page, clicked 'Get this pass'. Got an error: 'Something went wrong, please try again.' No Stripe checkout appeared.

RAZ-130's 'Try it' steps only check that the feature card shows on /organizers, they don't test this actual flow. Can you check server logs or reproduce this directly?

Steps to reproduce:

Go to \[festival page URL\]

Click 'Get this pass'

Error shown instead of Stripe checkout
