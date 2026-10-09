---
title: "RAZ-29 follow-up: fix plan dashboard gating and course/social persistence"
type: Task
id: RAZ-231
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
created: 2026-10-01T13:39:36.031Z
started: "2026-10-06T16:50:30.989Z"
completed: "2026-10-06T16:58:02.126Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/167"]
linear_url: https://linear.app/alosha/issue/RAZ-231/raz-29-follow-up-fix-plan-dashboard-gating-and-coursesocial
exported: 2026-10-09
---

# RAZ-231 — RAZ-29 follow-up: fix plan dashboard gating and course/social persistence

Follow-up from PR [https://github.com/razbakov/wedance-2026/pull/121](<https://github.com/razbakov/wedance-2026/pull/121>) (RAZ-29 auto-fill plan).

CodeRabbit review flagged three issues:

1. **Dashboard gates on festival count** (app/pages/my-plan.vue:1215): When a user removes the last festival, the `picked.length === 0` branch hides the entire dashboard — including still-populated courses and socials sections. Fix: only show the empty state when all three plan collections are empty.
2. **Watcher ordering** (app/pages/my-plan.vue:279): The immediate watcher referencing the empty-year-plan condition may execute before `courses` and `socials` refs are initialized. Move it below those declarations.
3. **Course/social persistence** (app/pages/my-plan.vue:244): Seeded courses and socials are not persisted alongside the year plan. They vanish on page unmount and re-entry. Persist them or restore on mount.

## Links

- [fix: plan dashboard gating and course/social persistence](https://github.com/razbakov/wedance-2026/pull/167)

## Comments

### Linear · 2026-10-06 16:50 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:58 UTC

### ✅ Done — Plan dashboard no longer hides courses/socials when festivals removed

**Live:** https://2026.wedance.vip/my-plan
**PR:** https://github.com/razbakov/wedance-2026/pull/167

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Auto-fill a plan, then remove all festivals
3. You should see courses and socials still displayed instead of empty state
