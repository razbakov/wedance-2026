# WeDance — Work Board

**Last updated:** 2026-04-04
**Maintained by:** Coordinator (Logbook Keeper)

> This board is the single source of truth for work status. Backlog files define *what* needs doing; this board tracks *where* each item stands.

## Rules

- **One agent, one item.** No agent works on two items simultaneously.
- **Pull, don't push.** Agents pull from Ready when dispatched — delegators approve what moves to Ready.
- **WIP limit:** max 1 item per agent in "In Progress".
- **No file conflicts.** Never dispatch two agents to modify the same files. Split work by file/directory ownership.
- **Reference the board.** Every agent dispatch references a board item — no ad-hoc tasks that bypass the backlog.

---

## Backlog

Prioritized items not yet ready to start (dependencies unmet or not yet approved).

| # | Item | Domain | Type | Assigned to | Blocked by |
|---|------|--------|------|-------------|------------|
| G-002 | Select pilot festival | Festival Exp. | Governance | Partnership Manager + Kirill | Partnership decision needed |
| G-003 | Create privacy policy | Festival Exp. | Governance | Alex + Kirill | Pilot festival selection (scope depends on data collected) |
| O-001 | Build interactive schedule MVP | Festival Exp. | Operations | Engineer | Product Lead specs + Designer wireframes + pilot festival selected |
| O-002 | Convert pilot schedule | Festival Exp. | Operations | Operations Manager | Pilot festival selected (G-002) + MVP built (O-001) |
| O-003 | Launch distribution for pilot | Festival Exp. | Operations | Marketing Lead | Schedule published (O-002) + community access |
| O-004 | Set up experiment analytics | Festival Exp. | Operations | Analyst + Engineer | MVP built (O-001) + Alex provides analytics infra |
| O-005 | View festival schedule (story) | Festival Exp. | Operations | Engineer | Part of O-001 |

## Ready

Dependencies met, approved by delegator, waiting for an agent to be dispatched.

| # | Item | Domain | Type | Assigned to | Approved by |
|---|------|--------|------|-------------|-------------|
| G-001 | Define agent deployment plan | Festival Exp. | Governance | Alex | Approved 2026-04-04 (Kirill consent pending) |

## In Progress

Actively being worked on. Max 1 item per agent.

| # | Item | Domain | Type | Agent | Started | Delegator |
|---|------|--------|------|-------|---------|-----------|
| — | — | — | — | — | — | — |

## In Review

Work delivered (PR or document), waiting for delegator review.

| # | Item | Domain | Type | Agent | PR / Deliverable | Reviewer |
|---|------|--------|------|-------|-------------------|----------|
| — | — | — | — | — | — | — |

## Done

Merged, deployed, or decision recorded.

| # | Item | Domain | Type | Completed | Notes |
|---|------|--------|------|-----------|-------|
| — | — | — | — | — | — |

---

## Critical Path

```
G-002 Select pilot festival
  └─► O-001 Build MVP + O-004 Set up analytics (can start in parallel once festival known)
        └─► O-002 Convert schedule (needs MVP + festival data)
              └─► O-003 Launch distribution (needs schedule live)
```

**Current bottleneck:** G-002 — no pilot festival selected. Everything downstream is blocked.

---

*Updated by Coordinator each cycle. Delegators move items to Ready. Coordinator flags stale items and dependency changes.*
