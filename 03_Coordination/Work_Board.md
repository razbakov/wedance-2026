# WeDance -- Work Board

**Last updated:** 2026-04-04
**Maintained by:** Coordinator (Logbook Keeper)

> This board is the single source of truth for work status. Backlog files define *what* needs doing; this board tracks *where* each item stands.

## Rules

- **One agent, one item.** No agent works on two items simultaneously.
- **Pull, don't push.** Agents pull from Ready when dispatched -- delegators approve what moves to Ready.
- **WIP limit:** max 1 item per agent in "In Progress".
- **No file conflicts.** Never dispatch two agents to modify the same files. Split work by file/directory ownership.
- **Reference the board.** Every agent dispatch references a board item -- no ad-hoc tasks that bypass the backlog.

---

## Backlog

Prioritized items not yet ready to start (dependencies unmet or not yet approved).

| # | Item | Domain | Type | Assigned to | Blocked by |
|---|------|--------|------|-------------|------------|
| O-006 | Filter schedule by dance style | Festival Exp. | Operations | Engineer | Awaiting founder approval to Ready |
| O-007 | Filter schedule by day/time | Festival Exp. | Operations | Engineer | Awaiting founder approval to Ready |
| O-008 | Share schedule link with UTM | Festival Exp. | Operations | Engineer | Awaiting founder approval to Ready |
| O-009 | Mobile-optimized responsive view | Festival Exp. | Operations | Engineer | Awaiting founder approval to Ready |

## Ready

Dependencies met, approved by delegator, waiting for an agent to be dispatched.

| # | Item | Domain | Type | Assigned to | Approved by |
|---|------|--------|------|-------------|-------------|
| -- | -- | -- | -- | -- | -- |

## In Progress

Actively being worked on. Max 1 item per agent.

| # | Item | Domain | Type | Agent | Started | Delegator |
|---|------|--------|------|-------|---------|-----------|
| -- | -- | -- | -- | -- | -- | -- |

## In Review

Work delivered (PR or document), waiting for delegator review.

| # | Item | Domain | Type | Agent | PR / Deliverable | Reviewer |
|---|------|--------|------|-------|-------------------|----------|
| G-003 | Cookie consent + privacy page | Festival Exp. | Governance | Engineer | PR #18 (open on `auto-pilot-1`) | Alex |
| O-010 | Fix 14 P1 QA issues | Festival Exp. | Operations | Engineer | PR #19 (open on `auto-pilot-1`) | Alex |
| INTEG | Merge auto-pilot-1 to main | -- | Integration | -- | 3 sprints of work on `auto-pilot-1` branch | Alex |

## Done

Merged to `auto-pilot-1` branch (not yet on main -- see INTEG item above).

| # | Item | Domain | Type | Completed | Notes |
|---|------|--------|------|-----------|-------|
| G-001 | Define agent deployment plan | Festival Exp. | Governance | 2026-04-04 | Approved by Alex. Kirill consent pending. |
| G-002 | Select pilot festival | Festival Exp. | Governance | 2026-04-04 | Rovinj Summer Bachata 2026. PR #3 (research), PRs #8, #14 (outreach drafts). |
| O-001 | Build interactive schedule MVP | Festival Exp. | Operations | 2026-04-04 | Nuxt 3 app. PR #7 (scaffold), PR #17 (theming + share + now indicator), PR #20 (P0 QA fixes). |
| O-002 | Convert pilot schedule | Festival Exp. | Operations | 2026-04-04 | Rovinj mock schedule. PR #9. |
| O-003 | Launch distribution (drafts) | Festival Exp. | Operations | 2026-04-04 | Distribution playbook + Rovinj plan. PRs #4, #10. Awaiting actual launch (needs deployment). |
| O-004 | Set up experiment analytics | Festival Exp. | Operations | 2026-04-04 | PostHog integration + measurement plan + tracking verification. PRs #5, #11, #15. |
| O-005 | View festival schedule (story) | Festival Exp. | Operations | 2026-04-04 | Part of O-001. |
| D-001 | Wireframes + UI spec + design system | Festival Exp. | Design | 2026-04-04 | PRs #6, #12. |
| D-002 | Design QA report (sprint 2) | Festival Exp. | Design | 2026-04-04 | 28 issues found. PR #13. P0s fixed (PR #20). |
| P-001 | MVP stories + experiment brief | Festival Exp. | Product | 2026-04-04 | PRs #2, #16. |
| OPS-001 | Define schedule data format | Festival Exp. | Operations | 2026-04-04 | Schema + sample + template. PR #1. |

---

## Critical Path

```
[DONE] G-002 Select pilot festival (Rovinj Summer Bachata 2026)
  [DONE] O-001 Build MVP + O-004 Set up analytics
    [DONE] O-002 Convert schedule (Rovinj mock data loaded)
      [BLOCKED] O-003 Launch distribution -- needs app deployed to production
```

**Current bottleneck:** Deployment. The app is built, tested (91 tests pass), and has real festival data. But `auto-pilot-1` has not been merged to main, the app has not been deployed, and 2 PRs are still open. Once Alex merges to main and deploys, distribution can begin.

---

*Updated by Autopilot cycle 2026-04-04. Previous board was stale -- reconciled with actual PR history (20 PRs across 3 sprints).*
