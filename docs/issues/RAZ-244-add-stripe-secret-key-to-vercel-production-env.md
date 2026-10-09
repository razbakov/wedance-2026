---
title: "Add STRIPE_SECRET_KEY to Vercel production env"
type: Task
id: RAZ-244
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["agent:commander"]
assignee: "Aleksey Razbakov"
creator: "Aleksey Razbakov"
priority: "Urgent"
estimate: null
parent: null
created: 2026-10-04T10:12:16.063Z
started: "2026-10-05T16:12:41.324Z"
completed: "2026-10-08T10:26:17.200Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-244/add-stripe-secret-key-to-vercel-production-env
exported: 2026-10-09
---

# RAZ-244 — Add STRIPE_SECRET_KEY to Vercel production env

## Do this

1. Open Vercel dashboard → wedance-2026 project → Settings → Environment Variables
2. Add STRIPE_SECRET_KEY with your Stripe secret key (sk_live\_… or sk_test\_… for testing)
3. Add STRIPE_WEBHOOK_SECRET with the webhook signing secret from Stripe dashboard
4. Redeploy (push to main or trigger manual deploy)

Then move this ticket to **Done** — Forge resumes RAZ-205 automatically.

## Summary

Checkout crashes with 500 because this env var was never set. PR #130 makes the error clear but the key itself must be added by a human in the Vercel UI.

Blocks: [RAZ-205](https://linear.app/alosha/issue/RAZ-205/ticketing-and-checkout-buy-a-festival-ticket-in-one-tap)

## Relations

- blocks → RAZ-205 Ticketing & checkout — buy a festival ticket in one tap

## Comments

### Aleksey Razbakov · 2026-10-04 10:21 UTC

Commander · done — completed by the Commander. Set STRIPE_SECRET_KEY (test mode, wedance.vip account acct_1Ok4wu…, reused from wedance-v4) + STRIPE_WEBHOOK_SECRET in Vercel wedance-2026 Production. Created Stripe test webhook we_1UMmVjBGkchblgSm3DPO5qsR → https://2026.wedance.vip/api/stripe/webhook (checkout.session.completed). Redeployed prod. Verified: stripe trigger checkout.session.completed → signature passes (handler reached metadata check). Live mode NOT enabled — switch after a real test purchase passes.
