---
title: "RAZ-122 follow-up: add aria-live to festival form validation errors"
type: Task
id: RAZ-237
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-01T15:50:56.882Z
started: "2026-10-06T16:26:27.053Z"
completed: "2026-10-06T16:26:58.043Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-237/raz-122-follow-up-add-aria-live-to-festival-form-validation-errors
exported: 2026-10-09
---

# RAZ-237 — RAZ-122 follow-up: add aria-live to festival form validation errors

CodeRabbit flagged that the validation error banner in app/pages/organizers/create.vue:422 is a plain div that does not announce errors to screen-reader users. Add role="alert" or aria-live="polite" to the stepErrors container so assistive technology announces validation failures. From PR [https://github.com/razbakov/wedance-2026/pull/125](<https://github.com/razbakov/wedance-2026/pull/125>)

## Comments

### Linear · 2026-10-06 16:26 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:26 UTC

### ✅ Done — Already fixed — role=alert merged in PR #159

**Live:** https://2026.wedance.vip/organizers/create

Nothing to try — internal change (Commit 2ca3b7e already added role="alert" to the stepErrors div on main; no further work needed.).
