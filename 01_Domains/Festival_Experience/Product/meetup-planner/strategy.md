# WeDance Activities MVP — Business Strategy

**Date**: 2026-03-18
**Status**: Hypothesis validation phase

## Vision

WeDance becomes **"Timeleft for dance festivals"** — the social activity organizer that connects dancers around festival experiences beyond the dance floor.

## Hypothesis

> Dancers at festivals want to coordinate social activities (rides, rooms, meals, meetups, extras) with other attendees, and they'll pay €1 for access if early adopters prove the concept works.

## Target Customer

**Dancers attending multi-day dance festivals** (salsa, bachata, kizomba, etc.) who:

- Travel to festivals in other cities/countries
- Want to meet new people beyond the dance floor
- Need practical coordination (transport, accommodation)
- Are open to spontaneous social experiences

## Pricing Model

| Tier | Price | Purpose |
|------|-------|---------|
| First 10 dancers per festival | **FREE** | Seed the community, create content & social proof |
| Dancer 11+ | **€1** per festival | Low barrier, validate willingness to pay |

**Why first 10 free**: Creates urgency ("only 3 free spots left!"), seeds each activity with participants, and generates word-of-mouth.

**Why €1**: Eliminates non-serious sign-ups while keeping the barrier near zero. We're testing willingness to pay, not optimizing revenue yet.

## Activities (MVP Scope)

### 1. Share a Ride 🚗

Carpool matching for dancers traveling to the same festival.

- **Input**: Origin city, departure date/time, seats available, contribution expected
- **Matching**: Same origin region + compatible dates
- **Value**: Save money, meet people before the festival starts

### 2. Share a Room 🏠

Roommate matching for accommodation.

- **Input**: Dates, budget range, gender preference, accommodation type (hotel/Airbnb/hostel)
- **Matching**: Overlapping dates + budget range + preferences
- **Value**: Split costs, social from day one
- **Note**: Already have a "looking for roommate" toggle — extend this

### 3. Share a Meal 🍽️

Timeleft-style group dinners at local restaurants.

- **Input**: Available evenings, language preferences, group size preference
- **Matching**: Algorithm assigns 4-6 person groups, picks restaurant, reveals location day-of
- **Value**: Meet new friends in a structured, low-pressure setting
- **This is the core Timeleft concept adapted for festivals**

### 4. Discover Dancers 💃

Meet new dance partners and friends.

- **Input**: Dance styles, role (lead/follow), experience level
- **Matching**: Complementary roles + shared styles + mutual connections
- **Value**: Find partners for workshops and socials
- **Note**: Already have a Tinder-style component — this is an evolution

### 5. Book a Taxi Dancer 🎩

Pay for a guaranteed dance partner (for those who struggle to find partners).

- **Input**: Role needed, style, time slots
- **Matching**: Available taxi dancers who match criteria
- **Pricing**: Set by taxi dancer (e.g., €5-20/hour), WeDance takes commission
- **Value**: No one sits out; experienced dancers earn money
- **Future revenue stream**: Commission on bookings

### 6. Extra Activities 🌴

Unofficial/side activities organized by the community.

- **Types**: Guided city tours, dance flashmobs, beach socials, pre-parties, after-parties, cultural excursions
- **Input**: Interest + available time slots
- **Model**: Anyone can propose an activity, others join
- **Value**: Extends the festival experience beyond the venue

## What We Build First (Sprint 1)

### Minimum testable product:

1. **Activities listing page** per festival — show all 6 activity types
2. **Sign-up flow** — join an activity (name, contact, preferences)
3. **Paywall** — counter showing "X of 10 free spots taken", then €1 gate
4. **Activity cards** — show activity, participant count, status
5. **Manual matching** — we match people manually for v1 (no algorithm needed)
6. **WhatsApp/Telegram group links** — after matching, connect people via chat groups

### What we deliberately skip:

- Automated matching algorithm (manual first)
- In-app chat (use WhatsApp/Telegram)
- Payment processing (use Stripe payment links or manual)
- User accounts/auth (collect email + name only)
- Taxi dancer booking flow (complex, do later)

## Success Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Sign-ups per festival | 10+ dancers | First festival |
| Free spots filled | 10/10 | Within 1 week of launch |
| Paid conversions | 5+ at €1 | First festival |
| Activity participation rate | 50%+ of sign-ups attend | First festival |
| NPS from participants | 8+ | Post-activity survey |
| Repeat usage | 30%+ sign up for next festival | 3 months |

## Go-to-Market

1. **Pick one festival** as pilot (ideally one where we have connections)
2. **Create landing page** with activities for that specific festival
3. **Share in festival WhatsApp/Facebook groups** 1-2 weeks before
4. **First 10 free** creates urgency and word-of-mouth
5. **Post-festival**: collect testimonials, photos, stories
6. **Scale**: repeat for next festival with proven playbook

## Competitive Advantage

- **Timeleft** doesn't serve dance communities — generic social dining
- **Festival apps** focus on schedule only — no social coordination
- **Dance forums/groups** are unstructured — no matching, no coordination
- **WeDance** sits at the intersection: dance community + structured social experiences

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| No one signs up | Seed with 5 friends/ambassadors as first participants |
| People sign up but don't show | Small groups + WhatsApp coordination + day-of reminders |
| €1 too high/too low | Test. €1 is intentionally near-zero to test willingness to pay at all |
| Restaurants don't cooperate | Start with "meet at this bar" — no venue partnership needed |
| Legal/liability for meetups | Clear terms: WeDance facilitates introductions, not responsible for meetups |

## Next Steps

1. ✅ Define strategy (this document)
2. 🔲 Design activity cards and sign-up flow
3. 🔲 Build Activities page for one pilot festival
4. 🔲 Implement free-spot counter + €1 paywall
5. 🔲 Set up Stripe payment link for €1
6. 🔲 Pick pilot festival and launch date
7. 🔲 Create social media assets for promotion
8. 🔲 Launch and learn
