---
title: "RAZ-122 follow-up: add aria-live region for festival form validation errors"
type: Task
id: RAZ-236
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-10-01T15:50:28.708Z
started: "2026-10-06T15:09:39.906Z"
completed: "2026-10-06T15:12:14.884Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/159"]
linear_url: https://linear.app/alosha/issue/RAZ-236/raz-122-follow-up-add-aria-live-region-for-festival-form-validation
exported: 2026-10-09
---

# RAZ-236 — RAZ-122 follow-up: add aria-live region for festival form validation errors

The validation error banner at app/pages/organizers/create.vue:421-427 is a plain div. Screen readers do not announce dynamically added errors. Add role=alert or aria-live=assertive to the error container so validation failures are announced. From PR [https://github.com/razbakov/wedance-2026/pull/125](<https://github.com/razbakov/wedance-2026/pull/125>) (CodeRabbit review comment).

## Links

- [fix(a11y): add role=alert to festival form validation errors](https://github.com/razbakov/wedance-2026/pull/159)

## Comments

### Linear · 2026-10-06 15:09 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 15:12 UTC

### ✅ Done — Screen readers now announce festival form validation errors

**Live:** https://2026.wedance.vip/organizers/create
**PR:** https://github.com/razbakov/wedance-2026/pull/159

Nothing to try — internal change (a11y fix — adds role=alert to error container; no visible UI change).
