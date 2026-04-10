# SDTV Festival Client Portal — Notification & Commercial Follow-Up Strategy

- **Last updated:** 2026-04-10
- **Status:** Draft / Ready for review
- **Owner:** Marco (strategy) / Viktor (implementation)
- **Project:** SDTV

---

## Context

The SDTV client portal (`/portal/{event}`) serves festival organizers with: current project phase, package details, deliverable status tracking, next actions, contextual add-on suggestions, and content library. This strategy defines how the portal communicates with organizers outside their active visits — through email and optional Telegram — and how commercial suggestions are timed against delivery milestones.

**Design principle:** Every notification earns its right to exist. If a message does not help the organizer take action, celebrate a milestone, or understand their project status, it should not be sent.

---

## A. Notification Strategy — 3-Tier Approach

### Tier 1: Action Required
- **Channel:** Email + portal badge
- **Tone:** Clear, calm, specific. Never alarming.
- **Frequency:** Max 2 per week
- **Examples:** Review needed, deadline approaching, materials missing

### Tier 2: Milestone
- **Channel:** Email + portal status update
- **Tone:** Warm, professional, brief
- **Frequency:** 1 per deliverable batch (not per file)
- **Examples:** Social edits ready, aftermovie delivered, project complete

### Tier 3: Summary
- **Channel:** Email only
- **Tone:** Calm, structured, informative
- **Frequency:** Weekly during active phases. Paused when no activity for 10+ days.
- **Skips** if Tier 1/2 email was sent same day

### Cross-Tier Rules
1. Never more than 2 emails in a single day
2. Outside active delivery: max 1 email per 2 weeks
3. Every email has exactly one primary purpose
4. Language follows portal setting (EN/RU)

---

## B. Trigger Map — 16 Lifecycle Events

| # | Event | Tier | Commercial | Timing |
|---|-------|------|------------|--------|
| 1 | Contract signed | 2 | No | Within 2 hours |
| 2 | Pre-event: what we need from you | 1 | No | 4-6 weeks before event |
| 3 | Event coverage complete | 2 | Light footer | Within 24h after event |
| 4 | Teaser ready | 2 | No | Same day |
| 5 | Social edits delivered | 2 | Yes — distribution | Same day |
| 6 | Photo gallery delivered | 2 | Light footer | Same day |
| 7 | Aftermovie draft ready | 1 | No | Same day (highest stakes) |
| 8 | Review deadline 7 days | 1 | No | 7 days before expiry |
| 9 | Review deadline 3 days | 1 | No | 3 days before expiry |
| 10 | Aftermovie final delivered | 2 | Yes — visibility | Same day |
| 11 | Social Dance Videos delivered | 2 | No | Same day |
| 12 | All deliverables complete | 2 | Yes — renewal seed | When last item delivered |
| 13 | Weekly summary | 3 | No | Monday morning |
| 14 | 30-day review period expiring | 1 | No | 7 days before expiry |
| 15 | Post-project: 60 days after | 2 | Yes — renewal warm-up | 60 days post-complete |
| 16 | Renewal window | 2 | Yes — partnership | 3-4 months before next edition |

---

## C. Portal Notification Settings

4 simple toggles, accessible from portal footer or gear icon:

| Toggle | Default | Controls |
|--------|---------|----------|
| Deliverable notifications | ON | Tier 2 milestone emails |
| Review deadline reminders | ON | Tier 1 review emails |
| Weekly project summary | ON | Tier 3 digest |
| Telegram notifications (beta) | OFF | Mirror Tier 1 to Telegram |

Rules:
- Toggles 1+2 cannot both be OFF
- Welcome (#1), pre-event needs (#2), and project complete (#12) always sent
- Telegram only mirrors Tier 1, not Tier 2/3
- Settings stored per-event in `.portal-settings.json`

---

## D. Email Categories

### 1. Welcome / Onboarding
- Purpose: Confirm partnership, provide portal access
- Trigger: #1 (contract signed)
- Frequency: Once per project

### 2. Deliverable Ready
- Purpose: Something is available
- Triggers: #4, #5, #6, #10, #11
- Frequency: Max 1 per day (batch same-day items)
- May include 1 commercial paragraph (see Section E)

### 3. Action Required
- Purpose: Organizer needs to act
- Triggers: #2, #7, #8, #9, #14
- Frequency: Max 2 per week
- Never includes commercial content

### 4. Project Summary
- Purpose: Weekly status overview
- Trigger: #13
- Frequency: Weekly during active phases
- Never includes commercial content

### 5. Project Complete
- Purpose: Close the project, summarize everything
- Trigger: #12
- Frequency: Once per project
- Includes soft renewal seed

### 6. Renewal / Follow-Up
- Purpose: Re-engage for next edition
- Triggers: #15, #16
- Frequency: Max 2 total post-project
- Personal tone, from Kirill

---

## E. Commercial Timing — Upsell Logic Per Milestone

**Core principle:** Every commercial suggestion must feel like a natural extension of the work just delivered.

### Rules
- Only in Tier 2 (milestone) and Category 6 (renewal) emails
- Never in action-required or review reminder emails
- Maximum 5 commercial touchpoints per project lifecycle
- Minimum 7-day gap between commercial mentions
- No commercial content in weekly summaries

### Per-Milestone Upsell Map

| Milestone | Upsell | Framing |
|-----------|--------|---------|
| Social edits delivered | Distribution support | "If you'd also like these published through SDTV channels for additional reach..." |
| Aftermovie final | Visibility partnership | "Your aftermovie is a strong positioning asset. We can build a visibility plan around it..." |
| All complete | Next edition | "Many organizers find it useful to start the media conversation early..." |
| 60-day follow-up | Renewal warm-up | "We've been thinking about your next edition..." |
| Renewal window | Partnership proposal | Personal email, conversation invitation, not a pitch |

### Commercial Touch Budget Per Project

| # | Moment | Type | Gap |
|---|--------|------|-----|
| 1 | Event coverage complete | Footer hint only | — |
| 2 | Social edits delivered | In-email paragraph | 1-3 weeks |
| 3 | Aftermovie final | Dedicated paragraph | 1-4 weeks |
| 4 | All deliverables complete | Closing section | 0-2 weeks |
| 5 | 60-day follow-up | Full renewal warm-up | ~60 days |

---

## F. Wording Examples

### Social Edits Delivered

**Subject:** Your social edits are ready — [Festival Name]

> Your social edits from [Festival Name] are ready and available in your portal.
>
> **What's included:** [X] video edits, formatted for Instagram Reels and YouTube Shorts.
>
> A few notes on getting the most from these:
> - The first 48-72 hours tend to perform best while the event energy is fresh
> - Staggering posts (2-3 per week) keeps the event alive longer
> - Tagging artists in clips often triggers organic resharing
>
> If you'd also like these published through SDTV channels to reach the broader dance community, just let me know or tap "Interested" in your portal.

### Aftermovie Draft Ready

**Subject:** Aftermovie draft ready for your review — [Festival Name]

> The aftermovie draft for [Festival Name] is ready for your review.
>
> This is the moment for your input — anything you want adjusted, emphasized differently, or restructured.
>
> **How to share feedback:** Reply to this email with your notes. Specific timestamps help us work faster ("at 1:42, could we use the wide shot instead?"), but any format works.
>
> **Review window:** Please share feedback by [date]. If we don't hear from you by then, the current version will be considered approved.

### Review Deadline — 7 Days

**Subject:** 7 days left to review your aftermovie — [Festival Name]

> The review period for your [Festival Name] aftermovie closes on [date].
>
> If you have any feedback or changes, please share them before then so we can incorporate them into the final version. After [date], the current draft will be considered approved.
>
> If you've already reviewed it and are happy — no action needed.

### Project Complete + Soft Renewal

**Subject:** Everything delivered — [Festival Name] media package complete

> All deliverables for [Festival Name] are now complete and available in your portal.
>
> It was a strong event, and the content came together well — [specific genuine observation].
>
> As you start thinking about the next edition, the media approach is worth revisiting early. The festivals that get the strongest results tend to plan the media angle before the lineup is even announced.
>
> No rush on that conversation. When the timing is right, I'm happy to share a few ideas.

---

## G. V1 Implementation Plan

### V1 Scope: 6 Triggers

| Priority | Trigger | Why first |
|----------|---------|-----------|
| 1 | Contract signed (welcome) | Sets relationship tone |
| 2 | Aftermovie draft ready for review | Highest-stakes organizer action |
| 3 | Review deadline 7 days | Protects delivery timeline |
| 4 | Social edits delivered | Largest batch + commercial moment |
| 5 | All deliverables complete | Clean project close + renewal seed |
| 6 | Aftermovie final delivered | High emotional + commercial value |

### Defer to V2
- Weekly summary (high build cost)
- Telegram integration
- 3-day review reminder
- 60-day / renewal emails (keep manual)
- Portal notification settings UI
- Auto-send (V1 uses semi-automatic: preview + confirm)

### Infrastructure: Resend API
- Simple API, free tier (100/day, 3000/month)
- Verify domain: `portal.sdtv.studio` or `notify.sdtv.studio`
- 3 HTML templates: welcome, deliverable ready, review reminder
- Light theme for emails (dark emails break across clients)
- Single-column, max-width 600px, mobile-responsive

### Admin Panel Additions
- Organizer email field in Portal config
- Send trigger buttons per deliverable ("Notify: ready")
- Notification log (sent history)
- Review deadline date field
- Email language preference (inherit from portal)

### Key V1 Decision: Semi-Automatic
When admin changes status to "Delivered" → system prepares email preview → admin clicks "Send" to confirm. No fully automatic sends in V1.

### Build Estimate
| Component | Hours |
|-----------|-------|
| Resend setup + domain | 1 |
| 3 email HTML templates | 3-4 |
| `/api/admin/send-notification` endpoint | 2-3 |
| Admin panel: email, send buttons, log | 2-3 |
| Review deadline field | 1 |
| Testing with real data | 1-2 |
| **Total** | **10-14 hours** |

### V2 Roadmap
1. Auto-send with 15-min delay + cancel window
2. Weekly summary email
3. Portal notification settings UI
4. Telegram bot integration
5. 3-day review reminder
6. 60-day + renewal templated emails
7. Email open/click tracking via Resend analytics

---

---

## H. Welcome Email & Portal Onboarding

The first email sets the tone for the entire relationship. It is NOT just "here's your login" — it establishes what the portal is, what the organizer can expect, and how communication works.

### Welcome Email Structure

**Subject:** Your private SDTV workspace is ready — [Festival Name]

> Hi [FirstName],
>
> Your media partnership for [Festival Name] is confirmed, and your private portal is ready.
>
> **Your portal:** [deep link to /portal/EVENT]
> **Your access code:** [PIN]
>
> This is your single place for everything related to our work together:
> - See what's included in your package and what's in progress
> - Review drafts and approve deliverables
> - Access all delivered content (videos, photos, assets)
> - Know exactly what we need from you at any point
>
> **How updates work:**
> You'll receive an email when something is ready or when we need your input. No noise — only meaningful updates. You can adjust your notification preferences anytime inside the portal.
>
> **Your contact:** [ContactName], [ContactRole]
> Fastest way to reach me: [Telegram link]
> Email: [email]
>
> Looking forward to this one.
>
> [ContactName]
> Social Dance TV

### Onboarding Rules
- Sent within 2 hours of admin marking contract as signed
- Always includes portal URL + PIN
- Always includes contact info with primary channel highlighted
- Never includes commercial content
- Sets expectation for communication cadence

---

## I. Notification Preferences — Extended Model

### Data Model (per-event in portal settings)

```json
{
  "notifications": {
    "primaryEmail": "organizer@festival.com",
    "primaryName": "Maria",
    "secondaryEmail": "assistant@festival.com",
    "secondaryName": "Carlos",
    "language": "en",
    "weeklySummary": true,
    "upgradeSuggestions": true
  }
}
```

### Preference Rules

| Preference | Default | Behavior |
|------------|---------|----------|
| Primary recipient | Required | Receives all notifications |
| Secondary recipient | Optional | Receives Tier 2 (milestones) + weekly summary only. Does NOT receive Tier 1 (action required) — those go only to the decision-maker. |
| Language | EN | All emails in selected language. Syncs with portal lang toggle. |
| Weekly summary | ON | Can be turned off. Suppressed automatically when no progress (see Section K). |
| Upgrade suggestions | ON | Controls whether commercial paragraphs appear in milestone emails. If OFF, deliverable emails are pure notifications with no upsell content. |

### Portal UI — Settings Block

```
Notification Preferences
─────────────────────────────────────
Primary contact
  Name:  [Maria____________]
  Email: [organizer@fest.com]

Secondary contact (optional)
  Name:  [Carlos___________]
  Email: [assistant@fest.com]
  ℹ Receives delivery updates and weekly summaries only.

Email language         [EN ▼]
Weekly project summary [ON ]
Upgrade suggestions    [ON ]
─────────────────────────────────────
                              [Save]
```

### Admin Panel Support
- Notification preferences editable in Portal tab
- Admin can override language per-event
- Notification log shows: date, type, recipient(s), subject, status (sent/failed)

---

## J. Deep-Linking — Section-Level Portal URLs

Every email CTA should link directly to the relevant portal section, not the portal homepage.

### URL Structure

```
/portal/MAM26#deliverables
/portal/MAM26#actions
/portal/MAM26#content
/portal/MAM26#package
/portal/MAM26#inputs
```

### Implementation

Portal HTML sections get `id` attributes matching the hash:
```html
<div id="deliverables">...</div>
<div id="actions">...</div>
<div id="content">...</div>
```

After PIN verification, if URL contains a hash fragment, auto-scroll to that section:
```javascript
if (window.location.hash) {
  const target = document.querySelector(window.location.hash);
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

### Per-Email Deep Links

| Email type | CTA link |
|------------|----------|
| Welcome | `/portal/EVENT` (full portal, first visit) |
| Deliverable ready | `/portal/EVENT#deliverables` |
| Review needed | `/portal/EVENT#deliverables` |
| Action required (inputs) | `/portal/EVENT#inputs` |
| Weekly summary | `/portal/EVENT` (overview) |
| Project complete | `/portal/EVENT#content` |

---

## K. Weekly Summary Suppression

### Rule
Do NOT send a weekly summary if all of the following are true:
1. No deliverable status changed in the last 7 days
2. No new client inputs were marked as received
3. No pending organizer actions were added or resolved
4. No Tier 1 or Tier 2 email was sent in the last 7 days

### Logic
```
if (no_status_changes AND no_input_changes AND no_action_changes AND no_recent_emails):
    skip_weekly_summary()
```

### Suppression Message (optional)
If suppressed for 2+ consecutive weeks, send a brief "still here" note:

> Hi [FirstName],
>
> No updates this week — your [Festival Name] project is in a quiet phase right now. We'll be in touch as soon as something moves.
>
> Your portal is always available: [link]

This prevents the organizer from wondering "did they forget about me?" during long editing phases.

---

## L. Per-Flow Unique Notifications

While shared templates cover most events, each major service flow has one unique notification type that doesn't exist in other flows.

### Filming Flow

**Unique notification: Coverage Complete**

> Subject: Event coverage complete — [Festival Name]
>
> Hi [FirstName],
>
> We're back from [Festival Name] with [X] hours of footage across [Y] sessions.
>
> **What was captured:**
> - [summary: main stage, workshops, social dancing, artist performances]
> - [X] dance sessions filmed
> - [Y] artist performances
>
> **What happens now:**
> Post-production begins this week. Your first deliverables (teaser + social edits) will be ready within [timeframe].
>
> [ContactName]

### Promo Flow

**Unique notification: Content Calendar Update**

> Subject: Your promo calendar for [month] — [Festival Name]
>
> Hi [FirstName],
>
> Here's what's planned for your promo this month:
>
> - [X] posts scheduled ([Y] from SDTV, [Z] from your team)
> - Next post: [date] — [title]
> - [N] items need your approval
>
> **Action needed:** [if any posts need client-sourced content or approval]
>
> View your full calendar: [portal link#promo]

### SMM Flow

**Unique notification: Monthly Performance Report**

> Subject: Your SMM report for [month] — [Festival Name]
>
> Hi [FirstName],
>
> Here's how your social channels performed this month:
>
> - Posts published: [X]
> - Reach: [Y]
> - Engagement rate: [Z]%
>
> **Key highlight:** [one specific insight, e.g., "The artist spotlight reel outperformed your average by 3x"]
>
> Full report: [report URL]
>
> **Coming up:** [next key date and what's planned]

---

## M. First-Name Personalization

### Rule
Every email greeting uses the organizer's first name when available.

### Logic
```
const name = notifications.primaryName
  || contact.name
  || festivalName + ' team';

const greeting = `Hi ${name.split(' ')[0]},`;
```

### Fallback Chain
1. `notifications.primaryName` → "Hi Maria,"
2. `contact.name` → "Hi Kirill," (falls back to SDTV contact name — wrong person, skip)
3. Festival name → "Hi Mambo Nights team,"

### Rules
- Never use "Dear" (too formal for premium B2B)
- Never use full name "Hi Maria Rodriguez," (too CRM-feeling)
- Never use "Hi there," (too generic)
- First name only: "Hi Maria,"

---

## N. Real Human Continuity

### Principle
Every automated notification should feel like it came from the organizer's actual SDTV contact, not from "the system."

### Implementation

**Email sender:**
```
From: Kirill — Social Dance TV <hello@sdtv.studio>
Reply-To: hello@sdtv.studio
```

Not:
```
From: SDTV Portal <noreply@sdtv.studio>  ← wrong
From: SDTV Notifications <notifications@sdtv.studio>  ← wrong
```

**Email signature:**
Every email ends with:
```
[ContactName]
[ContactRole], Social Dance TV
```

Not "The SDTV Team" — always a real person.

**Reply handling:**
All notification emails use a real reply-to address. If the organizer replies to a notification, the reply goes to Kirill's inbox — not to a black hole.

**Continuity cues in copy:**
- "I'll send you the next batch by [date]" (not "the next batch will be available")
- "Let me know if you need anything adjusted" (not "contact support")
- "Looking forward to seeing this come together" (not "thank you for your business")

---

## O. Retention Logic — Long-Term Relationship Layer

### 1. Next Edition Continuity

When a project is complete, the portal should not feel "closed." Instead:

- Phase card shows: "Complete — ready for next edition"
- A subtle "Plan next edition" CTA appears (links to email or Calendly)
- Portal remains accessible indefinitely (content library stays live)

### 2. Memory of Past Setup

When an organizer returns for next edition, the admin should be able to:
- Clone previous portal config as starting point
- Show "Last year you had: [package summary]" in the welcome section
- Reference previous deliverables: "Building on last year's coverage..."

**Admin panel support:**
- "Clone from previous event" button in Portal tab
- Stores `previousEvent` reference in portal settings

### 3. Logical Next-Step Recommendations

After project completion, the portal's "Best Next Step" card should evolve based on what the organizer already has:

| Current package | Next logical step | Why |
|----------------|-------------------|-----|
| Filming only | Add editing + social edits | Turn raw footage into usable content |
| Filming + editing | Add distribution | Get the content in front of audiences |
| Production + Distribution | Add positioning / artist promo | Deepen the media impact |
| Full partnership | Annual contract / multi-event | Lock in the relationship |

### 4. Premium Full-Cycle Guidance

The 60-day follow-up email (Trigger #15) should reference the specific project history:

> Since [Festival Name] 2026, your aftermovie has been viewed [X] times through SDTV channels, and your social edits reached [Y] accounts.
>
> For [Festival Name] 2027, we could build on this with [specific upgrade based on what was missing last time].

This makes the renewal feel data-informed and relationship-aware, not template-driven.

### 5. Retention Signals to Track

| Signal | Meaning | Action |
|--------|---------|--------|
| Organizer visits portal after project complete | Still engaged | Good moment for 60-day email |
| Organizer clicks "Interested" on add-on | Commercial intent | Kirill follows up within 48h |
| No portal visits for 90+ days | Cooling off | Soft check-in email |
| Organizer replies to any notification | Active relationship | Prioritize personal follow-up |

---

## What NOT to Do
- Don't auto-send in V1 (preview + confirm prevents test emails reaching clients)
- Don't use dark-themed HTML emails (break across clients)
- Don't add commercial mentions to review reminders (trust moments)
- Don't build weekly summaries in V1 (disproportionate cost)
- Don't automate renewal outreach (must feel personal until battle-tested)
- Don't send weekly summary when nothing changed (see Section K)
- Don't use "noreply" sender addresses (kills the personal feel)
- Don't address emails to "Dear valued client" — always first name
- Don't send Tier 1 (action required) to secondary recipients — only primary
- Don't include upsell in emails when organizer disabled upgrade suggestions
