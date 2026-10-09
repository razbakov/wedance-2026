---
title: "RAZ-145 follow-up: set DATABASE_URL for Vercel Preview environment"
type: Task
id: RAZ-216
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
created: 2026-10-01T11:46:14.176Z
started: "2026-10-07T22:17:17.116Z"
completed: "2026-10-07T22:22:06.406Z"
canceled: null
archived: null
deleted: false
links: ["https://github.com/razbakov/wedance-2026/pull/172"]
linear_url: https://linear.app/alosha/issue/RAZ-216/raz-145-follow-up-set-database-url-for-vercel-preview-environment
exported: 2026-10-09
---

# RAZ-216 — RAZ-145 follow-up: set DATABASE_URL for Vercel Preview environment

Vercel Preview deployments for wedance-2026 have no DATABASE_URL, so any PR that touches a DB-backed page (e.g. /gigs) cannot be verified on the preview. Set a Neon branch or test DB connection string in the Vercel Preview env. From PR [https://github.com/razbakov/wedance-2026/pull/115](<https://github.com/razbakov/wedance-2026/pull/115>).

## Links

- [Set DATABASE_URL for Vercel Preview environment](https://github.com/razbakov/wedance-2026/pull/172)

## Comments

### Linear · 2026-10-07 22:17 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-07 22:22 UTC

### ✅ Done — Preview deployments now have DATABASE_URL for DB-backed pages


Nothing to try — internal change (Vercel env config + docs update).

### Forge · 2026-10-07 22:33 UTC

### ✅ Done — Preview deployments now have DATABASE_URL for DB-backed pages

**PR:** https://github.com/razbakov/wedance-2026/pull/172

Nothing to try — internal change (docs only — CLAUDE.md documents the Preview DATABASE_URL config added via vercel env add).
