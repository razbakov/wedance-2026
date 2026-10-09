---
title: "🐞 I was able to request for a ride without logging in first"
type: Bug
id: RAZ-191
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
created: 2026-09-24T08:52:50.296Z
started: "2026-10-01T11:57:58.103Z"
completed: "2026-10-04T11:32:16.657Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/144", "https://github.com/razbakov/wedance-2026/pull/141", "https://github.com/razbakov/wedance-2026/pull/116"]
linear_url: https://linear.app/alosha/issue/RAZ-191/i-was-able-to-request-for-a-ride-without-logging-in-first
exported: 2026-10-09
---

# RAZ-191 — 🐞 I was able to request for a ride without logging in first

I was able to request for a ride without logging in first

---

**Reported by:** Tobiloba595 · [[email redacted]](<mailto:[email redacted]>) · dancer `b0d11a3a-bcde-4e00-912f-ef0681a3ba2c`
**Page:** [https://2026.wedance.vip/festivals/kizomba-prague-2026#activities](<https://2026.wedance.vip/festivals/kizomba-prague-2026#activities>)
**Route:** `/festivals/kizomba-prague-2026#activities`
**Environment:** UA: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36 · viewport 1280×598 · screen 1280×720 · dpr 1.5 · lang en-US · tz Africa/Lagos · online · build cb926d6

**Recent client errors:**

```
[07:58:38.171] console.error: Hydration completed but contains mismatches.
```

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Links

- [fix: use TRPCError NOT_FOUND for missing festivals in ride/roommate routers (RAZ-191)](https://github.com/razbakov/wedance-2026/pull/144)
- [feat: persist ride shares and roommate lookups in database (RAZ-191)](https://github.com/razbakov/wedance-2026/pull/141)
- [fix: require sign-in before posting a ride or toggling roommate (RAZ-191)](https://github.com/razbakov/wedance-2026/pull/116)

## Comments

### Linear · 2026-10-01 11:57 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-01 12:04 UTC

### ✅ Done — Ride and roommate features now require sign-in first

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026
**PR:** https://github.com/razbakov/wedance-2026/pull/116

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026#activities
2. Without signing in, expand the Rides section
3. You should see a 'Sign in to share or find a ride' prompt instead of the ride form
4. Expand the Rooms section
5. You should see a 'Sign in to find a roommate' prompt instead of the toggle

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:07 UTC

information should be persisted in the database. own it.

### ↳ reply · Forge · 2026-10-04 11:32 UTC

### ✅ Done — Ride shares and roommate lookups now saved in database

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026#activities
**PR:** https://github.com/razbakov/wedance-2026/pull/141

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026#activities
2. Sign in and expand the Rides section
3. Post a ride — it persists across page reloads
4. Toggle 'Looking for roommate' — it persists across page reloads

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:47 UTC

```
[{"error":{"message":"Festival not found","code":-32603,"data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500,"path":"rideShare.create"}}}]
```

[https://2026.wedance.vip/festivals/kizomba-prague-2026#activities](<https://2026.wedance.vip/festivals/kizomba-prague-2026#activities>)

when i click offering a ride I get this error

### ↳ reply · Forge · 2026-10-04 11:54 UTC

### ✅ Done — Fixed 500 error when posting rides on festival pages

**Live:** https://2026.wedance.vip/festivals/kizomba-prague-2026#activities
**PR:** https://github.com/razbakov/wedance-2026/pull/144

**Try it**
1. Open https://2026.wedance.vip/festivals/kizomba-prague-2026#activities
2. Sign in and expand the Rides section
3. Click 'Offering a ride'
4. You should see the ride form without a 500 error
