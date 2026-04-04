# Pre-Pilot Readiness Checklist

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Draft -- to be completed before pilot launch
**Purpose:** Everything on this list must be true before the first link is shared with dancers. Launching without these items creates data quality problems that cannot be fixed retroactively.

---

## Instructions

Each item must be marked as Done with a date and who confirmed it. If an item is not applicable, mark it N/A with a reason. Do NOT launch with any Required item unchecked.

---

## 1. Festival Selection and Data [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 1.1 | Pilot festival selected by Partnership | Partnership | [ ] | | Governance/Backlog/002 |
| 1.2 | Conservative attendee estimate recorded with source | Analyst | [ ] | | Must be locked before launch |
| 1.3 | Generous attendee estimate recorded with source | Analyst | [ ] | | Must be locked before launch |
| 1.4 | Festival date range confirmed (for phase tagging) | Ops Manager | [ ] | | Needed for pre/during/post classification |
| 1.5 | Schedule data converted and verified against source | Ops Manager | [ ] | | Operations/Backlog/002 |
| 1.6 | All workshops have: name, artist, time, room, style | Ops Manager | [ ] | | Data completeness check |

---

## 2. Product / MVP [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 2.1 | Interactive schedule page live and accessible via URL | Engineer | [ ] | | Operations/Backlog/001 |
| 2.2 | Schedule displays correctly on mobile (primary device) | Engineer | [ ] | | Test on iOS Safari + Android Chrome minimum |
| 2.3 | Filters working: by style, by day | Engineer | [ ] | | |
| 2.4 | Share button present and functional | Engineer | [ ] | | Must append UTM parameters automatically |
| 2.5 | Page loads in under 3 seconds on 3G | Engineer | [ ] | | Acceptance criterion from user story 005 |
| 2.6 | Empty state handled (schedule data missing) | Engineer | [ ] | | Graceful error, not a crash |
| 2.7 | Privacy policy page published | Partnership | [ ] | | Governance/Backlog/003 |

---

## 3. Analytics Infrastructure [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 3.1 | PostHog project created and configured | Engineer + Alex | [ ] | | Cloud or self-hosted -- Alex decides |
| 3.2 | PostHog JS snippet installed on schedule page | Engineer | [ ] | | |
| 3.3 | `schedule_open` event fires on data render | Engineer | [ ] | | Not on page load -- on successful data render |
| 3.4 | `filter_used` event fires on filter interaction | Engineer | [ ] | | Include filter_type and filter_value |
| 3.5 | `workshop_tapped` event fires on workshop tap/click | Engineer | [ ] | | Include workshop_id, name, style |
| 3.6 | `share_initiated` and `link_copied` events fire | Engineer | [ ] | | |
| 3.7 | UTM parameters captured automatically by PostHog | Engineer | [ ] | | Verify in debug mode |
| 3.8 | Share links auto-append UTM (utm_source=dancer_share) | Engineer | [ ] | | |
| 3.9 | `scroll_depth` tracking active | Engineer | [ ] | | 25/50/75/100% thresholds |
| 3.10 | `schedule_load_error` event fires on data load failure | Engineer | [ ] | | |
| 3.11 | `page_performance` event captures load time | Engineer | [ ] | | |
| 3.12 | Bot traffic filtered (PostHog default bot filtering on) | Engineer | [ ] | | |
| 3.13 | Internal team traffic identifiable and filterable | Analyst + Engineer | [ ] | | Team distinct_ids or IP filter |
| 3.14 | PostHog dashboard created per spec (10 panels) | Analyst + Engineer | [ ] | | See Analytics Tracking Spec section 9 |

---

## 4. Analytics Verification [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 4.1 | All events verified in PostHog debug/live mode | Analyst + Engineer | [ ] | | Walk through every user action |
| 4.2 | UTM parameters tested end-to-end | Analyst | [ ] | | Click a UTM-tagged link, verify it appears in PostHog |
| 4.3 | Dashboard shows correct data from test visits | Analyst | [ ] | | All 10 panels rendering |
| 4.4 | Internal team visits appear and can be filtered out | Analyst | [ ] | | |
| 4.5 | Mobile testing: events fire correctly on phone | Engineer | [ ] | | Test on real device, not just desktop emulation |

---

## 5. Distribution Preparation [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 5.1 | Distribution channels identified | Marketing Lead | [ ] | | Which WhatsApp groups, Facebook groups/events |
| 5.2 | Kirill has access to post in those channels | Kirill | [ ] | | Agent drafts, Kirill posts (Policy 001) |
| 5.3 | Share messages drafted with UTM-tagged links | Marketing Lead | [ ] | | One per channel, each with correct UTMs |
| 5.4 | Share timing planned (1-2 weeks before festival) | Marketing Lead | [ ] | | Operations/Backlog/003 |
| 5.5 | Re-share message drafted (during festival) | Marketing Lead | [ ] | | "Updated schedule" hook |

---

## 6. Governance and Thresholds [Required]

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 6.1 | Pivot/persevere thresholds reviewed and approved | Partnership | [ ] | | See 003_Pivot_Persevere_Thresholds.md |
| 6.2 | Evaluation timeline confirmed | Partnership | [ ] | | Soft signal, mid-festival, end-of-festival, final |
| 6.3 | Baseline report created with all pre-launch data | Analyst | [ ] | | See 004_Baseline_Report_Template.md |

---

## 7. Nice-to-Have (not blocking launch)

| # | Item | Owner | Status | Date | Notes |
|---|------|-------|--------|------|-------|
| 7.1 | Session replay enabled in PostHog | Engineer | [ ] | | Useful for UX debugging, not required for metrics |
| 7.2 | Day-switched event tracking | Engineer | [ ] | | Engagement signal but not a primary metric |
| 7.3 | QR code generated for in-person sharing at venue | Marketing Lead | [ ] | | Could boost distribution during festival |
| 7.4 | Schedule link added to festival's official channels | Partnership Manager | [ ] | | Requires organizer relationship -- B2B path |

---

## Sign-Off

| Role | Name | Approved? | Date |
|------|------|-----------|------|
| Partnership (Alex) | Alex Razbakov | [ ] | |
| Partnership (Kirill) | Kirill Korshikov | [ ] | |
| Engineer | (agent) | [ ] | |
| Analyst | (agent) | [ ] | |

---

## Launch Decision

**All Required items checked?** [ ] Yes / [ ] No

If No: **Do NOT share the link.** Fix the missing items first. Launching without analytics means we cannot measure the experiment, and the entire pilot is wasted.

If Yes: **Clear to launch.** Marketing Lead provides the share messages to Kirill, who posts them in the identified channels.

---

*This checklist is a living document. Update status as items are completed. Final version is archived with the experiment results.*
