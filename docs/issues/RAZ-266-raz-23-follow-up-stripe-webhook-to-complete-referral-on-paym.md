---
title: "RAZ-23 follow-up: Stripe webhook to complete referral on payment"
type: Task
id: RAZ-266
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
created: 2026-10-09T08:18:37.034Z
started: "2026-10-09T08:38:23.056Z"
completed: "2026-10-09T09:12:05.099Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-266/raz-23-follow-up-stripe-webhook-to-complete-referral-on-payment
exported: 2026-10-09
---

# RAZ-266 — RAZ-23 follow-up: Stripe webhook to complete referral on payment

The referral row is created with status 'pending' at checkout time. A Stripe webhook handler is needed to transition it to 'completed' when payment succeeds, and 'expired' if the session expires. From PR [https://github.com/razbakov/wedance-2026/pull/188](<https://github.com/razbakov/wedance-2026/pull/188>) — server/trpc/routers/festivalSignup.ts and server/database/schema.ts.

## Comments

### Linear · 2026-10-09 08:38 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-09 08:49 UTC

### 👀 Ready for your review — Stripe webhook referral transitions already shipped in PR #189

**Live:** https://2026.wedance.vip

Nothing to try — internal change (Backend webhook handler — referral status transitions happen server-side on Stripe events, not user-visible).
