# Coordinator Decisions — Sprint 3 (2026-04-04)

**Context:** Sprint 3 PRs #13-17 merged. App now shows Rovinj festival with real instructor lineup, theming, share flow, and "Now" indicator. 58 tests passing. Designer QA surfaced 28 issues. Analyst found 2 tracking gaps.

## Decision 12: Send Dance Casa outreach in parallel, not as fallback

Dance Casa (Budapest, Aug 28-30) happens before Bavarian Bachata Congress (Oct 23-25). If both say yes, Budapest becomes the first B2B pilot — more data, faster learning. Send both outreach messages to Kirill for review.

## Decision 13: Sprint 4 focus — fix P0 QA issues + tracking gaps

The app works but doesn't match the design spec. Before Rovinj (Jun 5), we need to fix the 6 P0 blockers and 2 tracking must-fixes. P1 items can wait for a polish sprint. P2 items are post-pilot.

**P0 fixes (Engineer):**
1. Layout: horizontal card rows per time slot (not vertical grid)
2. WorkshopCard: style-color left border, correct dimensions
3. CSS design tokens via custom properties
4. Dance style colors: solid palette with white text
5. Workshop detail bottom sheet
6. Share flow UI refinement

**Tracking fixes (Engineer):**
1. Add `festival_phase` to return_visit event
2. Auto-append organic UTM params to share links

## Decision 14: Privacy policy needs cookie consent banner

Product Lead's privacy policy requires a cookie consent banner before PostHog activates. Engineer must implement this. Legitimate interest (Art. 6(1)(f)) as legal basis, with opt-out via Do Not Track.

## Decision 15: Roadmap approved

Product Lead's 4-phase roadmap is the plan:
1. Jun-Sep: Post-Rovinj iteration
2. Oct: Bavarian Bachata Congress pilot
3. Nov 2026-Q1 2027: Meetup Planner
4. Q2 2027: Monetization

## Pending actions for founders

- **Alex:** Create PostHog Cloud project, set env var in Vercel
- **Kirill:** Review and send outreach to Anna Milite (Munich) AND Nino (Budapest)
- **Kirill:** Confirm brand color (#E8453C coral) or suggest alternative
