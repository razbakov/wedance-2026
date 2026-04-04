# Conversion Status Tracker -- Summer Bachata Festival Rovinj 2026

**Festival:** Summer Bachata Festival 2026 (SBF 2026)
**Dates:** June 5-8, 2026
**Location:** Rovinj, Croatia
**Coordinator Decision:** 2026-04-04 (Decision 2 -- Early B2C Test)

---

## Overall Status: MOCK DATA PREPARED -- AWAITING REAL SCHEDULE

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| Research & scoping | Done | 2026-04-04 | Pilot research + web scrape of official site |
| Source material collection | In progress | -- | Website monitored; no schedule published yet |
| Mock schedule creation | Done | 2026-04-04 | 30 workshops, 4 rooms, 13 instructor pairs |
| Real schedule extraction | Not started | -- | Blocked: schedule not yet published |
| Cross-reference & verify | Not started | -- | Requires real schedule |
| Quality checklist sign-off | Not started | -- | Requires real schedule |
| Handoff to Engineer | Not started | -- | Requires verified real schedule |
| Live on platform | Not started | -- | Requires Engineer deploy |

---

## Monitoring Cadence

| Check | Frequency | Next check | How |
|-------|-----------|------------|-----|
| Website schedule page | Weekly | 2026-04-11 | Visit summerbachatafestival.com |
| Instagram @summerbachatafestival | Weekly | 2026-04-11 | Check for schedule announcements |
| Artist lineup changes | Weekly | 2026-04-11 | Compare against confirmed list in notes.md |

---

## Key Dates & Deadlines

| Date | Event | Action needed |
|------|-------|---------------|
| 2026-04-04 | Today | Mock schedule created, monitoring starts |
| ~2026-05-01 | Expected schedule publication | Most festivals publish 4-6 weeks before; convert immediately |
| 2026-05-15 | Hard deadline for real data | If no schedule by this date, escalate to Alex |
| 2026-05-22 | App must be live with real data | 2 weeks before festival; Engineer needs time to deploy |
| 2026-06-04 | Day before festival | Final schedule check for last-minute changes |
| 2026-06-05 | Festival starts | Monitor for live schedule changes |
| 2026-06-08 | Festival ends | Collect usage data, hand off to Analyst |

---

## Quality Checklist (to complete when real schedule arrives)

- [ ] All workshops captured (count: __ / __)
- [ ] Times verified against source (timezone: Europe/Zagreb confirmed)
- [ ] Artist names spelled correctly (cross-referenced with website)
- [ ] Rooms/locations mapped to actual venue hall names
- [ ] Dance styles categorized per controlled vocabulary
- [ ] No duplicates
- [ ] No double-bookings (same room, same time)
- [ ] Day-of-week matches calendar date
- [ ] Workshop count per day matches source
- [ ] Start times are before end times for all entries

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schedule not published until late May | Medium | High | Mock data lets Engineer build the app now; swap data when ready |
| Last-minute artist cancellations | Medium | Medium | Monitor Instagram/website daily in final 2 weeks |
| Room names differ from mock assumptions | High | Low | Room IDs can be remapped quickly; schema is flexible |
| Schedule published as image only (no text) | Medium | Medium | Use vision capabilities to extract; may need manual verification |
| Festival cancellation (first edition risk) | Low | High | Escalate to Alex immediately; pivot to fallback festival |

---

## Change Log

| Date | Change | By |
|------|--------|----|
| 2026-04-04 | Initial mock schedule created (30 workshops). Research notes documented. Status tracker created. | Operations Manager |
