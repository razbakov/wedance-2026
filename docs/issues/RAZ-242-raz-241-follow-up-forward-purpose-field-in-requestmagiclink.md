---
title: "RAZ-241 follow-up: forward purpose field in requestMagicLink composable"
type: Task
id: RAZ-242
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "High"
estimate: null
parent: null
created: 2026-10-02T21:01:02.490Z
started: "2026-10-04T10:48:21.375Z"
completed: "2026-10-05T21:02:47.234Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/140", "https://github.com/razbakov/wedance-2026/pull/135", "https://github.com/razbakov/wedance-2026/pull/133", "https://github.com/razbakov/wedance-2026/pull/127"]
linear_url: https://linear.app/alosha/issue/RAZ-242/raz-241-follow-up-forward-purpose-field-in-requestmagiclink-composable
exported: 2026-10-09
---

# RAZ-242 — RAZ-241 follow-up: forward purpose field in requestMagicLink composable

requestMagicLink() in app/composables/useAuth.ts does not include 'purpose' in its type signature or forward it to the tRPC mutation. SignUpModal.vue passes { email, purpose: 'recovery' } but the composable drops 'purpose', so the server always defaults to purpose: 'login'. The fix: add 'purpose?: "login" | "recovery"' to the input type and forward it in the .mutate() call. From PR [https://github.com/razbakov/wedance-2026/pull/126](<https://github.com/razbakov/wedance-2026/pull/126>) (CodeRabbit review).

## Links

- [fix: use Brand component for logo on verify/reset page (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/140)
- [fix: remove default layout from verify/reset page (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/135)
- [fix: match verify/reset page style to V3 tropical aesthetic (RAZ-242)](https://github.com/razbakov/wedance-2026/pull/133)
- [fix: forward purpose field in requestMagicLink composable](https://github.com/razbakov/wedance-2026/pull/127)

## Comments

### Linear · 2026-10-02 21:14 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-02 21:18 UTC

### ✅ Done — Forgot-password now sends recovery link instead of login link

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/127

**Try it**
1. Open https://2026.wedance.vip
2. Click sign in, then 'Forgot password'
3. You should receive a recovery-purpose magic link email

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:41 UTC

@forge layout and style of reset password page should match the overall layout and style

### ↳ reply · Forge · 2026-10-04 10:49 UTC

### ✅ Done — Password reset page restyled to match tropical V3 design

**Live:** https://2026.wedance.vip/auth/verify
**PR:** https://github.com/razbakov/wedance-2026/pull/133

**Try it**
1. Open https://2026.wedance.vip
2. Click sign in, then 'Forgot password'
3. Enter email and request reset link
4. Open the magic link from email — the verify/reset page now shows cream background, red accent bar, serif headings, and warm brown palette matching the rest of the site

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:50 UTC

@forge layout is still off. header with main nav looks off.

### ↳ reply · Forge · 2026-10-04 10:50 UTC

Forge failed: error_during_execution — reply here to retry.

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:50 UTC

@forge layout is still off. header with main nav looks off.

### ↳ reply · Forge · 2026-10-04 10:50 UTC

Forge failed: error_during_execution — reply here to retry.

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:51 UTC

@forge layout is still off. header with main nav looks off.

### ↳ reply · Forge · 2026-10-04 10:51 UTC

Forge failed: error_during_execution — reply here to retry.

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:51 UTC

@forge layout is still off. header with main nav looks off.

### ↳ reply · Forge · 2026-10-04 10:51 UTC

Forge failed: error_during_execution — reply here to retry.

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:00 UTC

@forge layout is still off. header with main nav looks off.

### ↳ reply · Forge · 2026-10-04 11:04 UTC

### ✅ Done — Password reset page no longer shows app header/nav

**Live:** https://2026.wedance.vip/auth/verify
**PR:** https://github.com/razbakov/wedance-2026/pull/135

**Try it**
1. Open https://2026.wedance.vip
2. Click sign in, then 'Forgot password'
3. Enter email and request reset link
4. Open the magic link from email — you should see a standalone cream card without the top navigation bar

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:07 UTC

logo is wrong

### ↳ reply · Forge · 2026-10-04 11:19 UTC

### ✅ Done — Reset password page now shows the correct SVG logo

**Live:** https://2026.wedance.vip/auth/verify?mode=reset&token=test

**Try it**
1. Open https://2026.wedance.vip
2. Click Sign In → Forgot Password → enter email
3. Open the reset link from your email
4. You should see the proper WeDance flame+wordmark logo below the card

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:20 UTC

[https://2026.wedance.vip/auth/verify?mode=reset&token=test](<https://2026.wedance.vip/auth/verify?mode=reset&token=test>)

still has a wrong logo

### ↳ reply · Forge · 2026-10-04 11:28 UTC

### ✅ Done — Reset page now shows correct SVG logo instead of text

**Live:** https://2026.wedance.vip/auth/verify
**PR:** https://github.com/razbakov/wedance-2026/pull/140

**Try it**
1. Open https://2026.wedance.vip
2. Click Sign In, then Forgot Password
3. Enter email and request reset link
4. Open the magic link — you should see the proper WeDance flame+wordmark logo
