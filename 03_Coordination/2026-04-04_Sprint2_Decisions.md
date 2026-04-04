# Coordinator Decisions — Sprint 2 (2026-04-04)

**Context:** Sprint 2 PRs #8-12 merged. App deployed to Vercel.

## Decision 6: Brand Color — Coral (#E8453C)

Accepted the Designer's proposal. Energetic, dance-appropriate, high contrast. Entire system recolors via one CSS variable if Kirill wants to adjust.

## Decision 7: Festival Theming — CSS Custom Properties

4 overridable tokens per festival (accent, header bg/text, banner). Core design system stays fixed. This lets organizers feel ownership while we keep consistency.

## Decision 8: Dark Mode — Skip for MVP

Not needed. Validate the product first, add polish later.

## Decision 9: Typography — System Fonts (Inter stack)

Faster load, free, hits the 500KB page budget. No custom typeface until post-validation.

## Decision 10: Logo Placement — "Powered by WeDance" Footer

Festival brand dominates the header. Small WeDance footer. Makes the B2B sell easier — organizers feel ownership.

## Decision 11: Rovinj B2C Timeline

- **May 1:** Kirill confirms channel access, Marketing open questions answered
- **May 15:** Hard escalation if real Rovinj schedule not published
- **May 22:** Real data handoff to Engineer (hard deadline), T-14 distribution starts
- **Jun 5-8:** Festival live

## Deployment

- **Production URL:** https://app-wedance.vercel.app
- **Vercel team:** wedance
- **PostHog:** Not yet configured (needs project key in env var)

## Next Sprint Recommendations

| Priority | Agent | Task |
|----------|-------|------|
| 1 | Engineer | Load Rovinj mock schedule into the app, apply festival theming |
| 2 | Engineer | Configure PostHog Cloud project, set NUXT_PUBLIC_POSTHOG_KEY env var |
| 3 | Designer | Review deployed app, file issues for visual polish |
| 4 | Analyst | Verify tracking events fire correctly once PostHog is live |
| 5 | Partnership Mgr | Draft outreach for fallback festivals (Budapest, Barcelona) |
| 6 | Marketing Lead | Begin channel access research — join Facebook groups for Rovinj |
