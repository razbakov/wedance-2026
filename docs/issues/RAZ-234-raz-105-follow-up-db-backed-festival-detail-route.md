---
title: "RAZ-105 follow-up: DB-backed festival detail route"
type: Task
id: RAZ-234
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
created: 2026-10-01T13:54:23.234Z
started: "2026-10-08T14:39:21.063Z"
completed: "2026-10-08T22:47:02.642Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/179"]
linear_url: https://linear.app/alosha/issue/RAZ-234/raz-105-follow-up-db-backed-festival-detail-route
exported: 2026-10-09
---

# RAZ-234 — RAZ-105 follow-up: DB-backed festival detail route

The festival directory now lists DB-driven festivals, but /festivals/\[slug\].vue still resolves only its hardcoded festival map. New DB-only festivals will 404 on the detail page. Make the detail route DB-backed or restrict listing to festivals with a supported detail page. File: app/pages/festivals/\[slug\].vue, server/api/festivals.get.ts. From PR [https://github.com/razbakov/wedance-2026/pull/124](<https://github.com/razbakov/wedance-2026/pull/124>)

## Links

- [feat(festivals): DB-backed fallback for festival detail route](https://github.com/razbakov/wedance-2026/pull/179)

## Comments

### Linear · 2026-10-08 14:39 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-08 14:46 UTC

### 👀 Ready for your review — DB-only festivals no longer 404 on the detail page

**Live:** https://2026.wedance.vip/festivals

**Try it**
1. Open https://2026.wedance.vip/festivals
2. Click any festival card
3. You should see the festival detail page (not a 404), even for festivals only in the database

### Forge · 2026-10-08 14:55 UTC

### 👀 Merged — ready for your review — Festival detail pages no longer 404 for DB-only festivals

**Live:** https://2026.wedance.vip/festivals
**PR:** https://github.com/razbakov/wedance-2026/pull/179

**Try it**
1. Open https://2026.wedance.vip/festivals
2. Click any festival card
3. You should see the festival detail page, not a 404
