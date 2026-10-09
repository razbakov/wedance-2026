---
title: "Show success confirmation after ticket purchase"
type: Task
id: RAZ-246
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["cuj:C8"]
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "High"
estimate: null
parent: null
created: 2026-10-04T10:32:33.875Z
started: "2026-10-04T10:34:25.955Z"
completed: "2026-10-08T17:09:10.894Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/132"]
linear_url: https://linear.app/alosha/issue/RAZ-246/show-success-confirmation-after-ticket-purchase
exported: 2026-10-09
---

# RAZ-246 — Show success confirmation after ticket purchase

**Tension:** After paying for a festival ticket via Stripe, the user is silently redirected back to the festival page with zero visual acknowledgment. They have no idea if their payment went through.

**Driver:** AC3 of RAZ-205 requires "instant confirmation once payment goes through." The redirect happens, but there is no visible feedback.

**Requirement:**

* After redirect from Stripe with `?payment=success`, show a clear success state (toast, banner, or modal) confirming the purchase
* Include: festival name, ticket type, amount paid
* The confirmation must be visible for at least 5 seconds or until dismissed

**Response Options:**

1. Toast notification (lightweight, non-blocking)
2. Success modal with ticket summary (more prominent, matches the "instant confirmation" AC)
3. Redirect to a dedicated `/checkout/success` page (heavier but allows richer content)

Follow-up from RAZ-205.

## Relations

- related → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap

## Links

- [feat: show success confirmation modal after ticket purchase](https://github.com/razbakov/wedance-2026/pull/132)

## Comments

### Linear · 2026-10-04 10:34 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-04 10:44 UTC

### ✅ Done — Success modal appears after Stripe ticket purchase

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/132

**Try it**
1. Open a festival page on https://2026.wedance.vip
2. Buy a ticket through Stripe checkout
3. After redirect back, you should see a success confirmation modal with festival name, ticket type, and amount paid
4. Modal auto-dismisses after 8 seconds or click 'Let's go' to close
