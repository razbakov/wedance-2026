# User Story: Mobile-Optimized Responsive View

**Requirement:** Operations/Backlog/001_Build_Interactive_Schedule_MVP.md
**Priority:** High
**Status:** In Progress

## Story
As a dancer at a festival using my phone, I want the schedule to be easy to read and interact with on a small screen so that I can check workshops between dances without frustration.

## Acceptance Criteria
- [ ] The schedule is usable on screens as narrow as 320px (iPhone SE) without horizontal scrolling
- [ ] All tap targets (filter buttons, day tabs, share button) meet minimum 44x44px touch target size
- [ ] Text is readable without zooming (minimum 16px body text)
- [ ] The layout adapts between mobile (<768px) and desktop (>=768px) viewports
- [ ] On mobile, workshops are displayed in a vertical list grouped by time slot (not a grid/timetable -- grids are unreadable on small screens)
- [ ] On desktop, a timetable grid layout (rooms as columns, time as rows) is acceptable if it improves scannability
- [ ] Filter controls are accessible without excessive scrolling (sticky header or collapsible filter bar)
- [ ] The page renders correctly in Safari (iOS) and Chrome (Android) -- these cover 95%+ of festival attendees
- [ ] No content is cut off or overlapping on any supported viewport
- [ ] Page weight is under 500KB total (HTML + CSS + JS + data) for fast loading on festival venue Wi-Fi

## Scope
**In scope:**
- Mobile-first responsive layout (design for mobile, enhance for desktop)
- Vertical list layout on mobile, optional grid on desktop
- Sticky or collapsible filter bar
- Performance budget: <500KB page weight, <3s load on 3G
- Testing on iOS Safari and Android Chrome

**Out of scope:**
- Native mobile app (web only for MVP)
- Offline support / service worker (potential v1.1 if festival venues have poor connectivity)
- Dark mode (not required for MVP)
- Landscape orientation optimization (portrait is the dominant use case)

## Dependencies
- Story 005 (View Festival Schedule) provides the base layout to make responsive
- Designer delivers mobile wireframes (see Feature Brief for Designer)

## Notes
- This is not a feature -- it is a quality attribute that applies to all other stories. It is written as a separate story because it carries its own acceptance criteria and testing scope, and the Designer needs an explicit brief for the mobile layout.
- Festival venues often have poor Wi-Fi and crowded cellular networks. The 500KB budget and 3G load time requirement exist because of this real-world constraint. If the page is slow, dancers will just look at the schedule photo someone posted in WhatsApp.
- The "better than a photo" bar is lowest on mobile: a photo is instant to view, can be pinched to zoom, and works offline. The interactive schedule must load fast and be scannable at a glance to compete.
- Consider: sticky "Now" indicator that auto-scrolls to the current time slot when the page loads during the festival. This makes the phone-in-hand use case (between dances, checking what is next) as fast as possible.

## Progress (2026-04-04)
- Tailwind CSS with responsive breakpoints configured
- Mobile-first layout with `max-w-4xl` container and responsive padding
- Workshop cards in responsive grid (`sm:grid-cols-2`)
- Designer review pending (Sprint 2 Decision: Designer to review deployed app and file issues)
- Sticky filter bar: not yet implemented
- Performance budget testing: not yet done
- iOS Safari / Android Chrome testing: not yet done
