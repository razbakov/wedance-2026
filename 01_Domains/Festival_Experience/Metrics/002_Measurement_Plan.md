# Measurement Plan -- "20% of Attendees Open the Schedule"

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Draft -- requires Partnership review
**Requirement:** Requirement_002_Festival_Schedule (Experiment A: B2C)

---

## 1. The Core Question

> Did at least 20% of festival attendees open the interactive schedule?

This is the primary success metric for the B2C pilot. Getting the answer right requires defining three things precisely: who counts as an "attendee," what counts as "opening the schedule," and what counts as a "return visit."

---

## 2. Estimating the Denominator: Total Attendees

We will not have access to the organizer's ticket sales data (this is a B2C experiment -- no organizer involvement). We must estimate.

### 2.1 Estimation Methods (in order of reliability)

| Method | How | Confidence | Notes |
|--------|-----|-----------|-------|
| **A. Organizer's public claim** | Festival website, social media, or past-year reports often state "500+ dancers" or similar | Medium | May be inflated for marketing. Use as upper bound. |
| **B. Facebook event / group size** | Count "Going" + "Interested" on Facebook event, or group member count | Medium | "Interested" overstates actual attendance. "Going" is closer but still inflated. |
| **C. Venue capacity** | Research the venue's max capacity for dance events | Low-Medium | Gives a ceiling, not actual attendance. |
| **D. Community estimate** | Ask Alex/Kirill (who have festival experience) for their estimate | Medium | Informed judgment, but still an estimate. |
| **E. Post-festival organizer data** | After the pilot, approach organizer with results and ask for actual ticket count | High | Only available after the experiment. Useful for retroactive accuracy. |

### 2.2 Recommended Approach

Use **two estimates** and report against both:

1. **Conservative estimate** = Facebook "Going" count (or lowest credible public number)
2. **Generous estimate** = Organizer's public claim (or highest credible number)

Report the metric as a range:

> "Between X% (conservative) and Y% (generous) of attendees opened the schedule."

**Example:** If the organizer claims 400 attendees and 120 are marked "Going" on Facebook:
- 50 unique opens = **42% (conservative, /120)** to **12.5% (generous, /400)**
- This range tells us: "We definitely passed 10% (pivot threshold) but may or may not have hit 20% (success target)."

### 2.3 Locking the Denominator

The denominator MUST be recorded **before the pilot launches**, not after. This prevents unconscious bias in choosing a denominator that makes the metric look better or worse.

**Pre-launch action item:**
- [ ] Record conservative attendee estimate with source
- [ ] Record generous attendee estimate with source
- [ ] Both estimates documented in the baseline report before launch day

---

## 3. Measuring Unique Opens (the Numerator)

### 3.1 Definition

A "schedule open" = a unique anonymous visitor who loaded the schedule page and the schedule data rendered successfully (the `schedule_open` event fired).

### 3.2 Deduplication

PostHog assigns each browser a `distinct_id` (stored in a first-party cookie or localStorage). One person using one device = one unique visitor across all their sessions.

**Known limitations:**
- Same person, two devices (phone + laptop) = counted as 2 unique visitors. At a festival, most dancers use their phone, so this is minor.
- Cleared cookies / incognito = counted as a new visitor. Likely rare for this use case.
- Multiple people sharing a device = counted as 1 visitor. Unlikely at a festival.

**Net effect:** We likely slightly overcount unique opens (due to multi-device). At pilot scale (dozens of users), this is not material. Flag it in reports.

### 3.3 What Does NOT Count as an Open

- A page load where the schedule data fails to render (`schedule_load_error` without a subsequent `schedule_open`)
- A bot or crawler visit (PostHog filters known bots by default; verify this is enabled)
- Internal team visits (set up a PostHog filter to exclude known team members by distinct_id or IP -- see Section 5)

---

## 4. Defining "Return Visit"

### 4.1 Definition

A "return visit" = a `schedule_open` event from a `distinct_id` that has previously had at least one `schedule_open` in an earlier session.

PostHog defines a session as activity separated by 30 minutes of inactivity.

### 4.2 What Counts

| Scenario | Return Visit? | Why |
|----------|--------------|-----|
| Dancer opens schedule Monday, opens again Tuesday | Yes | Different sessions, different days |
| Dancer opens schedule, closes tab, opens 2 hours later | Yes | New session (30min+ gap) |
| Dancer opens schedule, scrolls, filters for 20 minutes | No (single session) | Continuous activity within one session |
| Dancer opens schedule, locks phone for 45 minutes, unlocks | Yes | 30min+ inactivity = new session |
| Dancer opens schedule on phone, then on laptop | Yes (but also a dedup issue) | Different distinct_ids |

### 4.3 Target: "3+ Return Visits per Dancer"

This means the average dancer who opens the schedule should come back at least 3 more times (4 total sessions). We measure this as:

- **Metric A (average):** Mean session count per distinct_id where session count >= 1. Target: >= 4.0.
- **Metric B (cohort):** % of unique visitors with 3+ return visits (4+ total sessions). No specific target set -- this is a distribution question.

**Pivot threshold:** Average return visits below 1.5 (meaning most dancers open it once or twice and never come back).

### 4.4 Festival Phase Tagging

Return visits have different meaning depending on when they happen:

| Phase | Time Window | What It Means |
|-------|-------------|---------------|
| `pre` | Before festival day 1 | Planning ahead -- high intent signal |
| `during` | Festival day 1 through last day | Active use at the event -- primary value |
| `post` | After the last festival day | Nostalgia or looking for recordings/photos -- low priority |

Tag each `schedule_open` with `festival_phase` based on the festival's date range (configured per festival). This lets us measure: "Do dancers return *during* the festival?" which is the real question.

---

## 5. Excluding Internal Traffic

Before the pilot, the team will test the schedule extensively. This traffic must not inflate metrics.

### 5.1 Approach

1. Create a PostHog cohort called "Internal Team"
2. Add team members' distinct_ids after they visit the schedule in testing
3. All dashboards and reports filter out this cohort
4. Alternatively: filter by IP address if the team shares a known IP

### 5.2 Team Members to Exclude

- Alex Razbakov (all devices used for testing)
- Kirill Korshikov (all devices used for testing)
- Any other tester identified during QA

---

## 6. Confidence and Sample Size

### 6.1 Expected Scale

A typical target festival has 100-400 attendees. If 20% open the schedule, that is 20-80 unique visitors. This is a very small sample.

### 6.2 What Small Samples Mean

- **We can determine "roughly 20% opened it" vs. "roughly 5% opened it."** The difference between these is meaningful and visible even at n=30.
- **We cannot determine precise percentages.** "18% vs. 22%" is indistinguishable at this scale.
- **We can see obvious patterns.** If 50 visitors all come from WhatsApp and zero from Facebook, that is a real signal.
- **We cannot do statistical significance tests.** No A/B testing, no confidence intervals that matter at n=50.

### 6.3 Reporting Approach

Every report will include:

```
SAMPLE SIZE NOTE: This pilot has approximately N unique visitors against
an estimated M attendees. At this scale, treat percentages as directional
(clearly above/below threshold) rather than precise. Differences smaller
than +/-10 percentage points are not meaningful.
```

---

## 7. Summary: What We Measure and How

| What | How | Tool | Confidence |
|------|-----|------|-----------|
| Total attendees (denominator) | Pre-locked estimates from public sources | Manual | Medium (range, not point estimate) |
| Unique schedule opens (numerator) | `schedule_open` unique distinct_ids | PostHog | High (standard web analytics) |
| Open rate (primary metric) | Numerator / denominator | Calculated | Medium (denominator uncertainty) |
| Return visits per dancer | Sessions per distinct_id | PostHog | High |
| Organic shares | `share_initiated` events + `utm_source=dancer_share` arrivals | PostHog | Medium (undercounts -- not all shares are trackable) |
| Channel attribution | `utm_source` on `schedule_open` | PostHog | High (for UTM-tagged links); low (for direct/untagged) |

---

*Next step: Partnership locks the pilot festival. Analyst records the attendee estimates. Engineer implements tracking per the Analytics Tracking Spec.*
