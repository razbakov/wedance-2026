---
title: "Share as Invite"
type: Story
id: P723
page: /organizers
audience: Organizer
p: P723
cuj: "C7 — Organizer — Run a festival (list, ticket, insights)"
jtbd: "J6 — Run a great event / throw a great night"
status: partial
wsjf_business_value: 8
wsjf_time_criticality: 3
wsjf_risk_opportunity: 5
wsjf_job_size: 3
wsjf: 5.3
source: "Plan sharing — Dancers share their festival plan; every share is a personalized invitation."
linear: RAZ-37
linear_state: Done
linear_closed: 2026-10-06T14:21:53.760Z
linear_prs: ["https://github.com/razbakov/wedance-2026/pull/158"]
linear_url: https://linear.app/alosha/issue/RAZ-37/share-as-invite
---

As an organizer, I want dancers to share their festival plans, so that each share becomes a personal invitation that brings their friends to my event.

## Acceptance Criteria
- A dancer can share their festival plan with others.
- A shared plan shows which festival and workshops the dancer chose.
- Someone who opens a shared plan can sign up and build their own plan for the same festival.
- The organizers toolkit lists plan sharing as an included feature.

## Linear history — RAZ-37 (Done, 2026-10-06)

Archived from https://linear.app/alosha/issue/RAZ-37/share-as-invite on 2026-10-09.

<details><summary>Description as it stood in Linear</summary>

As an organizer, I want dancers to share their festival plans, so that each share becomes a personal invitation that brings their friends to my event.

## Acceptance Criteria

* A dancer can share their festival plan with others.
* A shared plan shows which festival and workshops the dancer chose.
* Someone who opens a shared plan can sign up and build their own plan for the same festival.
* The organizers toolkit lists plan sharing as an included feature.

---

Promise P723 · page /organizers · audience Organizer · status **partial**
CUJ C7 — Organizer — Run a festival · JTBD J6 — Run a great event
WSJF 5.3 = (value 8 + time 3 + risk/opp 5) / size 3
Source: "Plan sharing — Dancers share their festival plan; every share is a personalized invitation."

</details>

### Links

- [feat: wire real plan data into share-as-invite flow](https://github.com/razbakov/wedance-2026/pull/158)

### Comments

#### Linear · 2026-10-06 14:08 UTC

This thread is for an agent session with forge.

#### ↳ reply · Forge · 2026-10-06 14:22 UTC

### ✅ Done — Share-as-invite now sends real plan data in the URL

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/158

**Try it**
1. Open a festival page on 2026.wedance.vip
2. Build a plan and click Share
3. You should see a share link with your real name and workshop selections encoded
