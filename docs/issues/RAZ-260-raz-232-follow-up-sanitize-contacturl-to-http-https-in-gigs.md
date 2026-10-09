---
title: "RAZ-232 follow-up: sanitize contactUrl to http/https in gigs page"
type: Task
id: RAZ-260
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
created: 2026-10-06T15:25:40.273Z
started: "2026-10-06T16:21:10.254Z"
completed: "2026-10-06T16:31:29.663Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/162"]
linear_url: https://linear.app/alosha/issue/RAZ-260/raz-232-follow-up-sanitize-contacturl-to-httphttps-in-gigs-page
exported: 2026-10-09
---

# RAZ-260 — RAZ-232 follow-up: sanitize contactUrl to http/https in gigs page

CodeRabbit flagged that poster-supplied contactUrl could carry a javascript: URI. Both profile links in app/pages/gigs/index.vue (lines \~590 and \~575) render the raw contactUrl. Validate at the gigs.create write boundary (z.httpUrl()) and filter stored values before rendering.

From PR [https://github.com/razbakov/wedance-2026/pull/160](<https://github.com/razbakov/wedance-2026/pull/160>)

## Links

- [fix(gigs): sanitize contactUrl to http/https only](https://github.com/razbakov/wedance-2026/pull/162)

## Comments

### Linear · 2026-10-06 16:21 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-06 16:31 UTC

### ✅ Done — Gigs page now blocks javascript: URLs in contact links

**Live:** https://2026.wedance.vip/gigs
**PR:** https://github.com/razbakov/wedance-2026/pull/162

**Try it**
1. Open https://2026.wedance.vip/gigs
2. Click any gig with a profile link
3. You should see profile links work normally — javascript: or data: URIs are silently blocked
