# Sprint 1 — MVP Meneate Viena

**Goal:** A dancer landing on the Meneate Viena page can sign up, see activities, and join a group dinner.

**Dates:** 2026-03-21 → 2026-03-25 (5 days)
**Festival:** Meneate Viena, 2026-03-26
**Board:** https://github.com/users/razbakov/projects/2
**Milestone:** [MVP — Meneate Viena](https://github.com/razbakov/festival-schedule/milestone/1)

## Sprint Backlog (9 pts)

| # | Story | Pts | Labels | Issue |
|---|-------|-----|--------|-------|
| 1.1 | See festival name, dates, location, and hero image | 1 | epic:landing | [#11](https://github.com/razbakov/festival-schedule/issues/11) |
| 2.1 | Sign up with name, email, dance styles, role, and city | 3 | epic:signup | [#14](https://github.com/razbakov/festival-schedule/issues/14) |
| 1.2 | See activity cards with participant counts | 2 | epic:landing | [#12](https://github.com/razbakov/festival-schedule/issues/12) |
| 5.1 | Sign up for a group dinner on a specific evening | 2 | epic:dinner | [#17](https://github.com/razbakov/festival-schedule/issues/17) |
| 2.2 | See how many free spots are left | 1 | epic:signup | [#15](https://github.com/razbakov/festival-schedule/issues/15) |

## Already Done (3 pts)

| # | Story | Pts | Issue |
|---|-------|-----|-------|
| 5.2 | Get assigned to a dinner group of 4-6 people | 1 | [#18](https://github.com/razbakov/festival-schedule/issues/18) |
| 5.3 | Receive a chat link with dinner group | 1 | [#19](https://github.com/razbakov/festival-schedule/issues/19) |
| 5.4 | Receive restaurant name and address on dinner day | 1 | [#20](https://github.com/razbakov/festival-schedule/issues/20) |

## Deferred

| # | Story | Pts | Why |
|---|-------|-----|-----|
| 1.3 | Social proof (names/styles) | 3 | Not essential with 10-30 dancers at pilot |
| 2.3 | EUR 1 Stripe payment | 2 | Keep it free for pilot — validate first |

## Critical Path

```
2.1 Sign-up form (schema migration + auth)
 └─► 1.2 Activity cards (wire composable to tRPC)
      ├─► 5.1 Dinner sign-up (same wiring)
      └─► 2.2 Spot counter (UI on top of 1.2)
1.1 Festival hero (independent, verify mock data)
```

## Definition of Done

- [ ] Festival page is live and shareable as a URL
- [ ] A dancer can sign up and join a dinner in under 60 seconds
- [ ] Admin can assign groups and send chat links
- [ ] All changes deployed to Vercel

## Hypothesis

> If we provide a group dinner sign-up on the festival page, then solo festival dancers will sign up and attend, reducing the "eating alone" problem.

**Success criteria:** 10+ dancers sign up, 50%+ attend the dinner.
