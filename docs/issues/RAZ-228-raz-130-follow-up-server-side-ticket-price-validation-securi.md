---
title: "RAZ-130 follow-up: server-side ticket price validation (security)"
type: Task
id: RAZ-228
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
created: 2026-10-01T12:30:09.148Z
started: "2026-10-06T15:08:04.852Z"
completed: "2026-10-06T15:09:40.454Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-228/raz-130-follow-up-server-side-ticket-price-validation-security
exported: 2026-10-09
---

# RAZ-228 — RAZ-130 follow-up: server-side ticket price validation (security)

ticketCheckout accepts client-supplied ticketName and amount — a signed-in dancer can submit €1 for any ticket. Resolve ticket by server-side ID and use catalog price. Also: webhook hardcodes paidAmount:100 and doesn't distinguish ticket purchases from social unlocks. Files: server/trpc/routers/festivalSignup.ts:169-173, server/api/stripe/webhook.post.ts. Class: money/security (CWE-602). From PR [https://github.com/razbakov/wedance-2026/pull/117](<https://github.com/razbakov/wedance-2026/pull/117>) (CodeRabbit + Codex review).

## Comments

### Linear · 2026-10-06 15:08 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 15:09 UTC

### 💬 Answer — Already fixed in PR #119 — server-side price lookup, webhook paidAmount, ticket distinction

All three concerns (client-supplied amount, hardcoded paidAmount:100, ticket-vs-social-unlock) were fixed in PR #119 (commit 2349c80, 2026-10-01). ticketCheckout accepts only ticketName and resolves price server-side via getTicketPriceCents(); the webhook reads amountCents from metadata and distinguishes ticket purchases from social unlocks.
