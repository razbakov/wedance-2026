# Requirement: Festival Social Connection

**Actor:** Dancers
**Domain:** Festival Experience

## Purpose

### Driver
Dancers traveling to multi-day festivals coordinate transport, accommodation, and social plans through fragmented WhatsApp threads and Facebook posts. Connections happen by luck rather than by design, and many dancers — especially solo travelers — miss out on the social experience beyond the dance floor.

### Requirement

**Dancers** need ways to find and connect with other attendees around shared logistics and social interests so that they can reduce travel friction, split costs, and build relationships beyond the dance floor.

## Priority
Medium — test after Festival Schedule is validated

## Type
Operations

---

## Experiment

**Hypothesis:** Dancers at festivals will pay €1 for access to structured social coordination if early adopters prove the concept works.

### Activities (MVP scope)
- **Share a Ride** — carpool matching by origin city
- **Share a Room** — roommate matching by dates/budget/preferences
- **Share a Meal** — group dinners (4-6 people, restaurant revealed day-of)
- **Discover Dancers** — partner matching by style/role/experience
- **Book a Taxi Dancer** — paid dance partner (future revenue stream)
- **Extra Activities** — community-proposed side activities (tours, flashmobs, beach socials)

### Pricing
| Tier | Price |
|------|-------|
| First 10 dancers per festival | FREE — seed community |
| Dancer 11+ | €1 per festival |

### Success metrics
| Metric | Target | Trigger (pivot threshold) |
|--------|--------|--------------------------|
| Sign-ups per festival | 10+ dancers | Below 5 → hook isn't compelling enough |
| Free spots filled | 10/10 within 1 week | Below 5 in 2 weeks → insufficient demand or awareness |
| Paid conversions | 5+ at €1 | Zero paid → willingness to pay not validated |
| Participation rate | 50%+ of sign-ups attend | Below 25% → sign-up ≠ intent, rethink commitment mechanism |
| NPS | 8+ | Below 6 → experience doesn't match expectation |

### What we deliberately skip in v1
Automated matching (manual first), in-app chat (use WhatsApp/Telegram), payment processing (Stripe links), user accounts (email + name only).

## Notes
Depends on having dancers on the platform via Festival Schedule. This is the engagement and monetization layer on top of the discovery foundation.
