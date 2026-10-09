---
title: "RAZ-253 follow-up: address P2 code review suggestions from PR #142"
type: Task
id: RAZ-254
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "High"
estimate: null
parent: null
created: 2026-10-04T11:44:31.984Z
started: "2026-10-05T15:13:35.729Z"
completed: "2026-10-06T13:02:18.039Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/146"]
linear_url: https://linear.app/alosha/issue/RAZ-254/raz-253-follow-up-address-p2-code-review-suggestions-from-pr-142
exported: 2026-10-09
---

# RAZ-254 — RAZ-253 follow-up: address P2 code review suggestions from PR #142

Four P2 suggestions from automated review on PR [https://github.com/razbakov/wedance-2026/pull/142](<https://github.com/razbakov/wedance-2026/pull/142>) (v3 profile sync):

1. **server/trpc/routers/events.ts** — Retry the profile filter without artists: pre-migration fallback could be tightened
2. **app/pages/@\[handle\].vue** — Tie the empty state to the schedule itself (v-else placement)
3. **app/pages/cities/\[city\]/index.vue** — Filter cross-role venue cards by both linked roles
4. **server/utils/v3ProfileSync.ts** — Let dry-runs work before migration 0022

All are P2 improvements, none block functionality.

## Links

- [fix: address P2 code review suggestions from PR #142](https://github.com/razbakov/wedance-2026/pull/146)

## Comments

### Linear · 2026-10-05 15:13 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-05 15:19 UTC

### ✅ Done — Fixed four P2 code review items from v3 profile sync PR

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/146

Nothing to try — internal change (Bug fixes in event filtering, profile page empty state, and dry-run fallback — no new user-visible features).
