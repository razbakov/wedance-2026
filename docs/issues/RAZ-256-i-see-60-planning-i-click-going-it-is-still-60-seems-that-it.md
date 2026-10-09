---
title: "🐞 I see 60 planning. I click going it is still 60. Seems that it's a har…"
type: Bug
id: RAZ-256
status: done
state: Done
state_type: completed
project: null
labels: ["user-report"]
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-05T15:59:47.062Z
started: "2026-10-05T21:05:10.851Z"
completed: "2026-10-05T21:10:23.256Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/150"]
linear_url: https://linear.app/alosha/issue/RAZ-256/i-see-60-planning-i-click-going-it-is-still-60-seems-that-its-a-har
exported: 2026-10-09
---

# RAZ-256 — 🐞 I see 60 planning. I click going it is still 60. Seems that it's a har…

I see 60 planning. I click going it is still 60. Seems that it's a hardcoded number. It should be amount of people who clicked Going.

---

**Reported by:** Alösha · [[email redacted]](<mailto:[email redacted]>) · dancer `48e7c709-2e54-47a8-a026-f862972318f1`
**Page:** [https://2026.wedance.vip/festivals/cuban-fire-munich-2026](<https://2026.wedance.vip/festivals/cuban-fire-munich-2026>)
**Route:** `/festivals/cuban-fire-munich-2026`
**Environment:** UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 · viewport 1512×740 · screen 1512×982 · dpr 2 · lang en-US · tz Europe/Berlin · online · build dc94bba

**Recent client errors:**

```
[15:58:54.007] console.error: Hydration completed but contains mismatches.
```

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Links

- [fix(festivals): replace hardcoded attendeeCount with live DB count (RAZ-256)](https://github.com/razbakov/wedance-2026/pull/150)

## Comments

### Linear · 2026-10-05 21:05 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-05 21:10 UTC

Still deploying. The tests pass (186/186), the fix is clean. Here's the summary:

**Root cause:** `app/data/mock-cuban-fire.ts:23` hardcodes `attendeeCount: 60`. The festival detail page loaded this mock value into `FestivalHero`, which displayed `{{ festival.attendeeCount }} planning`. Clicking "Going" toggled the year plan but never updated the displayed count.

**Fix (2 files):**
- `server/trpc/routers/plan.ts:9-16` — new public `plan.count` procedure: `SELECT count(*) FROM plan_items WHERE item_type = ? AND item_id = ?`
- `app/pages/festivals/[slug].vue:28-38,649-656,991` — fetches live count on mount (falls back to mock on error), optimistically increments/decrements on Going toggle, passes `heroFestival` (with live count) to `FestivalHero`

**Tests:** `npx vitest run` — 18 files, 186 tests passed, exit 0.

```json
{"status": "done",
 "headline": "Planning count now shows real Going

### Forge · 2026-10-05 22:30 UTC

### ✅ Done — Festival 'planning' count now shows real Going clicks

**Live:** https://2026.wedance.vip/festivals/cuban-fire-munich-2026
**PR:** https://github.com/razbakov/wedance-2026/pull/150

**Try it**
1. Open https://2026.wedance.vip/festivals/cuban-fire-munich-2026
2. See the planning count in the hero — it now reflects real Going clicks
3. Click Going and see the number update instantly
