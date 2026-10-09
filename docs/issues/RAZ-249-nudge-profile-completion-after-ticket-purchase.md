---
title: "Nudge profile completion after ticket purchase"
type: Task
id: RAZ-249
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["cuj:C8"]
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-04T10:32:37.329Z
started: "2026-10-06T16:30:50.634Z"
completed: "2026-10-06T16:38:24.567Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/163"]
linear_url: https://linear.app/alosha/issue/RAZ-249/nudge-profile-completion-after-ticket-purchase
exported: 2026-10-09
---

# RAZ-249 — Nudge profile completion after ticket purchase

**Tension:** A user can buy a festival ticket without completing onboarding (dance styles, role, city). Their festival experience (matching, socials, ride-sharing) depends on this data, but there is no post-payment prompt to complete it.

**Driver:** The signup flow gates checkout behind auth (user must be signed in), but a user who skipped onboarding after registration has an empty profile. Festival features that rely on profile data silently degrade.

**Requirement:**

* After a successful ticket purchase, if the user's profile is incomplete (missing dance styles, role, or city), prompt them to complete it
* The nudge should feel like part of the purchase flow, not a separate ask
* If profile is already complete, skip the nudge

**Response Options:**

1. Post-payment modal: "One more step — tell us your dance styles so we can match you with the right people"
2. Redirect to `/onboarding` with a `?from=checkout` param that shows a tailored message
3. In-page expandable section on the success confirmation (if that exists by then)

Follow-up from RAZ-205.

## Relations

- related → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap

## Links

- [Nudge profile completion after ticket purchase](https://github.com/razbakov/wedance-2026/pull/163)

## Comments

### Linear · 2026-10-06 16:30 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:38 UTC

### ✅ Done — Post-purchase nudge prompts incomplete profiles to add dance styles

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/163

**Try it**
1. Open https://2026.wedance.vip
2. Buy a festival ticket (with an incomplete profile)
3. After payment confirmation, you should see a modal asking for your dance styles and role
