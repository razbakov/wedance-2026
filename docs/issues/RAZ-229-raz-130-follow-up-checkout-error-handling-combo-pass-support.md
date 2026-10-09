---
title: "RAZ-130 follow-up: checkout error handling + combo pass support"
type: Task
id: RAZ-229
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
created: 2026-10-01T12:30:13.430Z
started: "2026-10-06T17:12:11.075Z"
completed: "2026-10-06T17:22:00.243Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/168"]
linear_url: https://linear.app/alosha/issue/RAZ-229/raz-130-follow-up-checkout-error-handling-combo-pass-support
exported: 2026-10-09
---

# RAZ-229 — RAZ-130 follow-up: checkout error handling + combo pass support

1. No error shown to dancer when ticketCheckout mutation fails — catch rejection and display error in modal (file: app/pages/festivals/\[slug\].vue:741). 2. Combo recommendations only checkout the first pass, not the full combo (file: app/pages/festivals/\[slug\].vue:744). From PR [https://github.com/razbakov/wedance-2026/pull/117](<https://github.com/razbakov/wedance-2026/pull/117>) (CodeRabbit + Codex review).

## Links

- [fix: combo pass checkout sends all tickets in one Stripe session](https://github.com/razbakov/wedance-2026/pull/168)

## Comments

### Linear · 2026-10-06 17:12 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 17:22 UTC

### ✅ Done — Combo pass checkout now sends all tickets in one Stripe session

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/168

**Try it**
1. Open a festival page on 2026.wedance.vip
2. Click a combo recommendation (e.g. Friday + Saturday + Party)
3. You should see all passes listed with itemized prices and a combo total in the checkout modal
