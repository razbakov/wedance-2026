# Experiment 002: B2C Pilot Test -- Dancer-Driven Schedule Adoption

**Requirement:** Requirement_002_Festival_Schedule (Experiment A: Dancer-driven B2C)
**Domain:** Festival Experience
**Status:** Open
**Date:** 2026-04-04

## Hypothesis

If we convert a real festival's static schedule into an interactive, filterable web page and share the link in the festival's community channels, then at least 20% of festival attendees will open it and use it during the festival -- validating that dancers prefer an interactive schedule over a static image.

## Method

### Preparation (2-4 weeks before festival)
1. **Select pilot festival** (Governance item 002). Criteria: multi-day, 100+ attendees, salsa/bachata/kizomba, schedule available as static image, Alex or Kirill has community access.
2. **Convert schedule** (Operations item 002). Operations Manager extracts workshop data from the static schedule and enters it into structured format.
3. **Build MVP** (Operations item 001). Engineer builds the interactive schedule with: view (Story 005), style filter (Story 006), day/time filter (Story 007), share button with UTM (Story 008), mobile-first responsive layout (Story 009).
4. **Set up analytics** (Operations item 004). Analyst and Engineer configure tracking for all success metrics below.
5. **QA on real data.** Product Lead and Operations Manager verify the schedule is accurate and the experience works on mobile.

### Distribution (1-2 weeks before festival)
6. **Marketing Lead drafts share messages** (Operations item 003). Three variants: WhatsApp message, Facebook post, Instagram story. Kirill reviews and posts.
7. **Initial share** in festival WhatsApp group(s) and Facebook event page. Include UTM parameters per channel (`utm_source=whatsapp`, `utm_source=facebook`, `utm_source=instagram`).

### During festival (3-4 days)
8. **Re-share** on day 1 of the festival with a "schedule is live" hook.
9. **Monitor metrics daily.** Analyst checks unique visitors, return visits, and share events each evening.
10. **Collect qualitative feedback.** Alex or Kirill asks 5-10 dancers in person: "Did you use the schedule? What did you think? Would you share it?"

### Post-festival (1 week after)
11. **Compile results.** Analyst produces a report comparing actuals to success metrics.
12. **Pivot or persevere decision.** Partnership reviews results and decides next step.

## Success Metrics

| Metric | Target | How Measured | Pivot Trigger |
|--------|--------|-------------|---------------|
| Schedule opens (unique visitors) | 20%+ of attendees | Analytics: unique page views / estimated attendance | Below 10% -- rethink distribution channel or value proposition |
| Return visits | 3+ per dancer (median) | Analytics: returning visitors during festival dates | Below 1.5 -- schedule alone is not enough value to return |
| Organic shares | At least 5 dancers share unprompted | Analytics: page views from UTM `utm_medium=share` or referral without our UTM | Zero organic shares -- no viral loop, rethink the hook |
| Filter usage | 30%+ of visitors use at least one filter | Analytics: click events on style or day/time filters | Below 10% -- filters do not add value over a static list |
| Time to first useful view | Under 5 seconds on mobile | Analytics: page load + time to first interaction | Above 10 seconds -- performance kills adoption |

## Pivot Triggers (decision framework)

| Signal | Action |
|--------|--------|
| 20%+ open rate AND 3+ return visits | **Persevere.** Proceed to Experiment B (B2B organizer pitch) using this data as proof. |
| 10-20% open rate, decent return visits | **Iterate.** Improve distribution (try different channels, timing, messaging). Run one more pilot before deciding. |
| Below 10% open rate | **Pivot distribution.** The schedule may be valuable but we failed to reach dancers. Try: organizer-driven distribution (jump to Experiment B), or QR code at the venue. |
| Decent opens but below 1.5 return visits | **Pivot product.** Dancers looked once but did not come back. The schedule alone is not enough -- consider adding personal plan / bookmarking (Requirement 003 features) earlier. |
| Zero organic shares | **Pivot hook.** The product is not share-worthy. Add social features (who else is going to this workshop?) or improve the share incentive. |

## Timeline

| Phase | Duration | Depends On |
|-------|----------|------------|
| Pilot festival selected | 1 day | Partnership decision (Governance item 002) |
| Schedule converted | 2-3 days | Pilot selected + source schedule available |
| MVP built | 1-2 weeks | Specs delivered (this document + stories 005-009) |
| Analytics set up | 2-3 days | MVP built |
| QA + polish | 2-3 days | MVP + schedule data + analytics |
| Distribution | Starts 1-2 weeks before festival | MVP live + schedule published |
| Festival live | 3-4 days | Festival dates |
| Results compiled | 3-5 days after festival ends | Analytics data |
| Pivot/persevere decision | 1 day | Results report |

**Total elapsed time from pilot selection to decision: approximately 4-6 weeks.**

## Risks

| Risk | Mitigation |
|------|-----------|
| Festival schedule changes after we convert it | Build simple update process; communicate "last updated" timestamp on the page |
| Poor Wi-Fi at festival venue | Performance budget: <500KB page weight, <3s load on 3G (Story 009) |
| Low attendance at chosen festival | Select festival with 100+ confirmed attendees |
| WhatsApp group is inactive or moderated | Have a backup channel; consider posting from a known community member, not a brand account |
| Schedule data quality issues (wrong times, missing workshops) | QA pass with someone who has the original schedule; show "report an error" link |

## Notes
- This experiment tests Requirement 002, Experiment A (B2C path). It deliberately avoids organizer involvement to prove dancer-side demand independently.
- The 20% adoption target is calibrated against festival attendance, not ticket sales. Estimated attendance should be discussed with the pilot festival community to get a reasonable denominator.
- Qualitative feedback from 5-10 in-person conversations is as important as the quantitative metrics. Numbers tell us what happened; conversations tell us why.
