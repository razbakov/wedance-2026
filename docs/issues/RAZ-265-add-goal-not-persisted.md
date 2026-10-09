---
title: "Add goal not persisted"
type: Task
id: RAZ-265
status: done
state: Done
state_type: completed
project: null
labels: ["user-report"]
assignee: "Aleksey Razbakov"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-08T12:02:10.494Z
started: "2026-10-08T12:03:21.580Z"
completed: "2026-10-08T14:20:37.029Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/175"]
linear_url: https://linear.app/alosha/issue/RAZ-265/add-goal-not-persisted
exported: 2026-10-09
---

# RAZ-265 — Add goal not persisted

1. open [https://2026.wedance.vip/my-plan](<https://2026.wedance.vip/my-plan>)
2. click "Add goal"
3. fill the form
4. see goal in the section
5. refresh the page

expected: see goal in the section

actual: empty section

---

**Reported by:** Alösha · [[email redacted]](<mailto:[email redacted]>) · dancer `48e7c709-2e54-47a8-a026-f862972318f1`
**Page:** [https://2026.wedance.vip/my-plan](<https://2026.wedance.vip/my-plan>)
**Route:** `/my-plan`
**Environment:** UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 · viewport 1512×740 · screen 1512×982 · dpr 2 · lang en-US · tz Europe/Berlin · online · build 343859d

**Recent client errors:**

```
[12:01:45.763] console.error: Hydration completed but contains mismatches.
[12:01:46.443] console.error: Failed to fetch hangouts: TRPCClientError: Failed query: select "id", "kind", "title", "time", "venue", "host", "people_count", "status", "dancer_id", "created_at" from "hangouts" where ("hangouts"."city_slug" = $1 and "hangouts"."status" = $2) order by "hangouts"."created_at" desc
params: munich,active
TRPCClientError: Failed query: select "id", "kind", "title", "time", "venue", "host", "people_count", "status", "dancer_id", "created_at" from "hangouts" where ("hangouts"."city_slug" = $1 and "hangouts"."status" = $2) order by "hangouts"."created_at" desc
params: munich,active
    at Nc.from (https://2026.wedance.vip/_nuxt/lVoDupJ6.js:7:10261)
    at https://2026.wedance.vip/_nuxt/lVoDupJ6.js:7:15462
```

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Relations

- related ← RAZ-235 🐞 Add goal should open a nice popup
- related ← RAZ-255 🐞 Add goal - that should show a nice popup, not a built-in alert.

## Links

- [fix: persist goals by applying missing metadata column + harden mutations](https://github.com/razbakov/wedance-2026/pull/175)

## Comments

### Linear · 2026-10-08 12:03 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-08 12:18 UTC

### ✅ Done — Goals now persist — missing DB column applied, mutations hardened

**Live:** https://2026.wedance.vip/my-plan

**Try it**
1. Open https://2026.wedance.vip/my-plan (sign in if needed)
2. Click '+ Add a goal', fill title and why, submit
3. Refresh the page
4. You should see the goal still present in the Goals section
