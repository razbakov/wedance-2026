# What's Next -- Feature Roadmap After the Rovinj B2C Test

**Date:** 2026-04-04
**Context:** The Rovinj Summer Bachata Festival (Jun 5-8) is our early B2C test. This roadmap shows what comes after, sequenced by strategic priority and what we learn from each step.

---

## Current Phase: Festival Schedule MVP (now -- Jun 8)

What we are building and testing right now. See Operations Backlog items 001-009.

**Goal:** Validate that dancers will use an interactive schedule instead of a static image.

---

## Phase 1: Post-Rovinj Iteration (Jun 9 -- Sep 30)

Based on experiment results, iterate on the product before the main pilot.

### If Rovinj succeeds (20%+ adoption, 3+ return visits):

1. **Open Graph meta tags** -- Shared links on WhatsApp/Facebook show a preview card with festival name, date, and workshop count instead of a generic URL. High impact on share conversion. Low effort.

2. **Personal plan / bookmarking** -- Dancers tap a star on workshops to build "my schedule." Stored in localStorage (no login needed). This is the top feature that justifies return visits and makes the schedule stickier than a photo.

3. **"What's happening now" indicator** -- Auto-scroll to current time slot when the page loads during the festival. Reduces friction for the between-dances phone check.

4. **Cookie consent banner** -- Required for GDPR compliance before PostHog tracking activates. Must ship before or alongside PostHog going live.

5. **QR code for venue** -- Generate a printable QR code that links to the schedule. Organizer or WeDance team can post it at the festival venue. New distribution channel.

### If Rovinj underperforms (10-20% adoption):

6. **Improved distribution** -- Test different channels, share timing, and messaging. Try QR code at venue as a physical distribution channel.

7. **Embed widget** -- Let organizers embed the schedule on their own website as an iframe. Removes the "click a link" step and meets dancers where they already go.

### If Rovinj fails (<10% adoption):

- Pivot distribution strategy before building more features. See Experiment 002 pivot triggers.

---

## Phase 2: Bavarian Bachata Congress Pilot (Oct 23-25)

The main pilot with organizer relationship. This is the B2B test.

8. **Organizer pitch with Rovinj data** -- Use actual usage metrics from Rovinj to show Anna Milite what the schedule can do. Partnership Manager to update pitch deck.

9. **Festival theming** -- Apply Bavarian Bachata Congress branding (colors, logo, banner) using the CSS custom property system from Decision 7. The organizer sees their festival, not a generic app.

10. **Schedule change notifications** -- When workshops move or get cancelled, show a "last updated" timestamp and highlight changed items. Organizers change schedules frequently; this builds trust.

11. **Multi-room timetable grid (desktop)** -- For desktop/tablet users, display a visual grid with rooms as columns and time as rows. Better scannability for festivals with 4+ rooms and concurrent workshops.

---

## Phase 3: Meetup Planner Features (Nov 2026 -- Q1 2027)

Per the strategy, once Festival Schedule is validated, layer on social coordination to increase engagement and test willingness to pay.

12. **"Who's going?" social proof** -- Show how many people bookmarked each workshop. No login required -- just a count. Creates social proof and helps dancers pick between concurrent options.

13. **Ride sharing** -- Dancers post "driving from Munich, 2 seats free" or "looking for a ride from Vienna." Lightweight coordination that solves a real pain point for cross-city festivals.

14. **Room sharing** -- "Looking for a roommate at Hotel X" board. Similar to ride sharing but for accommodation. Festivals in destination cities (Rovinj, Barcelona) have high demand.

15. **Meal coordination** -- "Group dinner Saturday 7pm at Restaurant X" -- simple event within the event. Reduces WhatsApp group chaos.

16. **Partner matching** -- "Looking for a practice partner for Bachata Sensual, intermediate level, Saturday morning." Addresses the common anxiety of attending a festival solo.

---

## Phase 4: Monetization Exploration (Q2 2027)

Only after validating that social features drive engagement.

17. **Organizer analytics dashboard** -- Workshop demand (bookmarks per workshop), attendance heatmap, gender balance, style popularity. The B2B product we sell to organizers.

18. **Premium listing for organizers** -- Paid promotion of festivals within the WeDance discovery layer. The marketplace model.

19. **Dancer premium features** -- Personal calendar sync, push notifications for bookmarked workshops, early access to schedules. Subscription or one-time per-festival fee.

---

## Priority Principles

- **Ship only what the current experiment requires.** Everything else is a hypothesis.
- **Each phase validates the next.** Do not start Phase 3 until Phase 2 results are in.
- **Low-effort high-signal wins first.** Open Graph tags before partner matching.
- **Pivots are expected.** This roadmap changes based on what we learn at Rovinj and Munich.

---

## Key Dates

| Date | Milestone |
|------|-----------|
| May 22, 2026 | Rovinj app live with real data |
| Jun 5-8, 2026 | Rovinj B2C test live |
| Jun 15, 2026 | Rovinj results compiled, pivot/persevere decision |
| Jul 4, 2026 | Quarterly strategy review |
| Oct 23-25, 2026 | Bavarian Bachata Congress pilot |
| Nov 2026 | Meetup Planner features begin (if validated) |

---

*This roadmap is a planning tool, not a commitment. It will be revised after the Rovinj experiment results and at each quarterly review.*
