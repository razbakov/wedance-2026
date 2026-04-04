# Daily Monitoring Checklist -- Rovinj Summer Bachata Festival (Jun 5-8, 2026)

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Draft -- finalize 1 week before festival
**Festival:** Summer Bachata Festival, Rovinj, Croatia
**Festival dates:** June 5 (Fri) - June 8 (Mon), 2026
**Distribution start:** ~May 22 (T-14 per Decision 11)

---

## 1. Monitoring Schedule

| Date | Phase | Check Time | Priority |
|------|-------|------------|----------|
| May 22-Jun 4 | Pre-festival (distribution live) | Once daily, 9:00 AM CET | Normal |
| Jun 5 (Fri) | Festival Day 1 | 9:00 AM + 9:00 PM CET | High |
| Jun 6 (Sat) | Festival Day 2 | 9:00 AM + 9:00 PM CET | High |
| Jun 7 (Sun) | Festival Day 3 | 9:00 AM + 9:00 PM CET | High |
| Jun 8 (Mon) | Festival Day 4 (final) | 9:00 AM + 9:00 PM CET | High |
| Jun 9-15 | Post-festival | Once daily, 9:00 AM CET | Normal |

---

## 2. Morning Check (9:00 AM CET)

Open the PostHog dashboard "B2C Pilot - Summer Bachata Festival Rovinj" and run through this checklist. Each item takes 1-2 minutes.

### 2.1 Data Health (check first -- if data is broken, nothing else matters)

| Check | Where to Look | Healthy | Alert Threshold | Action |
|-------|--------------|---------|-----------------|--------|
| Events are flowing | Live Events tab | Events in the last hour | Zero events for 4+ hours during festival days | Notify Alex immediately -- possible tracking breakage |
| No error spikes | `schedule_load_error` trend | 0-2 per day | > 5 errors in a day | Notify Alex -- possible data or deployment issue |
| Page loads are fast | Panel 10 (Load Performance) | p50 < 2s, p95 < 3s | p95 > 5s | Notify Alex -- performance degradation |
| Bot traffic | Check for suspicious patterns | Normal user agents | Sudden spike of 100+ events from one distinct_id | Filter the ID from dashboards, do not count in metrics |

### 2.2 Core Metrics (the numbers that matter)

| Check | Where to Look | Record | Target (by festival end) | Pivot Threshold |
|-------|--------------|--------|-------------------------|-----------------|
| Unique visitors (cumulative) | Panel 1 | _____ visitors total | 20% of attendee estimate | < 10% of generous estimate |
| New visitors today | Panel 1 (daily bar) | _____ new today | Steady growth | Zero new visitors on a festival day |
| Return visitors (cumulative) | Panel 2 | _____% return rate | > 50% return | < 30% return |
| Total share events | Panel 4 | _____ shares total | >= 1 | Zero after Day 2 |
| Organic arrivals | Panel 5 | _____ organic visitors | >= 1 | Zero after Day 3 |

### 2.3 Engagement Quality

| Check | Where to Look | Record | Watch For |
|-------|--------------|--------|-----------|
| Engagement funnel drop-off | Panel 8 | Step 1>2: __%, Step 2>3: __%, Step 3>4: __% | > 80% drop at Step 1>2 (Pivot Trigger T5) |
| Top workshops | Panel 7 | Top 3: _____________ | Does interest match actual popular workshops? |
| Channel breakdown | Panel 3 | WhatsApp: __%, FB: __%, Organic: __%, Direct: __% | > 90% from one source (Pivot Trigger T4) |
| Device split | Panel 9 | Mobile: __%, Desktop: __% | If desktop > 50% during festival, investigate |

---

## 3. Evening Check (9:00 PM CET, festival days only)

Quick pulse check during the festival. Takes 5 minutes.

| Check | What to Look For | Action If Triggered |
|-------|-----------------|---------------------|
| Today's unique visitors | How many new visitors came today? | If zero on a festival day, check: was the link re-shared today? Is the app up? |
| Return visits today | Are yesterday's visitors coming back? | If Day 2+ and zero returns, the schedule is not providing ongoing value |
| Any share events today | Did anyone share? | Note for the daily log |
| Any errors | Check `schedule_load_error` | If errors appeared during the day, notify Alex for overnight fix |

---

## 4. Alert Thresholds and Escalation

### 4.1 Immediate Alerts (notify within 1 hour)

These suggest something is technically broken.

| Condition | Likely Cause | Notify | Via |
|-----------|-------------|--------|-----|
| Zero events for 4+ hours during festival | Tracking broken, app down, or PostHog issue | Alex | Direct message |
| `schedule_load_error` > 5 in 1 hour | Data file corrupt, API failure, or deployment broke something | Alex | Direct message |
| p95 load time > 10 seconds | Server issue, CDN problem, or data payload too large | Alex | Direct message |
| App returns HTTP 500 | Deployment or hosting issue | Alex | Direct message |

### 4.2 Same-Day Alerts (include in daily report)

These are concerning but not emergencies.

| Condition | What It Suggests | Notify | Recommended Action |
|-----------|-----------------|--------|--------------------|
| Zero new visitors on a festival day | Distribution failed -- link not visible or not shared | Partnership (both) | Re-share the link with a fresh hook. Check if WhatsApp/Facebook posts are still visible. |
| p95 load time > 5s | Performance degradation on mobile | Alex | Investigate mobile-specific issues. Check if schedule data grew larger than expected. |
| > 80% of visitors bounce (no engagement events) | UX issue or value prop problem | Partnership + Designer | Review the experience on mobile. Is the schedule data accurate? Is navigation clear? |
| > 90% of traffic from one channel | Distribution not diversified | Marketing Lead | Post in other channels. Diversify for the next day. |

### 4.3 End-of-Festival Alerts (Pivot Triggers)

These are evaluated after the festival ends (Jun 9-10). The Analyst produces the full experiment report.

| Trigger | Threshold | Evaluation |
|---------|-----------|------------|
| T1: Schedule open rate critically low | < 10% of generous attendee estimate | Requires full investigation before recommending pivot |
| T2: Return visits critically low | < 1.5 average sessions per visitor | Check: was there a viable alternative (printed schedule)? |
| T3: Zero organic shares | 0 share events AND 0 `dancer_share` arrivals | Combined with T1/T2 to assess severity |
| T4: Extreme channel concentration | > 90% from single `utm_source` | Risk flag, not a hard pivot trigger |
| T5: High bounce / low engagement | > 80% of visitors with zero interaction events | Investigate UX before concluding value prop failure |

---

## 5. Daily Log Template

Fill this out each morning and add to the running log for the week.

```
## [Date] -- Day [N] of Festival / Pre-festival Day [N]

### Data Health
- [ ] Events flowing: YES / NO
- [ ] Errors: _____ (count)
- [ ] Load time p95: _____ms

### Core Numbers
- Unique visitors (cumulative): _____
- New visitors today: _____
- Return visit rate: _____%
- Share events (cumulative): _____
- Organic arrivals (cumulative): _____

### Channel Breakdown
- WhatsApp: _____
- Facebook: _____
- Instagram: _____
- Dancer shares: _____
- Direct: _____

### Alerts Triggered
- [ ] None
- [ ] List any alerts: _____

### Notes
_____
```

---

## 6. Pre-Festival Preparation (complete by May 30)

Before the monitoring period begins, complete these preparation steps.

| Task | Owner | Deadline | Status |
|------|-------|----------|--------|
| PostHog project created and API key configured | Alex / Engineer | May 15 | Pending |
| Dashboard set up per 007_PostHog_Dashboard_Setup_Guide.md | Analyst | May 20 | Pending |
| Internal Team cohort created (Alex + Kirill distinct_ids excluded) | Analyst | May 20 | Pending |
| Verify all 13 events fire correctly in PostHog debug mode | Engineer + Analyst | May 22 | Pending |
| Gap 1 fixed (festival_phase property) | Engineer | May 22 | Pending |
| Gap 3 fixed (UTM auto-append on shares) | Engineer | May 22 | Pending |
| Attendee estimate locked (conservative + generous) | Analyst | May 25 | Pending |
| Festival date range configured for festival_phase computation | Engineer | May 25 | Pending |
| PostHog alerts configured (zero events, error spike, slow load) | Analyst | May 30 | Pending |
| Test the full monitoring checklist with real data | Analyst | Jun 1 | Pending |
| Link shared in first distribution channel | Marketing Lead + Kirill | May 22 | Pending |

---

## 7. Post-Festival Reporting

| Deliverable | Deadline | Description |
|-------------|----------|-------------|
| End-of-festival report | Jun 10 (2 days post) | Full metrics against all persevere criteria and pivot triggers |
| Final assessment | Jun 15 (1 week post) | Account for post-festival traffic tail. Lock all numbers. Include pivot/persevere recommendation. |
| Organizer case study data | Jun 17 | Package top workshop demand data and channel effectiveness for Partnership Manager (bridge to Experiment B) |

---

## 8. Communication Plan

| Who | What They Get | When | How |
|-----|--------------|------|-----|
| Alex | Immediate alerts (technical) | As they happen | Direct message |
| Partnership (Alex + Kirill) | Daily summary during festival | Each morning, Jun 5-8 | Message or brief written update |
| Partnership | End-of-festival report | Jun 10 | PR with full report in Metrics/ |
| Partnership | Final assessment + recommendation | Jun 15 | PR with recommendation document |
| Marketing Lead | Channel effectiveness data | Jun 10 | Included in end-of-festival report |
| Partnership Manager | Case study data | Jun 17 | Separate document for outreach use |

---

*This checklist will be updated as the festival approaches and real data becomes available. Final version to be reviewed by the Partnership by May 30.*
