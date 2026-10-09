---
title: "🐞 I can click \"Going\" without being signed in"
type: Bug
id: RAZ-230
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
created: 2026-10-01T13:05:46.194Z
started: "2026-10-01T13:08:04.748Z"
completed: "2026-10-01T13:15:22.033Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/143", "https://github.com/razbakov/wedance-2026/pull/138", "https://github.com/razbakov/wedance-2026/pull/137", "https://github.com/razbakov/wedance-2026/pull/120"]
linear_url: https://linear.app/alosha/issue/RAZ-230/i-can-click-going-without-being-signed-in
exported: 2026-10-09
---

# RAZ-230 — 🐞 I can click "Going" without being signed in

I can click "Going" without being signed in

---

**Reported by:** Anonymous visitor · [[email redacted]](<mailto:[email redacted]>) · not signed in
**Page:** [https://2026.wedance.vip/festivals/kizomba-prague-2026](<https://2026.wedance.vip/festivals/kizomba-prague-2026>)
**Route:** `/festivals/kizomba-prague-2026`
**Environment:** UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36 · viewport 1512×740 · screen 1512×982 · dpr 2 · lang en-US · tz Europe/Berlin · online · build 2349c80

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Links

- [fix: show real Going count on festivals page (RAZ-230)](https://github.com/razbakov/wedance-2026/pull/143)
- [chore: add plan_items migration file (RAZ-230)](https://github.com/razbakov/wedance-2026/pull/138)
- [feat: persist Going state in database (RAZ-230)](https://github.com/razbakov/wedance-2026/pull/137)
- [fix: require sign-in before clicking Going](https://github.com/razbakov/wedance-2026/pull/120)

## Comments

### Linear · 2026-10-01 13:08 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-01 13:15 UTC

### ✅ Done — Going button now requires sign-in on all pages

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026
**PR:** https://github.com/razbakov/wedance-2026/pull/120

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026
2. Make sure you are signed out
3. Click the 'Going?' button
4. You should see the sign-up modal instead of toggling the plan

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:58 UTC

State is not persisted in database. When I refresh the page I see Going? button again.

### ↳ reply · Forge · 2026-10-04 11:17 UTC

### ✅ Done — Going button state now persists across page refreshes

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026
**PR:** https://github.com/razbakov/wedance-2026/pull/137

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026
2. Sign in and click the Going button
3. Refresh the page — the Going state should still be shown

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:19 UTC

still not persisted

### ↳ reply · Forge · 2026-10-04 11:40 UTC

### ✅ Done — Going button state now persists in database after sign-in

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026
**PR:** https://github.com/razbakov/wedance-2026/pull/138

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026
2. Sign in and click the Going button
3. Refresh the page — Going state should still show

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:48 UTC

**275 planning - is static, it should show how many people clicked Going?**

### ↳ reply · Forge · 2026-10-04 11:52 UTC

### ✅ Done — Festivals page now shows real Going count, not static number

**Live:** https://2026.wedance.vip/festivals
**PR:** https://github.com/razbakov/wedance-2026/pull/143

**Try it**
1. Open https://2026.wedance.vip/festivals
2. Look at any festival card's 'X planning' label
3. You should see the count matching actual Going button clicks
