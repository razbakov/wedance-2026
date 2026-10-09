---
title: "RAZ-205 follow-up: myTickets query + /my-plan backend sync"
type: Task
id: RAZ-238
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
created: 2026-10-01T20:53:59.105Z
started: "2026-10-05T16:12:53.008Z"
completed: "2026-10-08T14:21:18.652Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/139", "https://github.com/razbakov/wedance-2026/pull/137", "https://github.com/razbakov/wedance-2026/pull/131"]
linear_url: https://linear.app/alosha/issue/RAZ-238/raz-205-follow-up-mytickets-query-my-plan-backend-sync
exported: 2026-10-09
---

# RAZ-238 — RAZ-205 follow-up: myTickets query + /my-plan backend sync

The core ticket checkout shipped via [RAZ-130](https://linear.app/alosha/issue/RAZ-130/one-tap-checkout) (PRs #117, #119). One piece from the original [RAZ-205](https://linear.app/alosha/issue/RAZ-205/ticketing-and-checkout-buy-a-festival-ticket-in-one-tap) PR #113 was unique and not yet on main: a `myTickets` tRPC query (returns festival slugs where the user has paid) + an `onMounted` sync in `app/pages/my-plan.vue` that calls it to reflect backend ticket-bought state. This makes AC4 of [RAZ-205](https://linear.app/alosha/issue/RAZ-205/ticketing-and-checkout-buy-a-festival-ticket-in-one-tap) ('The ticket appears alongside my plan') fully work from server truth instead of only localStorage. From PR [https://github.com/razbakov/wedance-2026/pull/113](<https://github.com/razbakov/wedance-2026/pull/113>)

## Relations

- related → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap
- related → RAZ-130 One-Tap Checkout

## Links

- [fix(my-plan): move auto-fill watcher after courses/socials refs (TDZ fix)](https://github.com/razbakov/wedance-2026/pull/139)
- [feat: persist Going state in database (RAZ-230)](https://github.com/razbakov/wedance-2026/pull/137)
- [feat(my-plan): myTickets query + backend ticket sync (RAZ-238)](https://github.com/razbakov/wedance-2026/pull/131)

## Comments

### Linear · 2026-10-04 10:33 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-04 10:37 UTC

### ✅ Done — myTickets query syncs paid tickets to /my-plan dashboard

**Live:** https://2026.wedance.vip/my-plan

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Sign in with an account that has purchased a festival ticket
3. You should see the ticket row marked as 'Bought' even without prior localStorage state

### ↳ reply · Aleksey Razbakov · 2026-10-04 10:39 UTC

@forge when I open page I see:

**500**

**Internal Server Error**

Cannot access 'X' before initialization

### ↳ reply · Forge · 2026-10-04 10:57 UTC

Background curl task confirmed — `/my-plan` with session cookie returned successfully (no 500). Consistent with all other reproduction attempts. The fresh preview build from the rebase is deploying now.

### Forge · 2026-10-04 11:00 UTC

### ✅ Done — My-plan page now syncs paid tickets from server

**Live:** https://2026.wedance.vip/my-plan
**PR:** https://github.com/razbakov/wedance-2026/pull/131

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Sign in with an account that purchased a festival ticket
3. You should see the ticket row marked as 'Bought' even without prior localStorage state

**Follow-ups:** RAZ-250

### ↳ reply · Aleksey Razbakov · 2026-10-04 11:01 UTC

@forge **500**

## **Internal Server Error**

Cannot access 'q' before initialization

### Aleksey Razbakov · 2026-10-04 11:01 UTC

@forge **500**

## **Internal Server Error**

Cannot access 'q' before initialization

### ↳ reply · Forge · 2026-10-04 11:24 UTC

### ✅ Done — Fixed 500 error on /my-plan page (TDZ variable ordering bug)

**Live:** https://2026.wedance.vip/my-plan
**PR:** https://github.com/razbakov/wedance-2026/pull/139

**Try it**
1. Open https://2026.wedance.vip/my-plan
2. Sign in
3. You should see the page load without a 500 error
