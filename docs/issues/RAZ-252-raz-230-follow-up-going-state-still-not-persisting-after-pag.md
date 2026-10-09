---
title: "RAZ-230 follow-up: Going state still not persisting after page refresh"
type: Task
id: RAZ-252
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-10-04T11:35:06.095Z
started: "2026-10-06T16:29:01.271Z"
completed: "2026-10-06T16:50:05.821Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/166"]
linear_url: https://linear.app/alosha/issue/RAZ-252/raz-230-follow-up-going-state-still-not-persisting-after-page-refresh
exported: 2026-10-09
---

# RAZ-252 — RAZ-230 follow-up: Going state still not persisting after page refresh

Commander reported 'still not persisted' after PR #137 was merged (2026-10-04T11:17Z). The Going button state does not survive a page refresh despite the plan_items table and tRPC endpoints being deployed. Likely cause: the hydration plugin (04.plan.client.ts) may not be loading plan state on page load, or there's a timing issue with the auth check. From PR [https://github.com/razbakov/wedance-2026/pull/138](<https://github.com/razbakov/wedance-2026/pull/138>)

## Links

- [fix: Going state not persisting after page refresh (RAZ-252)](https://github.com/razbakov/wedance-2026/pull/166)

## Comments

### Linear · 2026-10-06 16:28 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:50 UTC

### ✅ Done — Going button state now persists after page refresh

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/166

**Try it**
1. Open https://2026.wedance.vip
2. Sign in and click Going on any event
3. Refresh the page
4. You should see the Going button still active
