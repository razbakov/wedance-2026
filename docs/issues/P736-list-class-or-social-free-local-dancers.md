---
title: "List Your Social"
type: Story
id: P736
page: /cities
audience: Organizer
p: P736
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 5
wsjf_time_criticality: 5
wsjf_risk_opportunity: 3
wsjf_job_size: 3
wsjf: 4.3
source: "Run a class or a weekly social? List your event for free. Local dancers find you."
linear: RAZ-126
linear_state: Done
linear_closed: 2026-09-28T14:42:16.041Z
linear_prs: []
linear_url: https://linear.app/alosha/issue/RAZ-126/list-your-social
---

As an organizer of a class or weekly social, I want to list my event for free, so that local dancers can find me.

## Acceptance Criteria
- The Cities page shows an organizer call to action to list a class or weekly social.
- The call to action states listing is free.
- I can start creating an event listing from this call to action.
- Once listed, my event appears in its city so local dancers can find it.

## Linear history — RAZ-126 (Done, 2026-09-28)

Archived from https://linear.app/alosha/issue/RAZ-126/list-your-social on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an organizer of a class or weekly social, I want to list my event for free, so that local dancers can find me.

## Acceptance Criteria

* The Cities page shows an organizer call to action to list a class or weekly social.
* The call to action states listing is free.
* I can start creating an event listing from this call to action.
* Once listed, my event appears in its city so local dancers can find it.

---

Promise P736 · page /cities · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival (list, ticket, insights) · JTBD J6 — Run a great event / throw a great night
WSJF 4.3 = (value 5 + time 5 + risk/opp 3) / size 3
Source: "Run a class or a weekly social? List your event for free. Local dancers find you."

</details>

### Relations

- related ← RAZ-162 One Events Feed
- related ← RAZ-155 Erase My Account
- related ← RAZ-156 Group Directory
- related ← RAZ-203 wedance-2026: main is broken — Vercel build fails on Button.vue
- related ← RAZ-97 Pick Workshops

### Comments

#### Aleksey Razbakov · 2026-09-24 20:45 UTC

Dispatcher: PR opened — https://github.com/razbakov/wedance-2026/pull/99 (branch `razbakovaleksey/raz-126-list-your-social`). Cities CTA now reads "Create listing" and routes to `/organizers/create` (route exists on main).

**Not merge-ready — verified by the dispatcher, contradicting the agent's report:**
- **Vercel deployment FAILED** (the agent reported "build successful"; it was not). Likely cause: the PR adds a stray `yarn.lock` (6.6k lines) and `typescript ^7.0.2` to `package.json` in a repo that uses `bun.lockb` — both are unrelated to the issue and should be dropped.
- AC4 ("once listed, my event appears in its city") is not addressed or verified in the PR.
- No preview verification possible yet (no successful deploy; previews are also behind Vercel SSO).

Left In Progress for fix-up before the merge gate.

#### Aleksey Razbakov · 2026-09-28 14:41 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/99 merged by razbakov at 2026-09-26T11:24:27Z outside the gate. There is no merge record, so this is flagged for Trinity's audit.

⚠️ This merge commit (478c837) is where production breaks. The Vercel production build on main has failed since then with `[@vue/compiler-sfc] Failed to resolve extends base type` in app/components/ui/button/Button.vue (dpl_Gp5HbCrLMqexhBdxg5yVPXTXdECn). The previous commit, 69dca2b, is the last green one. The PR merged the stray `yarn.lock` and `typescript ^7.0.2` bump flagged in the dispatcher comment above. This change was therefore never deployed; 2026.wedance.vip still serves the 69dca2b build. The breakage is tracked in RAZ-203.
