---
title: "SEO City Directory Pages"
type: Story
id: WED-169
p: E812
linear_url: https://linear.app/wedance/issue/WED-169
audience: Dancer
cuj: "C3 — Regular — Find your floor (weekly socials, local scene)"
jtbd: "J3 — Never dance alone — go with people I know"
status: built
wsjf: TBD  # to score
origin: engineering-backlog (shipped 2026-07-18, commit 01d0282)
---

As a dancer searching Google, I want dedicated, SEO-friendly directory pages for a city's venues/organisers/artists, so the local scene is discoverable and indexable outside the app shell.

Shipped 2026-07-18 in [razbakov/wedance-2026@01d0282](https://github.com/razbakov/wedance-2026/commit/01d0282).

## What shipped
- New pages `/cities/[city]/{venues,organisers,artists}`.
- SSR-rendered via the cities Nitro endpoint (`server/api/cities/[slug].get.ts`).
- Data-driven `<title>`, canonical URL, `BreadcrumbList` + `ItemList` JSON-LD.
- Shared `CityDirectoryPage` component + `useCityDirectory` composable.

## Acceptance Criteria
- Each directory page renders server-side with a unique title and canonical.
- Structured data (BreadcrumbList + ItemList) is present in the SSR HTML.
- Pages are reachable from the city page's "All &lt;role&gt;" links.

Programmatic-SEO / discovery. Not a landing-promise. Pairs with [WED-168 City This-Week Filter](WED-168-city-this-week-filter.md).
