---
title: "RAZ-238 follow-up: verify /my-plan 500 error resolved post-merge"
type: Task
id: RAZ-250
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
created: 2026-10-04T11:00:21.746Z
started: "2026-10-06T15:11:04.359Z"
completed: "2026-10-06T15:12:52.068Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-250/raz-238-follow-up-verify-my-plan-500-error-resolved-post-merge
exported: 2026-10-09
---

# RAZ-250 — RAZ-238 follow-up: verify /my-plan 500 error resolved post-merge

Commander reported a 500 'Cannot access X before initialization' on /my-plan during RAZ-238 review. Forge could not reproduce and the preview build passed. Now that the PR is merged to main, verify the production deploy at [https://2026.wedance.vip/my-plan](<https://2026.wedance.vip/my-plan>) does not 500 for authenticated users. From PR [https://github.com/razbakov/wedance-2026/pull/131](<https://github.com/razbakov/wedance-2026/pull/131>)

## Comments

### Linear · 2026-10-06 15:11 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 15:12 UTC

There it is. PR #139 (`e5ce5c7`) was the fix. The root cause was a `watch(..., { immediate: true })` referencing `courses` and `socials` before their `const` declarations — a TDZ (temporal dead zone) violation that only surfaced in production minified builds as "Cannot access 'q' before initialization". This was already fixed and merged.

**Verification summary:**

1. **Root cause identified:** PR #139 fixed the exact "Cannot access X before initialization" error — a watcher referenced `courses`/`socials` refs before their declaration. Production minification exposed the TDZ violation.
2. **Production verified:** `https://2026.wedance.vip/my-plan` returns HTTP 200 with full SSR content (both normal and `?preview=1` modes).
3. **Code verified:** Current `my-plan.vue` has no remaining TDZ risks — `$trpc` is declared at line 45, all refs are declared before watchers reference them, and the
