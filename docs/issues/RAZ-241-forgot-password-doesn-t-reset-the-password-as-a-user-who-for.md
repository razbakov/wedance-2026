---
title: "🐞 Forgot password doesn't reset the password As a user who forgot my pa…"
type: Bug
id: RAZ-241
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
created: 2026-10-02T20:42:52.443Z
started: "2026-10-02T20:44:21.884Z"
completed: "2026-10-02T21:00:48.018Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/140", "https://github.com/razbakov/wedance-2026/pull/135", "https://github.com/razbakov/wedance-2026/pull/133", "https://github.com/razbakov/wedance-2026/pull/127", "https://github.com/razbakov/wedance-2026/pull/126"]
linear_url: https://linear.app/alosha/issue/RAZ-241/forgot-password-doesnt-reset-the-password-as-a-user-who-forgot-my-pa
exported: 2026-10-09
---

# RAZ-241 — 🐞 Forgot password doesn't reset the password As a user who forgot my pa…

Forgot password doesn't reset the password

As a user who forgot my password, I want to actually set a new password, so that I can get back into my account securely.

Acceptance Criteria

Clicking "Forgot password" and following the email link leads to a page where I can set a new password.
The new password actually replaces the old one.
I can log in afterward using the new password.

Current behavior (bug): Clicking the emailed link logs the user straight in, with no step to set a new password. The old password is never changed.

Status: Not built / broken

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

- [fix: use Brand component for logo on verify/reset page (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/140)
- [fix: remove default layout from verify/reset page (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/135)
- [fix: match verify/reset page style to V3 tropical aesthetic (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/133)
- [fix: forward purpose field in requestMagicLink composable](https://github.com/razbakov/wedance-2026/pull/127)
- [fix: forgot password now resets the password (RAZ-241)](https://github.com/razbakov/wedance-2026/pull/126)

## Comments

### Linear · 2026-10-02 20:44 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-02 21:01 UTC

### ✅ Done — Forgot-password flow now shows a set-new-password form

**Live:** https://2026.wedance.vip/auth/verify
**PR:** https://github.com/razbakov/wedance-2026/pull/126

Nothing to try — internal change (Server-side resetPassword procedure and verify.vue reset form are deployed, but the client trigger doesn't yet send the recovery purpose — follow-up RAZ-242 fixes the wiring).

**Follow-ups:** RAZ-242
