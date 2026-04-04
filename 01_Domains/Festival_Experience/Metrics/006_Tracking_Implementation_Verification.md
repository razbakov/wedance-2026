# Tracking Implementation Verification Report

**Author:** Analyst Agent
**Date:** 2026-04-04
**Status:** Review required by Engineer + Alex
**Spec:** 001_Analytics_Tracking_Spec.md
**Implementation:** `app/app/composables/useAnalytics.ts`, `app/app/plugins/posthog.client.ts`

---

## 1. Summary

The Engineer's implementation covers 13 of 13 specified events and the core global property system. The PostHog plugin is well-configured for privacy (no autocapture, no session recording, persistence enabled for return visit detection). Five gaps were identified -- three are functional gaps that will affect metric accuracy, and two are minor issues.

| Category | Aligned | Gaps | Notes |
|----------|---------|------|-------|
| Events (13 total) | 13 | 0 | All events implemented |
| Event properties | 33 of 38 | 5 missing | See Section 3 |
| Global properties | 9 of 9 | 0 | All present (some auto, some manual) |
| UTM capture | Partial | 1 gap | Auto-append on share links not implemented |
| PostHog config | Aligned | 0 | Privacy settings match Policy 003 |
| Pageview tracking | Aligned | 1 minor | `$referrer` not explicitly passed |

**Overall assessment:** Implementation is solid. The gaps are addressable in a focused follow-up. None are blockers for initial deployment, but Gap 1 (festival_phase) and Gap 3 (UTM auto-append on shares) must be resolved before the Rovinj pilot to ensure metric accuracy.

---

## 2. Event-by-Event Verification

### 2.1 Page and Session Events

| Event | Spec | Implementation | Status |
|-------|------|----------------|--------|
| `$pageview` | Auto-capture on page load | Manual capture via `router.afterEach` in posthog.client.ts. Sends `$current_url`. | ALIGNED. Manual capture is actually better -- gives control over when it fires. |
| `schedule_open` | Fires after schedule data renders. Properties: `festival_id`, `day_count`, `workshop_count` | `trackScheduleOpen(dayCount, workshopCount)`. Attaches festival context via `withContext()`. | ALIGNED |
| `session_start` | PostHog auto (30min inactivity) | Not in app code. PostHog handles this. | ALIGNED (no code needed) |

### 2.2 Engagement Events

| Event | Spec | Implementation | Status |
|-------|------|----------------|--------|
| `filter_used` | Properties: `filter_type`, `filter_value` | `trackFilterUsed(filterType, filterValue)`. Type-safe enum for filter types. | ALIGNED |
| `workshop_tapped` | Properties: `workshop_id`, `workshop_name`, `dance_style`, `artist`, `room`, `time_slot` | `trackWorkshopTapped(workshop)`. All 6 properties mapped. `time_slot` combines `day` + `startTime`. | ALIGNED |
| `day_switched` | Properties: `from_day`, `to_day` | `trackDaySwitched(fromDay, toDay)`. Nullable parameters. | ALIGNED |
| `scroll_depth` | Properties: `depth_percent` (25/50/75/100 thresholds) | `trackScrollDepth()`. Fires at all 4 thresholds. Uses `Set` to prevent duplicate fires. Returns cleanup function. | ALIGNED (minor note: caller must invoke cleanup on unmount -- see Gap 5) |

### 2.3 Sharing and Virality Events

| Event | Spec | Implementation | Status |
|-------|------|----------------|--------|
| `share_initiated` | Properties: `share_method`, `workshop_id` (optional) | `trackShareInitiated(shareMethod, workshopId?)`. Type-safe enum for share methods. | ALIGNED |
| `link_copied` | Properties: `shared_url`, `workshop_id` (optional) | `trackLinkCopied(sharedUrl, workshopId?)`. Both properties present. | ALIGNED |
| `share_completed` | Properties: `share_target` (if available) | `trackShareCompleted(shareTarget?)`. Optional target. | ALIGNED |

### 2.4 Return and Retention Events

| Event | Spec | Implementation | Status |
|-------|------|----------------|--------|
| `return_visit` | Properties: `session_number`, `days_since_first_visit`, `festival_phase` | Fired inside `trackScheduleOpen` when `$session_count > 1`. Only sends `session_number`. | GAP -- missing 2 properties (see Gap 1) |

### 2.5 Error and Performance Events

| Event | Spec | Implementation | Status |
|-------|------|----------------|--------|
| `schedule_load_error` | Properties: `error_type`, `error_message` | `trackScheduleLoadError(errorType, errorMessage)`. Both properties present. | ALIGNED |
| `page_performance` | Properties: `load_time_ms`, `ttfb_ms` | `trackPagePerformance()`. Uses PerformanceNavigationTiming API. Handles SSR (`typeof window` check). Waits for load event. | ALIGNED |

### 2.6 Global Properties

| Property | Spec | Implementation | Status |
|----------|------|----------------|--------|
| `festival_id` | String, e.g. `munich-salsa-fest-2026` | Built from `festival.city + festival.startDate` in `setFestivalContext()` | ALIGNED |
| `festival_name` | Human-readable | Taken from `festival.name` | ALIGNED |
| `device_type` | PostHog auto-detected | PostHog handles | ALIGNED |
| `referrer_source` | `document.referrer` hostname | Captured in `captureUtmParams()` in posthog.client.ts | ALIGNED |
| `utm_source` | From URL param | Captured via `posthog.register()` as super property | ALIGNED |
| `utm_medium` | From URL param | Same | ALIGNED |
| `utm_campaign` | From URL param | Same | ALIGNED |
| `utm_content` | From URL param | Same | ALIGNED |
| `session_id` | PostHog auto | PostHog handles | ALIGNED |
| `distinct_id` | PostHog anonymous ID | PostHog handles; `persistence: 'localStorage+cookie'` ensures cross-session stability | ALIGNED |

---

## 3. Gaps Found

### Gap 1: `return_visit` missing `days_since_first_visit` and `festival_phase` [MUST FIX]

**Spec says:** The `return_visit` event should include `session_number`, `days_since_first_visit`, and `festival_phase` (`pre`, `during`, `post`).

**Implementation sends:** Only `session_number`.

**Impact:** Without `festival_phase`, we cannot distinguish pre-festival planning visits from during-festival active use. This is critical for the "3+ return visits during the festival" metric defined in the measurement plan (Section 4.4). Without `days_since_first_visit`, we lose insight into visit cadence.

**Recommended fix:** Add festival date range to `FestivalMetadata` (if not already present). Compute `festival_phase` based on current date vs. festival start/end dates. Compute `days_since_first_visit` using PostHog's `$initial_timestamp` person property or by storing the first visit timestamp in localStorage.

```typescript
// Example implementation sketch
function getFestivalPhase(startDate: string, endDate: string): 'pre' | 'during' | 'post' {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (now < start) return 'pre'
  if (now > end) return 'post'
  return 'during'
}
```

### Gap 2: `$pageview` does not pass `$referrer` explicitly [LOW PRIORITY]

**Spec says:** `$pageview` should carry `$current_url` and `$referrer`.

**Implementation sends:** Only `$current_url` in the manual `posthog.capture('$pageview', ...)` call.

**Impact:** Minimal. PostHog automatically captures `$referrer` from browser context on the initial page load. For SPA route changes, `$referrer` is less meaningful (it would be the initial entry page's referrer for every subsequent route change). The current approach is actually correct behavior for an SPA.

**Recommendation:** No change needed. PostHog handles this correctly at the SDK level.

### Gap 3: No UTM auto-append on share links [MUST FIX]

**Spec Section 5.3 says:** When a dancer taps "Share" or copies the link, the app should automatically append `utm_source=dancer_share&utm_medium=referral&utm_campaign=organic` (plus `utm_content={workshop_id}` for workshop-specific shares).

**Implementation:** `trackShareInitiated` and `trackLinkCopied` fire tracking events but do not modify the URL that gets shared. The UTM-appending logic for outgoing share links is not present in `useAnalytics.ts`.

**Impact:** This is critical for measuring organic viral loops. Without UTM parameters on dancer-shared links, we cannot distinguish organic arrivals from direct traffic. The "organic shares" metric (Persevere criterion P3) depends on seeing `utm_source=dancer_share` on incoming visits.

**Recommended fix:** Add a `getShareUrl(baseUrl: string, workshopId?: string): string` function to `useAnalytics.ts` that appends the organic share UTM parameters. The share UI components should use this function to generate the URL before copying/sharing it.

```typescript
function getShareUrl(baseUrl: string, workshopId?: string): string {
  const url = new URL(baseUrl)
  url.searchParams.set('utm_source', 'dancer_share')
  url.searchParams.set('utm_medium', 'referral')
  url.searchParams.set('utm_campaign', 'organic')
  if (workshopId) {
    url.searchParams.set('utm_content', workshopId)
  }
  return url.toString()
}
```

### Gap 4: No `utm_term` capture [LOW PRIORITY]

**Spec does not define `utm_term`** and the implementation does not capture it. This is not a gap per se -- just noting that `utm_term` is a standard UTM parameter that is not used in our schema. No action needed unless the Marketing Lead requests it.

### Gap 5: `trackScrollDepth` cleanup responsibility [MINOR]

**Implementation:** `trackScrollDepth()` returns a cleanup function that removes the scroll listener. The spec does not address cleanup.

**Potential issue:** If the calling component does not invoke the cleanup function on unmount, scroll listeners could accumulate on route changes within the SPA. The `fired` Set prevents duplicate threshold events within a single call, but if `trackScrollDepth` is called again without cleanup, thresholds could fire multiple times (once per uncleaned listener).

**Recommended fix:** Document in the composable's JSDoc that the cleanup function MUST be called in the component's `onUnmounted` hook. Alternatively, use `onUnmounted` internally if the composable is always called within a Vue component setup context.

---

## 4. PostHog Plugin Configuration Review

| Setting | Value | Assessment |
|---------|-------|------------|
| `autocapture` | `false` | Correct. We define explicit events per the spec. Autocapture would create noise. |
| `capture_pageview` | `false` | Correct. Manual pageview capture via router hook gives SPA-accurate tracking. |
| `capture_pageleave` | `true` | Good. Helps measure session duration and last-seen pages. |
| `disable_session_recording` | `true` | Correct. Per spec Section 7 -- no session recordings for MVP. |
| `persistence` | `'localStorage+cookie'` | Correct. Essential for return visit detection across sessions. |
| `advanced_disable_feature_flags` | `true` | Fine. We do not use feature flags yet. Reduces SDK overhead. |
| `api_host` | `'https://eu.i.posthog.com'` | Correct. EU endpoint is appropriate for GDPR compliance (Policy 003). |

No configuration issues found. The PostHog setup is privacy-conscious and aligned with both the tracking spec and Policy 003.

---

## 5. Priority Summary

| Gap | Priority | Blocker for Pilot? | Effort Estimate |
|-----|----------|---------------------|-----------------|
| Gap 1: `festival_phase` + `days_since_first_visit` | MUST FIX | Yes -- affects core return visit metric | Small (1 function + 2 properties) |
| Gap 3: UTM auto-append on share links | MUST FIX | Yes -- affects organic shares metric (P3) | Small (1 function + integration in share UI) |
| Gap 5: Scroll depth cleanup docs | MINOR | No | Trivial (JSDoc update) |
| Gap 2: `$referrer` on `$pageview` | LOW | No | None (PostHog handles it) |

**Recommendation to Partnership:** The implementation is well-built and closely follows the spec. The two MUST FIX gaps should be addressed in the next Engineering sprint (before the Rovinj pilot in June). They are small changes with high metric impact.

---

*Verified by: Analyst Agent, 2026-04-04*
