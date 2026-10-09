---
title: "wedance-2026: main is broken — Vercel build fails on Button.vue"
type: Task
id: RAZ-203
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["Bug"]
assignee: "Aleksey Razbakov"
creator: "Aleksey Razbakov"
priority: "Urgent"
estimate: null
parent: null
created: 2026-09-28T14:40:04.449Z
started: "2026-09-28T14:40:04.553Z"
completed: "2026-10-08T10:26:34.699Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-203/wedance-2026-main-is-broken-vercel-build-fails-on-buttonvue
exported: 2026-10-09
---

# RAZ-203 — wedance-2026: main is broken — Vercel build fails on Button.vue

## Tension

`razbakov/wedance-2026` main has failed its Vercel build since 478c837 (#99, [RAZ-126](https://linear.app/alosha/issue/RAZ-126/list-your-social), merged 2026-09-26). Build log: `[@vue/compiler-sfc] Failed to resolve extends base type` at `app/components/ui/button/Button.vue:9` (`interface Props extends PrimitiveProps`). Production is not redeploying, and every open WeDance PR fails merge-gate checks 1 (CI) and 6 (deploy): [RAZ-97](https://linear.app/alosha/issue/RAZ-97/pick-workshops), [RAZ-131](https://linear.app/alosha/issue/RAZ-131/festival-search), [RAZ-155](https://linear.app/alosha/issue/RAZ-155/erase-my-account), [RAZ-156](https://linear.app/alosha/issue/RAZ-156/group-directory), [RAZ-162](https://linear.app/alosha/issue/RAZ-162/one-events-feed).

## Driver

Main must be green before any WeDance PR can pass the merge gate, and before anything new can ship to production.

## Requirement

* Vercel build on main succeeds (commit status `success`), and production serves the new deploy (HTTP 200 on the live URL, expected content present).
* `npm run build` (or the repo's build command) passes from a clean checkout.
* The fix is minimal and scoped to the build error; it does not regress the [RAZ-126](https://linear.app/alosha/issue/RAZ-126/list-your-social) organizer CTA.

## Response Options

1. Fix the SFC type: define the props interface locally, or use `defineProps<PrimitiveProps & {...}>()` in a form the Vue compiler can resolve (preferred).
2. Revert #99 and re-apply [RAZ-126](https://linear.app/alosha/issue/RAZ-126/list-your-social) without the breaking change.

Commander instruction 2026-09-28: "fix main first".

## Relations

- related → RAZ-131 Festival Search
- related → RAZ-162 One Events Feed
- related → RAZ-156 Group Directory
- related → RAZ-126 List Your Social
- related → RAZ-97 Pick Workshops
- related → RAZ-155 Erase My Account
- related ← RAZ-204 wedance-2026: remove TypeScript 7 and stray lockfiles (root cause of RAZ-203)

## Comments

### Aleksey Razbakov · 2026-09-28 15:16 UTC

Merge gate · CLOSED-OUT · PR https://github.com/razbakov/wedance-2026/pull/103 merged by razbakov at 2026-09-28T15:02:24Z outside the gate — no merge record; flagged for Trinity's audit.
Merge commit bbf5377 verified on `main`.
