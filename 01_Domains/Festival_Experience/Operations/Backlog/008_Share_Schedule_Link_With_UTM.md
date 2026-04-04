# User Story: Share Schedule Link with UTM Tracking

**Requirement:** Operations/Backlog/001_Build_Interactive_Schedule_MVP.md
**Priority:** High
**Status:** Open

## Story
As a dancer who found the interactive schedule useful, I want to share a link to it with my friends so that they can also use it, and the WeDance team can measure how the schedule spreads organically.

## Acceptance Criteria
- [ ] A visible "Share" button or icon is present on the schedule view
- [ ] Tapping "Share" opens the device native share sheet (Web Share API) on supported browsers
- [ ] On browsers that do not support the Web Share API, tapping "Share" copies the link to the clipboard with a confirmation toast ("Link copied!")
- [ ] The shared link includes UTM parameters: `utm_source=app`, `utm_medium=share`, `utm_campaign={festival_slug}`
- [ ] The shared link opens the same festival schedule (not a generic homepage)
- [ ] If a style or day filter is active, the shared link preserves the current filter state in the URL (e.g., query params)
- [ ] UTM parameters are stripped from the displayed URL if it is shown to the user (clean-looking link)
- [ ] All shared links are trackable in the analytics system (Operations item 004)

## Scope
**In scope:**
- Share button on the schedule page
- Web Share API with clipboard fallback
- UTM parameter generation (source, medium, campaign)
- Filter state encoded in URL (so shared links show the same filtered view)
- Link tracking via analytics (page views with UTM params)

**Out of scope:**
- Social media preview cards (Open Graph meta tags) -- valuable but separate task
- Generating unique per-user referral links
- In-app messaging or "invite a friend" flow
- Share counts displayed to the user

## Dependencies
- Story 005 (View Festival Schedule) must be built first
- Analytics setup (Operations item 004) should be in place to capture UTM data
- Festival has a URL slug defined (e.g., `/festival/munich-salsa-2026`)

## Notes
- Organic sharing is a key success metric for the B2C experiment (Requirement 002). If zero dancers share the link unprompted, the viral loop hypothesis fails. The share button reduces friction but does not guarantee sharing -- the schedule itself must be valuable enough to share.
- Filter state in URL is important: a bachata dancer shares the link filtered to bachata workshops, and the recipient sees exactly that. This makes the shared link more relevant.
- Consider adding a short text suggestion when sharing (e.g., "Check out the Munich Salsa Festival schedule!") that pre-fills in the share sheet. Keep it simple and editable.
- Open Graph tags (preview image + description when sharing on WhatsApp/Facebook) are out of scope for this story but strongly recommended as a fast follow-up. Without them, the shared link looks generic. Flag this to the Engineer.
