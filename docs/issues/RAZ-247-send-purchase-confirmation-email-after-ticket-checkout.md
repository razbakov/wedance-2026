---
title: "Send purchase confirmation email after ticket checkout"
type: Task
id: RAZ-247
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["cuj:C8"]
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "No priority"
estimate: null
parent: null
created: 2026-10-04T10:32:35.248Z
started: "2026-10-06T16:36:03.412Z"
completed: "2026-10-06T16:42:52.983Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/164"]
linear_url: https://linear.app/alosha/issue/RAZ-247/send-purchase-confirmation-email-after-ticket-checkout
exported: 2026-10-09
---

# RAZ-247 — Send purchase confirmation email after ticket checkout

**Tension:** After a successful Stripe payment, WeDance sends no email. The user's only receipt is Stripe's default (if enabled in the dashboard). There is no ticket confirmation, no event details, no "what to bring" info.

**Driver:** Standard e-commerce expectation — every purchase gets a confirmation email. Without it, users screenshot the Stripe receipt page or have no proof of purchase at all.

**Requirement:**

* On `checkout.session.completed` webhook, send a confirmation email to the buyer
* Include: festival name, date, ticket type, amount paid, a "your ticket" summary
* Use the existing email infrastructure (`server/utils/email.ts` + Resend)

**Response Options:**

1. Plain-text transactional email via Resend (fast to build, reliable)
2. HTML-styled email with festival branding (better UX, more work)
3. Email with a QR code / ticket PDF attachment (full ticketing experience)

Follow-up from RAZ-205.

## Relations

- related → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap

## Links

- [feat: send purchase confirmation email after Stripe checkout](https://github.com/razbakov/wedance-2026/pull/164)

## Comments

### Linear · 2026-10-06 16:35 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:43 UTC

### ✅ Done — Purchase confirmation email now sent after Stripe checkout

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/164

**Try it**
1. Open https://2026.wedance.vip
2. Buy a ticket for any festival via Stripe
3. You should see a confirmation email with festival name, dates, ticket type, and amount paid
