---
title: "RAZ-41 follow-up: Apply/Contact should target /gigs page in wedance-2026, not /careers in we-dance/v4"
type: Task
id: RAZ-232
status: done
state: Done
state_type: completed
project: "WeDance"
labels: []
assignee: "Tobiloba"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-10-01T13:49:16.162Z
started: "2026-10-06T15:15:03.734Z"
completed: "2026-10-06T15:25:21.130Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/160"]
linear_url: https://linear.app/alosha/issue/RAZ-232/raz-41-follow-up-applycontact-should-target-gigs-page-in-wedance-2026
exported: 2026-10-09
---

# RAZ-232 — RAZ-41 follow-up: Apply/Contact should target /gigs page in wedance-2026, not /careers in we-dance/v4

The original RAZ-41 acceptance criteria ask for Apply/Contact on gig cards at /gigs, reaching the person who posted the gig. PR [https://github.com/we-dance/v4/pull/434](<https://github.com/we-dance/v4/pull/434>) (now merged) implemented Apply on /careers in we-dance/v4, emailing a generic careers team — not the gig poster.

Follow-ups:

1. Implement the real /gigs Apply/Contact in razbakov/wedance-2026 per the original acceptance criteria
2. Each gig card links to the poster's email, not a generic careers inbox
3. Confirmation shown after submission

From PR [https://github.com/we-dance/v4/pull/434](<https://github.com/we-dance/v4/pull/434>)

## Links

- [fix(gigs): Apply/Contact emails the poster directly, never a generic inbox](https://github.com/razbakov/wedance-2026/pull/160)

## Comments

### Linear · 2026-10-06 15:15 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 15:25 UTC

### ✅ Done — Gig Apply/Contact now emails the poster directly, not a generic inbox

**Live:** https://2026.wedance.vip/gigs
**PR:** https://github.com/razbakov/wedance-2026/pull/160

**Try it**
1. Open https://2026.wedance.vip/gigs
2. Click Apply or Contact on any gig card
3. You should see an email draft addressed to the gig poster, not hello@wedance.vip

**Follow-ups:** RAZ-260
