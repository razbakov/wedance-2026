# Analytics Tracking Spec -- B2C Pilot Experiment

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Draft -- requires Engineer review for implementation
**Requirement:** Requirement_002_Festival_Schedule (Experiment A: Dancer-driven B2C)

---

## 1. Recommended Tool: PostHog

**Why PostHog:**
- Open-source, self-hostable (aligns with Policy 003 -- data privacy, GDPR, minimal collection)
- Event-based tracking with built-in funnels, retention, and session replay
- No cookie-banner requirement if self-hosted (first-party data only)
- Free tier (cloud) sufficient for pilot scale (dozens to low hundreds of users)

**Deployment recommendation:** PostHog Cloud for the pilot (faster setup, zero infrastructure cost at pilot scale). Migrate to self-hosted if/when data volume or privacy requirements warrant it. Alex to decide.

---

## 2. Naming Conventions

All event names use `snake_case`. Properties use `snake_case`. All events carry a base set of properties plus event-specific ones.

**Namespace prefix:** None for pilot (single product). If WeDance expands to multiple products, prefix with `festival_`.

---

## 3. Global Properties (attached to every event)

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `festival_id` | string | Unique ID for the festival | `munich-salsa-fest-2026` |
| `festival_name` | string | Human-readable festival name | `Munich Salsa Festival 2026` |
| `device_type` | string | Auto-detected by PostHog | `mobile`, `desktop`, `tablet` |
| `referrer_source` | string | UTM source or document.referrer | `whatsapp`, `facebook`, `direct` |
| `utm_source` | string | From URL parameter | `whatsapp` |
| `utm_medium` | string | From URL parameter | `social` |
| `utm_campaign` | string | From URL parameter | `pilot-launch` |
| `utm_content` | string | From URL parameter | `pre-festival-share` |
| `session_id` | string | PostHog auto-generated | (auto) |
| `distinct_id` | string | PostHog anonymous ID (no login) | (auto) |

---

## 4. Event Definitions

### 4.1 Page and Session Events

| Event Name | When Fired | Key Properties | Metric It Feeds |
|------------|-----------|----------------|-----------------|
| `$pageview` | Page loads (PostHog auto-capture) | `$current_url`, `$referrer` | Schedule opens, unique visitors |
| `schedule_open` | Schedule page fully renders with data | `festival_id`, `day_count`, `workshop_count` | "20% of attendees open the schedule" |
| `session_start` | PostHog auto (new session after 30min inactivity) | (auto) | Return visits |

**Why both `$pageview` and `schedule_open`?**
`$pageview` fires on page load. `schedule_open` fires only after the schedule data renders successfully. If the page errors or data fails to load, we see the gap. This matters for the denominator -- a pageview without rendered data is not a "schedule open."

### 4.2 Engagement Events

| Event Name | When Fired | Key Properties | Metric It Feeds |
|------------|-----------|----------------|-----------------|
| `filter_used` | User applies any filter | `filter_type` (`style`, `day`, `room`, `time`), `filter_value` | Engagement depth |
| `workshop_tapped` | User taps/clicks a workshop for details | `workshop_id`, `workshop_name`, `dance_style`, `artist`, `room`, `time_slot` | Content interest |
| `day_switched` | User switches between days | `from_day`, `to_day` | Multi-day engagement |
| `scroll_depth` | User scrolls past 25%, 50%, 75%, 100% of schedule | `depth_percent` | Content consumption |

### 4.3 Sharing and Virality Events

| Event Name | When Fired | Key Properties | Metric It Feeds |
|------------|-----------|----------------|-----------------|
| `share_initiated` | User taps the share button | `share_method` (`native_share`, `copy_link`, `whatsapp`, `facebook`) | Share intent |
| `link_copied` | Link is copied to clipboard | `shared_url`, `workshop_id` (if workshop-specific share) | Share execution |
| `share_completed` | Native share dialog completes (where detectable) | `share_target` (if available from Web Share API) | Actual shares |

**Limitation:** We cannot track whether a copied link is actually sent to someone. We measure *intent* (button tap) and *execution* (link copied), not *delivery*. UTM parameters on the shared link let us measure when the *recipient* opens it (see Section 5).

### 4.4 Return and Retention Events

| Event Name | When Fired | Key Properties | Metric It Feeds |
|------------|-----------|----------------|-----------------|
| `return_visit` | Custom: `schedule_open` fires and PostHog `$session_count > 1` | `session_number`, `days_since_first_visit`, `festival_phase` (`pre`, `during`, `post`) | "3+ return visits per dancer" |

**Implementation note:** `return_visit` is a computed event. PostHog tracks session count per distinct_id automatically. We fire this as a custom event when `schedule_open` occurs and it is not the user's first session. Alternatively, this can be computed purely in PostHog dashboards using the session count property -- Engineer to decide which approach is simpler.

### 4.5 Error and Performance Events

| Event Name | When Fired | Key Properties | Metric It Feeds |
|------------|-----------|----------------|-----------------|
| `schedule_load_error` | Schedule data fails to load | `error_type`, `error_message` | Data quality |
| `page_performance` | Page load completes | `load_time_ms`, `ttfb_ms` | "Under 3s on 3G" acceptance criterion |

---

## 5. UTM Parameter Strategy

Every link shared externally gets UTM parameters so we can attribute visits back to distribution channels. This is critical for understanding which channels drive the "20% of attendees" target.

### 5.1 UTM Schema

```
https://wedance.vip/festival/{festival-slug}?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

### 5.2 Predefined UTM Combinations

| Channel | utm_source | utm_medium | utm_campaign | utm_content |
|---------|-----------|------------|-------------|-------------|
| WhatsApp group (pre-festival) | `whatsapp` | `social` | `pilot-launch` | `pre-festival-share` |
| WhatsApp group (during festival) | `whatsapp` | `social` | `pilot-launch` | `during-festival-update` |
| Facebook event page | `facebook` | `social` | `pilot-launch` | `event-page-post` |
| Facebook group | `facebook` | `social` | `pilot-launch` | `group-post` |
| Instagram story | `instagram` | `social` | `pilot-launch` | `story-link` |
| Dancer shares (organic) | `dancer_share` | `referral` | `organic` | (empty or workshop ID) |
| Direct / unknown | (none) | (none) | (none) | (none) |

### 5.3 How Organic Shares Get UTMs

When a dancer taps "Share" or copies the link, the app appends UTM parameters automatically:

```
utm_source=dancer_share&utm_medium=referral&utm_campaign=organic
```

If the share is for a specific workshop, add `utm_content={workshop_id}`.

This lets us distinguish:
- **WeDance-initiated distribution** (our WhatsApp/Facebook posts) from
- **Dancer-initiated sharing** (organic viral loop)

### 5.4 UTM Discipline

- Marketing Lead maintains the canonical UTM list
- Every external link MUST use UTMs -- no bare URLs
- UTMs are appended server-side for share links, not relying on the dancer to preserve them
- PostHog captures UTMs automatically from URL parameters

---

## 6. Events-to-Metrics Mapping

| Experiment Metric | Source Events | Calculation |
|-------------------|--------------|-------------|
| Dancers who open the schedule | `schedule_open` (deduplicated by `distinct_id`) | Unique distinct_ids with at least one `schedule_open` event |
| 20% of attendees | Above count / estimated total attendees (see Measurement Plan) | Percentage |
| Return visits per dancer | `schedule_open` events per `distinct_id` with `session_number > 1` | Average session count per unique visitor |
| 3+ return visits | Distinct_ids with 3+ sessions containing `schedule_open` | Count and percentage |
| Organic shares | `share_initiated` + `link_copied` events | Count; plus visits with `utm_source=dancer_share` |
| Distribution channel effectiveness | `schedule_open` grouped by `utm_source` | Unique visitors per channel |
| Engagement depth | `filter_used`, `workshop_tapped`, `day_switched` | Actions per session |

---

## 7. What We Deliberately Do NOT Track

Per Policy 003 (Data and Privacy) and GDPR minimization:

- **No personal data** -- no names, emails, phone numbers. PostHog anonymous IDs only.
- **No precise geolocation** -- city-level from IP is acceptable (PostHog default), no GPS.
- **No cross-site tracking** -- no third-party cookies, no Facebook Pixel, no Google Analytics.
- **No session recordings for MVP** -- PostHog has this capability but we defer it. Enable only if needed for debugging, with disclosure.
- **No tracking of specific individuals** -- all analysis at aggregate or cohort level.

---

## 8. Implementation Checklist for Engineer

- [ ] Add PostHog JS snippet to the festival schedule page
- [ ] Configure PostHog project with festival ID as a group
- [ ] Implement `schedule_open` event (fires after data renders, not on page load)
- [ ] Implement `filter_used` event on all filter interactions
- [ ] Implement `workshop_tapped` event on workshop detail expansion/tap
- [ ] Implement `day_switched` event on day tab/section navigation
- [ ] Implement `share_initiated` and `link_copied` events on share UI
- [ ] Auto-append UTM parameters to all shareable links
- [ ] Implement `scroll_depth` tracking (25/50/75/100% thresholds)
- [ ] Implement `schedule_load_error` for failed data loads
- [ ] Implement `page_performance` event capturing load time
- [ ] Verify all events fire correctly in PostHog debug mode
- [ ] Verify UTM parameters are captured and parsed correctly
- [ ] Test on mobile (primary use case) and desktop

---

## 9. PostHog Dashboard Spec (for Engineer)

Create a single dashboard named "B2C Pilot -- {Festival Name}" with these panels:

1. **Unique Visitors** -- `schedule_open` unique distinct_ids, daily
2. **Return Visit Rate** -- % of visitors with 2+ sessions
3. **Visits by Channel** -- `schedule_open` grouped by `utm_source`
4. **Share Events** -- `share_initiated` count, daily
5. **Organic Arrivals** -- `schedule_open` where `utm_source = dancer_share`
6. **Filter Usage** -- `filter_used` by `filter_type`
7. **Top Workshops** -- `workshop_tapped` by `workshop_name`, ranked
8. **Engagement Funnel** -- `schedule_open` > `filter_used` > `workshop_tapped` > `share_initiated`
9. **Device Split** -- `schedule_open` by `device_type`
10. **Load Performance** -- `page_performance` p50 and p95 `load_time_ms`

---

*Next step: Engineer reviews this spec and estimates implementation effort. Analyst creates the PostHog dashboard once the project is provisioned.*
