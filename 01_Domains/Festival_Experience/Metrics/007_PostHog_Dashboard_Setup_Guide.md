# PostHog Dashboard Setup Guide -- B2C Pilot

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Ready for use once PostHog Cloud project is created
**Prerequisites:** PostHog Cloud account created, `NUXT_PUBLIC_POSTHOG_KEY` set in Vercel env vars, events firing in debug mode

---

## 1. Project Setup

### 1.1 Create the PostHog Project

1. Go to https://eu.posthog.com (EU instance, per our GDPR policy)
2. Create a new project named **"WeDance - Festival Schedule"**
3. Copy the project API key
4. In Vercel dashboard: Settings > Environment Variables > add `NUXT_PUBLIC_POSTHOG_KEY` = the API key
5. Redeploy the app to pick up the new env var

### 1.2 Verify Events Are Firing

1. Open https://app-wedance.vercel.app in a browser
2. In PostHog, go to **Activity > Live Events**
3. Confirm you see: `$pageview`, `schedule_open`, and any interaction events
4. If no events appear: check browser console for the `[posthog] NUXT_PUBLIC_POSTHOG_KEY not set` warning

### 1.3 Set Up Internal Team Filtering

Before doing anything else, exclude your own traffic from dashboards.

1. Go to **Data Management > Cohorts**
2. Create a cohort named **"Internal Team"**
3. Definition: Persons where `$initial_browser` matches your test browsers OR manually add your `distinct_id` values
4. Alternative quick method: open the app, go to PostHog **Activity > Persons**, find your person record, and tag it
5. You will apply a "NOT in cohort Internal Team" filter to every dashboard panel

---

## 2. Create the Dashboard

1. Go to **Dashboards > New Dashboard**
2. Name it: **"B2C Pilot - Summer Bachata Festival Rovinj"**
3. Description: "Primary experiment dashboard for the B2C pilot (Requirement 002, Experiment A). Tracks schedule opens, return visits, shares, and engagement."
4. Add 10 panels as described below

---

## 3. Panel Configurations

### Panel 1: Unique Visitors (Trend)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Event | `schedule_open` |
| Aggregation | Unique users (distinct_id) |
| Date range | Last 14 days (adjust to festival window) |
| Display | Line chart, daily granularity |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** How many unique dancers opened the schedule each day? This is the numerator for our "20% of attendees" metric.

**How to read it:** During the festival (Jun 5-8), look for the total unique count across all 4 days. Compare to the pre-locked attendee estimate denominator.

### Panel 2: Return Visit Rate (Trend)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Series A | `schedule_open` -- Unique users (total unique visitors) |
| Series B | `return_visit` -- Unique users (visitors with 2+ sessions) |
| Formula | B / A * 100 (shows percentage) |
| Date range | Last 14 days |
| Display | Number (single stat) showing the current percentage |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** What percentage of dancers who opened the schedule came back at least once?

**Target:** Ideally many visitors return 3+ times. If this percentage stays below 30%, most visitors are one-and-done.

### Panel 3: Visits by Channel (Breakdown)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Event | `schedule_open` |
| Aggregation | Unique users |
| Breakdown | Property: `utm_source` |
| Date range | Last 14 days |
| Display | Stacked bar chart, daily |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** Which distribution channel is driving the most traffic? WhatsApp, Facebook, dancer shares, or direct?

**How to read it:** Look for the dominant source. If > 90% comes from one source, flag as Pivot Trigger T4 (extreme channel concentration). Healthy distribution shows at least 2 meaningful sources.

**UTM source values to expect:**
- `whatsapp` -- our posts in WhatsApp groups
- `facebook` -- our posts in Facebook groups/events
- `instagram` -- our Instagram story links
- `dancer_share` -- organic shares by dancers (critical for virality)
- `(none)` / `$none` -- direct traffic or untagged links

### Panel 4: Share Events (Trend)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Series A | `share_initiated` -- Total count |
| Series B | `link_copied` -- Total count |
| Series C | `share_completed` -- Total count |
| Date range | Last 14 days |
| Display | Line chart, daily |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** Are dancers sharing the schedule? The funnel from intent (initiated) to execution (copied/completed) shows friction.

**Target:** At least 1 share event during the festival (Persevere criterion P3). If zero after the festival ends, Pivot Trigger T3 is hit.

### Panel 5: Organic Arrivals (Trend)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Event | `schedule_open` |
| Aggregation | Unique users |
| Date range | Last 14 days |
| Display | Number (single stat) |
| Filter | `utm_source` = `dancer_share` AND NOT in cohort "Internal Team" |

**What it answers:** How many NEW visitors arrived because a dancer shared the link with them? This proves the viral loop works.

**How to read it:** Any number > 0 here means organic sharing is generating real traffic. The ratio of organic arrivals to total share events tells you the conversion rate of shares-to-visits.

### Panel 6: Filter Usage by Type (Breakdown)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Event | `filter_used` |
| Aggregation | Total count |
| Breakdown | Property: `filter_type` |
| Date range | Last 14 days |
| Display | Horizontal bar chart (total counts) |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** Which filters do dancers use? Style, day, room, or time? This tells us what dancers care about when planning.

**How to read it:** The most-used filter type indicates the primary decision dimension for dancers. If `style` dominates, dancers plan by dance style. If `day` dominates, they plan day-by-day. This insight informs product priorities.

### Panel 7: Top Workshops (Table)

**Type:** Trends (displayed as table)

| Setting | Value |
|---------|-------|
| Event | `workshop_tapped` |
| Aggregation | Total count |
| Breakdown | Property: `workshop_name` |
| Date range | Last 14 days |
| Display | Table, sorted descending by count |
| Limit | Top 20 |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** Which workshops generate the most interest? This is the demand signal that organizers will value in Experiment B.

**How to read it:** The top workshops represent the highest-demand content. Compare to actual workshop capacity. If a workshop is both high-interest and low-capacity, that is a room-planning insight we can offer organizers.

### Panel 8: Engagement Funnel

**Type:** Funnels

| Setting | Value |
|---------|-------|
| Step 1 | `schedule_open` |
| Step 2 | `filter_used` OR `workshop_tapped` OR `day_switched` (any engagement) |
| Step 3 | `workshop_tapped` |
| Step 4 | `share_initiated` |
| Conversion window | 1 day |
| Aggregation | Unique users |
| Date range | Last 14 days |
| Display | Funnel visualization (vertical or horizontal) |
| Filter | NOT in cohort "Internal Team" |

**Setup notes for the "any engagement" step:**

PostHog funnels support "any of" event matching. For Step 2, add all three events as alternatives:
1. Click "Add step" after Step 1
2. In the step event selector, choose `filter_used`
3. Click the "+" button to add alternative events to the same step
4. Add `workshop_tapped` and `day_switched` as alternatives

**What it answers:** Of the dancers who open the schedule, how many engage? Of those who engage, how many tap a specific workshop? Of those, how many share? This is the core product funnel.

**How to read it:** The biggest drop-off point reveals the product's weakest link. If 80%+ drop off between Step 1 and Step 2, Pivot Trigger T5 (high bounce) is hit. If the drop-off is between Steps 3 and 4, the share affordance needs improvement.

### Panel 9: Device Split (Breakdown)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Event | `schedule_open` |
| Aggregation | Unique users |
| Breakdown | Property: `$device_type` (PostHog built-in) |
| Date range | Last 14 days |
| Display | Pie chart |
| Filter | NOT in cohort "Internal Team" |

**What it answers:** Are dancers using the schedule on mobile or desktop? We expect 80%+ mobile at a festival.

**How to read it:** If desktop traffic is surprisingly high during the festival, dancers may be planning ahead on their computers rather than using the schedule on-site. If mobile performance is poor (see Panel 10), this could explain low return visits.

### Panel 10: Load Performance (Trend)

**Type:** Trends

| Setting | Value |
|---------|-------|
| Series A | `page_performance` -- Aggregation: p50 of `load_time_ms` |
| Series B | `page_performance` -- Aggregation: p95 of `load_time_ms` |
| Date range | Last 14 days |
| Display | Line chart, daily |
| Filter | NOT in cohort "Internal Team" |

**Setup notes for percentile aggregation:**

1. Select event `page_performance`
2. Change aggregation from "Total count" to "Property value - p50"
3. Select property `load_time_ms`
4. Duplicate the series and change the second to "p95"

**What it answers:** Is the page loading fast enough? Our acceptance criterion is under 3 seconds on 3G.

**How to read it:** p50 is the median user experience. p95 catches the worst-case. If p95 > 3000ms, investigate -- slow loads on mobile could explain low engagement. If p50 > 3000ms, the page is too slow for most users and this is an urgent engineering issue.

---

## 4. UTM Attribution Breakdown

Beyond the per-panel UTM breakdown in Panel 3, set up a dedicated attribution view.

### 4.1 Create a UTM Attribution Insight

1. Go to **Insights > New Insight > Trends**
2. Event: `schedule_open`, Unique users
3. Add a **multi-breakdown**: Property `utm_source` then `utm_medium` then `utm_campaign`
4. Display as table
5. Save as **"UTM Attribution Detail"** (add to the dashboard or keep as a separate saved insight)

### 4.2 Interpreting UTM Data

| utm_source | utm_medium | utm_campaign | What It Means |
|-----------|-----------|-------------|---------------|
| `whatsapp` | `social` | `pilot-launch` | Our official WhatsApp group posts |
| `facebook` | `social` | `pilot-launch` | Our official Facebook group/event posts |
| `instagram` | `social` | `pilot-launch` | Our Instagram story links |
| `dancer_share` | `referral` | `organic` | A dancer shared the link with someone |
| `(none)` | `(none)` | `(none)` | Direct traffic -- typed URL, bookmark, or untagged link |

### 4.3 Channel Effectiveness Report

For the weekly report, pull this table from PostHog:

| Channel | Unique Visitors | % of Total | Cost (effort) | Efficiency |
|---------|----------------|-----------|----------------|------------|
| WhatsApp | ? | ?% | Low (one post) | High/Low |
| Facebook | ? | ?% | Low (one post) | High/Low |
| Instagram | ? | ?% | Medium (story) | High/Low |
| Dancer shares | ? | ?% | Zero (organic) | -- |
| Direct | ? | ?% | Unknown | -- |

---

## 5. Return Visit Cohort Setup

### 5.1 Create the "Return Visitor" Cohort

1. Go to **Data Management > Cohorts**
2. Create new cohort: **"Return Visitors (2+ sessions)"**
3. Definition: Persons who performed `schedule_open` at least 2 times, with at least 2 different values of `$session_id`
4. Alternative definition (simpler): Persons who performed `return_visit` at least 1 time

### 5.2 Create the "Power User" Cohort

1. Create new cohort: **"Power Users (4+ sessions)"**
2. Definition: Persons who performed `schedule_open` at least 4 times, with at least 4 different values of `$session_id`
3. This cohort represents dancers who hit our "3+ return visits" target (4 total sessions = 1 initial + 3 returns)

### 5.3 Create the "Festival Active" Cohort

1. Create new cohort: **"Festival Active (during-phase visitors)"**
2. Definition: Persons who performed `schedule_open` at least 1 time where `festival_phase` = `during`
3. Note: This requires Gap 1 from the verification report to be fixed (the `festival_phase` property)

### 5.4 Using Cohorts in Analysis

These cohorts unlock powerful comparisons:

| Analysis | How |
|----------|-----|
| Return visitor engagement | Compare filter/workshop/share usage between "Return Visitors" and "All visitors" |
| Channel quality | Break down "Return Visitors" by `utm_source` -- which channel brings back repeat users? |
| Power user behavior | What do "Power Users" do differently? More filters? More workshops tapped? |
| Festival phase analysis | How does behavior change between pre/during/post festival? |

---

## 6. Alerts (Optional but Recommended)

PostHog supports alerts on insights. Set up these alerts before the Rovinj pilot:

| Alert | Condition | Notify |
|-------|-----------|--------|
| Zero events for 12 hours | `schedule_open` count = 0 for 12h during Jun 5-8 | Alex (engineering issue) |
| p95 load time > 5s | `page_performance` p95 `load_time_ms` > 5000 | Alex (performance issue) |
| Error spike | `schedule_load_error` count > 5 in 1 hour | Alex (data issue) |

Set up via: **Insights > (select insight) > Subscriptions > New subscription** or use PostHog webhooks.

---

## 7. Dashboard Maintenance

| Task | Frequency | Who |
|------|-----------|-----|
| Check dashboard is loading correctly | Daily during festival | Analyst |
| Update date range filter | Weekly / per festival | Analyst |
| Review and update cohort definitions | Per festival | Analyst |
| Export key metrics for weekly report | Weekly | Analyst |
| Archive festival dashboard after final report | 2 weeks post-festival | Analyst |

---

*This guide should be used alongside the 001_Analytics_Tracking_Spec.md and 002_Measurement_Plan.md. The dashboard is the operational view; the measurement plan defines what the numbers mean.*
