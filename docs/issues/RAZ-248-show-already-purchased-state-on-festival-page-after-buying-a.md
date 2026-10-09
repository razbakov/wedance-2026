---
title: "Show 'already purchased' state on festival page after buying a ticket"
type: Task
id: RAZ-248
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
created: 2026-10-04T10:32:36.079Z
started: "2026-10-06T17:18:02.231Z"
completed: "2026-10-06T17:28:01.732Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/169"]
linear_url: https://linear.app/alosha/issue/RAZ-248/show-already-purchased-state-on-festival-page-after-buying-a-ticket
exported: 2026-10-09
---

# RAZ-248 — Show 'already purchased' state on festival page after buying a ticket

**Tension:** After buying a festival pass, the festival page still shows "Get this pass" — there is no differentiation between a user who paid €1 for social unlock and one who bought a full pass. A returning user might think their payment didn't go through, or accidentally attempt to buy again.

**Driver:** AC1 of RAZ-205 ("a festival page shows a clear button to buy a ticket") implies the button should reflect the purchased state. The duplicate-purchase guard exists server-side, but the UI doesn't reflect ownership.

**Requirement:**

* If the user already has a `verifiedTicketHolder: true` signup for this festival, show "You have a ticket" instead of "Get this pass"
* Differentiate between social unlock (€1) and full pass purchase in the UI
* Prevent the checkout flow from starting if the user already holds a ticket

**Response Options:**

1. Swap CTA text + disable button when `verifiedTicketHolder` is true
2. Show a "Your ticket" card with purchase details replacing the pricing section
3. Both — card + disabled CTA

Follow-up from RAZ-205.

## Relations

- related → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap

## Links

- [feat: show 'already purchased' state on festival page](https://github.com/razbakov/wedance-2026/pull/169)

## Comments

### Linear · 2026-10-06 17:18 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 17:28 UTC

### ✅ Done — Festival page shows 'You have a ticket' after purchase

**Live:** https://2026.wedance.vip
**PR:** https://github.com/razbakov/wedance-2026/pull/169

**Try it**
1. Open a festival page on 2026.wedance.vip
2. Log in with an account that purchased a ticket
3. You should see 'You have a ticket' instead of 'Get this pass'
