---
title: "🐞 Redirect after sign out As a user, I want to land on a sign-in page a…"
type: Bug
id: RAZ-240
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["user-report"]
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "High"
estimate: null
parent: null
created: 2026-10-02T20:41:56.315Z
started: "2026-10-03T13:14:08.614Z"
completed: "2026-10-03T13:17:52.095Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/129"]
linear_url: https://linear.app/alosha/issue/RAZ-240/redirect-after-sign-out-as-a-user-i-want-to-land-on-a-sign-in-page-a
exported: 2026-10-09
---

# RAZ-240 — 🐞 Redirect after sign out As a user, I want to land on a sign-in page a…

Redirect after sign out

As a user, I want to land on a sign-in page after signing out, so that it's clear I've been logged out and I can log back in easily.

Acceptance Criteria

After signing out, I'm redirected to a sign-in or register page.
I'm not left on a page meant for signed-in users.

Status: Not built

---

**Reported by:** Anonymous visitor · not signed in
**Page:** [https://2026.wedance.vip/festivals](<https://2026.wedance.vip/festivals>)
**Route:** `/festivals`
**Referrer:** [https://2026.wedance.vip/cities](<https://2026.wedance.vip/cities>)
**Environment:** UA: Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36 · viewport 360×714 · screen 360×820 · dpr 2 · lang en-US · tz Africa/Lagos · online · build 7ee41b2

**Recent client errors:**

```
[20:39:37.440] console.error: Hydration completed but contains mismatches.
```

---

*Filed automatically from the “Report a problem” widget on [2026.wedance.vip](<http://2026.wedance.vip>).*

## Links

- [fix: redirect to home page after sign out](https://github.com/razbakov/wedance-2026/pull/129)

## Comments

### Linear · 2026-10-03 13:14 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-03 13:18 UTC

### ✅ Done — Sign-out now redirects to home page instead of staying put

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/129

**Try it**
1. Open https://2026.wedance.vip
2. Sign in with any account
3. Click your profile menu and sign out
4. You should land on the home page (/)
