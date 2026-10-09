---
title: "SEO city directory pages (venues / organisers / artists)"
type: Task
id: RAZ-169
status: done
state: Done
state_type: completed
project: "WeDance"
labels: ["cuj:C3", "aud:Dancer", "jtbd:J3", "status:built", "Feature"]
assignee: "Messi"
creator: "Aleksey Razbakov"
priority: "Medium"
estimate: null
parent: null
created: 2026-07-18T11:36:37.319Z
started: "2026-10-05T16:15:52.731Z"
completed: "2026-10-09T09:12:29.272Z"
canceled: null
archived: null
deleted: false
links: []
linear_url: https://linear.app/alosha/issue/RAZ-169/seo-city-directory-pages-venues-organisers-artists
exported: 2026-10-09
---

# RAZ-169 — SEO city directory pages (venues / organisers / artists)

As a dancer searching Google, I want dedicated, SEO-friendly directory pages for a city's venues/organisers/artists, so the local scene is discoverable and indexable outside the app shell.

Shipped 2026-07-18 in [razbakov/wedance-2026@01d0282](<https://github.com/razbakov/wedance-2026/commit/01d0282>).

## What shipped

* New pages `/cities/[city]/{venues,organisers,artists}`.
* SSR-rendered via the cities Nitro endpoint (`server/api/cities/[slug].get.ts`).
* Data-driven `<title>`, canonical URL, `BreadcrumbList` + `ItemList` JSON-LD.
* Shared `CityDirectoryPage` component + `useCityDirectory` composable.

## Acceptance Criteria

* Each directory page renders server-side with a unique title and canonical.
* Structured data (BreadcrumbList + ItemList) is present in the SSR HTML.
* Pages are reachable from the city page's "All <role>" links.

---

Programmatic-SEO / discovery. Not a landing-promise. WSJF: to score.

## Comments

### Linear · 2026-10-09 08:43 UTC

This thread is for an agent session with forge.

### ↳ reply · Forge · 2026-10-09 08:48 UTC

All acceptance criteria are verified:

1. **Directory pages exist** at `app/pages/cities/[city]/{venues,organisers,artists}.vue` — all three use the shared `CityDirectoryPage` component.
2. **SSR-rendered with unique title and canonical** — `CityDirectoryPage.vue` uses `useHead()` with data-driven `title`, `description`, and `canonical` link (lines 75-85).
3. **Structured data** — `BreadcrumbList` + `ItemList` JSON-LD injected via `useHead` script tag (lines 50-73).
4. **Reachable from city page** — the "All <role>" link (`seeAllHref`) at line 534 links to the directory pages.
5. **Shared composable** — `useCityDirectory.ts` provides the SSR data fetch.

The commit `01d0282` is on main and deployed. This issue is already complete — the work shipped 2026-07-18 and all acceptance criteria are met in the current codebase.

```json
{
  "status": "done",
  "headline": "City directory pages al
