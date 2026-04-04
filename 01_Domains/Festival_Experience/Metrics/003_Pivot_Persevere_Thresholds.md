# Pivot / Persevere Thresholds -- B2C Pilot Experiment

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Draft -- requires Partnership approval before pilot launch
**Requirement:** Requirement_002_Festival_Schedule (Experiment A: B2C)

---

## 1. Purpose

This document defines the exact numeric thresholds that determine whether the B2C pilot experiment is working, needs adjustment, or should trigger a strategic pivot. The Analyst detects and flags; the Partnership decides.

---

## 2. Persevere Criteria

All three must be met to declare the B2C experiment validated and proceed to Experiment B (organizer approach) and/or social coordination features.

| # | Metric | Target | How Measured | Rationale |
|---|--------|--------|-------------|-----------|
| P1 | Schedule open rate | >= 20% of estimated attendees | Unique `schedule_open` distinct_ids / conservative attendee estimate | Proves dancers will use a digital schedule when given the option |
| P2 | Return visits | >= 3.0 average sessions per visitor during festival phase | Mean session count for `festival_phase = during` | Proves the schedule is useful enough to come back to repeatedly |
| P3 | Organic shares | >= 1 share event detected (any type) | `share_initiated` events or arrivals with `utm_source = dancer_share` | Proves at least minimal viral loop potential |

**If all three are met:** Proceed with confidence. Approach the pilot festival's organizer with usage data (bridge to Experiment B). Begin planning social coordination features (Requirement 003).

**If P1 and P2 are met but P3 is not:** Proceed cautiously. The product has utility but no viral loop. Distribution will depend entirely on our own marketing effort for each festival. This is workable but not scalable.

---

## 3. Pivot Triggers

Any single trigger being hit warrants an urgent report to the Partnership with a recommendation. Two or more triggers hit simultaneously is a strong signal to pivot.

| # | Trigger | Threshold | What It Means | Recommended Response |
|---|---------|-----------|---------------|---------------------|
| T1 | Schedule open rate critically low | < 10% of generous attendee estimate | Even with the most favorable denominator, almost nobody opened it. Distribution channel failed, or dancers simply do not want this. | Investigate: Was the link actually shared? Did it reach enough people? If distribution was adequate, the value proposition is not compelling. |
| T2 | Return visits critically low | < 1.5 average sessions per visitor | Dancers open it once and never return. The schedule is not providing ongoing value during the festival. | Investigate: Are dancers using the static image instead? Is the schedule hard to find again? If discoverable but not revisited, the "interactive schedule" value prop is insufficient. |
| T3 | Zero organic shares | 0 `share_initiated` events AND 0 arrivals from `utm_source = dancer_share` after festival ends | No dancer found the schedule worth sharing. Zero viral coefficient. | This alone is not fatal (see P3 note above), but combined with low open rates, it signals the product is not compelling enough to talk about. |
| T4 | Extreme channel concentration | > 90% of visitors from a single utm_source | The schedule only reaches people through one channel. If that channel disappears (e.g., WhatsApp group admin removes the post), the experiment collapses. | Not a pivot trigger per se, but a risk flag. Diversify distribution channels for the next festival. |
| T5 | High bounce / low engagement | > 80% of visitors have zero interaction events (no filter, no workshop tap, no scroll past 25%) | Dancers open it but do not engage. Possible reasons: schedule is not better than the image, UX is confusing, or data is wrong. | Review with Designer: is the schedule usable? Review with Ops: is the data accurate? If both are fine, the format is not compelling. |

---

## 4. Evaluation Timeline

### 4.1 When to Evaluate

| Milestone | Timing | What Happens |
|-----------|--------|-------------|
| **Pre-launch check** | 1 day before sharing the link | Verify analytics are firing correctly. Run through the pre-pilot checklist. |
| **Soft signal check** | 24-48 hours after first share | First look at whether anyone is opening the link. If zero opens, investigate distribution immediately (link not shared? link broken? wrong group?). |
| **Mid-festival check** | Midpoint of the festival | Check open rate and return visits. If T1 is already triggered, consider a mid-festival distribution push (re-share the link with a different hook). |
| **End-of-festival report** | 1-2 days after festival ends | Full experiment report with all metrics. This is the primary evaluation point. |
| **Final assessment** | 1 week after festival ends | Account for any post-festival traffic. Lock all numbers. Partnership makes pivot/persevere decision. |

### 4.2 Decision Framework

```
After end-of-festival report:

  All persevere criteria met (P1 + P2 + P3)?
    YES --> Persevere. Approach organizer (Experiment B). Plan Requirement 003.
    NO  --> Which triggers were hit?

      T1 hit (< 10% opens)?
        Was distribution adequate?
          YES --> PIVOT: Value proposition not compelling. Rethink what
                  dancers need (maybe not a schedule -- maybe social features
                  first, or a different entry point).
          NO  --> ITERATE: Try again with better distribution at the next
                  festival. Not a pivot, but a failed distribution test.

      T2 hit (< 1.5 return visits)?
        Did dancers have a viable alternative (printed schedule, Instagram)?
          YES --> ITERATE: Need to be meaningfully better than the
                  alternative. Add features (personal plan, notifications).
          NO  --> PIVOT: Even without alternatives, dancers did not return.
                  The schedule format itself may not be valuable enough.

      T3 hit (zero shares)?
        Were P1 and P2 met?
          YES --> PROCEED with caution. Product works but does not spread.
                  Acceptable for now -- viral loop is a nice-to-have at
                  this stage.
          NO  --> Combined with other triggers, this reinforces a pivot signal.

      T5 hit (> 80% bounce)?
        --> INVESTIGATE before deciding. Could be UX, data quality, or
            fundamental value prop. Fix the obvious issues first, then
            re-test.
```

---

## 5. What "Pivot" Means in Practice

A pivot does NOT mean "shut down WeDance." It means the specific hypothesis -- "dancers will use a digital interactive schedule if someone converts it for them" -- was not validated. The Partnership would then choose from options like:

1. **Pivot the entry point:** Try social coordination (Requirement 003) as the first feature instead of the schedule. Maybe the social layer is what dancers actually want, not a better schedule.
2. **Pivot the distribution:** The product might work, but WhatsApp/Facebook is the wrong channel. Try in-person QR codes at the venue, or organizer-driven distribution (jump to Experiment B).
3. **Pivot the format:** Maybe the problem is not "static vs. interactive" but "hard to find." A simpler solution (a well-formatted webpage, not a full app) might be enough.
4. **Pivot the audience:** Maybe festival dancers are not the right first audience. Try weekly social dance events (higher frequency, lower stakes).

The Analyst will include a specific pivot recommendation with supporting data. The Partnership decides.

---

## 6. Summary Table

| Metric | Persevere (green) | Watch (yellow) | Pivot trigger (red) |
|--------|-------------------|----------------|-------------------|
| Schedule open rate | >= 20% (conservative) | 10-20% | < 10% (generous) |
| Return visits (avg) | >= 3.0 sessions | 1.5-3.0 sessions | < 1.5 sessions |
| Organic shares | >= 1 detected | -- | 0 after festival ends |
| Engagement (non-bounce) | >= 40% interact | 20-40% interact | < 20% interact |
| Channel concentration | Spread across 2+ sources | -- | > 90% single source |

---

*This document must be approved by the Partnership before the pilot launches. Once approved, these thresholds are locked -- they cannot be changed retroactively to make the data look better.*
