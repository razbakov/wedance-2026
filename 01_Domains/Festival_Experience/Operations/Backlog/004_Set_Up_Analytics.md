# Operations Item: Set Up Experiment Analytics

**Date:** 2026-04-04
**Status:** In Progress
**Assigned to:** Analyst + Engineer

## Description
Set up tracking to measure the B2C experiment metrics defined in Requirement 002. Must be in place before the pilot launch.

## What to track
- Unique visitors (page views)
- Return visits (returning users during festival)
- Referral source (UTM parameters — which channel drove the visit)
- Share events (if detectable — link copies, social shares)
- Time on page / interactions (filter usage)

## Tools
- PostHog or equivalent (Alex to decide)
- UTM parameters on all shared links

## Progress (2026-04-04)
- PostHog Cloud selected as analytics tool (Coordinator Decision 4)
- Analytics tracking spec written (Metrics/001_Analytics_Tracking_Spec.md -- 15 events)
- useAnalytics composable implemented in app with all 15 events
- PostHog client plugin created (app/plugins/posthog.client.ts)
- Measurement plan, pivot thresholds, baseline report template, and readiness checklist created
- PostHog project key: NOT YET CONFIGURED (needs NUXT_PUBLIC_POSTHOG_KEY env var on Vercel)
- Analyst needs to verify events fire correctly once PostHog is live

## Dependencies
- Interactive schedule MVP built (Operations item 001) -- DONE (app deployed)
- Alex provides analytics infrastructure access -- needs to create PostHog project and set env var
