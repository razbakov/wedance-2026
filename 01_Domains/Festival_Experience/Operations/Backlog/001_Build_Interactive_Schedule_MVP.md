# Operations Item: Build Interactive Schedule MVP

**Date:** 2026-04-04
**Status:** In Progress
**Assigned to:** Product Lead → Engineer

## Description
Build the minimum feature set for the B2C experiment: an interactive festival schedule that dancers can view, filter, and share.

## Scope
- Display workshop schedule (time, room, style, artist)
- Filter by dance style
- Filter by time/day
- Shareable link (UTM tracking)
- Mobile-first (dancers will use phones at the festival)

## Out of scope (for MVP)
- User accounts / login
- Personal plan (mark workshops) — consider for v1.1
- Organizer dashboard (B2B experiment)
- Analytics dashboard (Analyst tracks manually)

## Progress (2026-04-04)
- Nuxt 4 app scaffolded and deployed to Vercel (https://app-wedance.vercel.app)
- Schedule view with day grouping and workshop cards built (Story 005)
- Dance style filter implemented (Story 006)
- Day filter implemented (Story 007)
- Analytics composable with all 15 PostHog events instrumented (Story 004)
- Mock Rovinj schedule data loaded (30 workshops, 4 rooms)
- Share button with UTM tracking: not yet implemented (Story 008)
- Mobile responsive polish: partially done, needs Designer review (Story 009)
- PostHog Cloud project: not yet configured (needs NUXT_PUBLIC_POSTHOG_KEY env var)
- Cookie consent banner: not yet implemented (needed for privacy compliance)

## Dependencies
- Product Lead delivers specs
- Designer delivers mobile wireframes
- Pilot festival selected (need a real schedule to build against)
