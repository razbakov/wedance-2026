---
title: "🐞 Sign out needs confirmation As a user, I want to confirm before signi…"
type: Bug
id: RAZ-239
status: done
state: Done
state_type: completed
project: null
labels: ["user-report"]
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "High"
estimate: null
parent: null
created: 2026-10-02T20:40:43.204Z
started: "2026-10-03T13:02:37.621Z"
completed: "2026-10-03T13:09:29.107Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/128"]
linear_url: https://linear.app/alosha/issue/RAZ-239/sign-out-needs-confirmation-as-a-user-i-want-to-confirm-before-signi
exported: 2026-10-09
---

# RAZ-239 — 🐞 Sign out needs confirmation As a user, I want to confirm before signi…

Sign out needs confirmation

As a user, I want to confirm before signing out, so that I don't get logged out by accident.

Acceptance Criteria

Clicking sign out shows a confirmation prompt before logging out.

I can cancel and stay signed in.

Confirming signs me out as normal.

Status: Not built

---

**Reported by:** Tobiloba595 · [[email redacted]](<mailto:[email redacted]>) · dancer `b0d11a3a-bcde-4e00-912f-ef0681a3ba2c`
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

- [feat: add sign-out confirmation dialog](https://github.com/razbakov/wedance-2026/pull/128)

## Comments

### Linear · 2026-10-03 13:02 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-03 13:09 UTC

### ✅ Done — Sign out now asks for confirmation before logging out

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/128

**Try it**
1. Open https://2026.wedance.vip
2. Sign in to your account
3. Click 'Sign out'
4. You should see a confirmation dialog with Cancel and Sign out buttons
