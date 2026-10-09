---
title: "RAZ-23 follow-up: Referrer-side discount credit"
type: Task
id: RAZ-267
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-10-09T08:18:39.766Z
started: "2026-10-09T08:41:19.027Z"
completed: "2026-10-09T09:11:20.046Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/191", "https://github.com/razbakov/wedance-2026/pull/189"]
linear_url: https://linear.app/alosha/issue/RAZ-267/raz-23-follow-up-referrer-side-discount-credit
exported: 2026-10-09
---

# RAZ-267 — RAZ-23 follow-up: Referrer-side discount credit

Currently only the referee (the person clicking the referral link) gets the Stripe coupon discount. The referrer needs their own credit mechanism (e.g. a credit on their next purchase, or a partial refund). From PR [https://github.com/razbakov/wedance-2026/pull/188](<https://github.com/razbakov/wedance-2026/pull/188>) — server/trpc/routers/festivalSignup.ts.

## Links

- [feat(referral): referrer-side discount credit (RAZ-267)](https://github.com/razbakov/wedance-2026/pull/191)
- [feat(referral): add migration and webhook completion (RAZ-23)](https://github.com/razbakov/wedance-2026/pull/189)

## Comments

### Linear · 2026-10-09 08:41 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-09 08:59 UTC

### 👀 Merged — ready for your review — Referrers now earn credit applied to their next ticket purchase

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/191

**Try it**
1. Open https://2026.wedance.vip/festivals/<any-festival>
2. Share your referral link with a friend
3. After they pay, your earned credit auto-applies at your next checkout
