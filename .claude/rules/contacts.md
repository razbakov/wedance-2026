---
paths:
  - "**/{contactSegments,contactMailing,BusinessContactMailing,BusinessContacts,BusinessWhosComing,rsvpContact}*"
  - "server/trpc/routers/{businessSite,rsvp}*.ts"
  - "server/api/contacts/**"
  - "app/pages/business/network/**/contacts*"
---

# Contacts: who's coming, audience, mailing

## Who's coming → Contacts

The organiser's event page shows **Who's coming** (`BusinessWhosComing`, `rsvp.people`: names and photos of everyone
who signed up — poll, Going!, tickets — never email; organisers see them whatever the dancer's public visibility).
The same card shows how many are checked in and opens the door list (`/business/events/<id>/door`, RAZ-928).
Contact details live only in the host page's **Contacts** (`/business/network/<handle>/contacts`), which "See their
contacts" opens filtered to the event (`?event=<id>&as=<needLeader|…>`; `businessSite.contactsOverview` → `events`,
`activity.events` per contact, `shared/utils/contactSegments.ts` `ComingAs`). A dancer gets there by signing up
(RAZ-995, below): `recordSignupContact` (`server/utils/rsvpContact.ts`, host page, else organiser — never the venue)
adds them with source `signup` — name, email, phone for that event, **not mailable** — and "Also tell me about next
events" adds `source.opted_in`. Where they came from (RAZ-1074, `shared/utils/cameFrom.ts`): the landing's utm_* and outside
referrer, caught by `app/plugins/08.came-from.client.ts` (sessionStorage), sent as `signUp.cameFrom`, kept on a guest's
`event_rsvps.came_from` through the magic link, and merged into a **new** contact's `source` (first touch stays);
Contacts shows it via `sourceDetail`.
A site sign-up can also ask for an optional **city** (RAZ-1093): the signup section's `city`
(with its own label; `hidePromo` hides the promo code). The words they type are
`profile_contacts.city`, shown on the row, in the CSV column `city`, and as a **City**
filter in the rail. A unique match against `cities` also sets `city_id`; a shared or
unknown name stays free text. The los.filinsclub interest form's old promo-code cities
were moved onto this column (migration 0081).
Contacts names the event (`sourceLabelFor`: "Signed up for La Timberia"), marks an un-opted-in sign-up
"Only for their event" (`emailBlock` → `event_only`, not "never asked"), and the rail's **Channel** counts and filters
contacts by `contactChannel` (utm_source, else referrer host; ig / l.instagram.com → Instagram; "Not known" last). `rsvp.shareContact` (source `rsvp`, mailable) stays for MCP.


**One audience (RAZ-963):** Contacts also lists everyone else connected to the page — followers and accounts that went /
are going to its events (`audienceOnly` in `shared/utils/contactSegments.ts`) — once each, as `isContact: false` rows
(source `wedance`, email block `not_a_contact`). Like `rsvp.people`, they show name / photo / handle / city whatever their
attendee visibility, never email or phone; never mailed, not in the CSV, no note / unsubscribe / delete. "Who" in the rail
= contacts / not contacts. Guests and buyers without an account aren't listed.

## Email to contacts (RAZ-975)

Contacts → **Email N** (`BusinessContactMailing`) writes to the contacts the list's filter shows: N = those the page
may email (`shared/utils/contactMailing.ts` `mailingRecipients` → `emailBlock`, each address once — unsubscribed and
imported lists never get it). Optional "Invite to an event" (the page's published, not-cancelled events still to come)
fills an invite and adds an event card with an "I'm coming" button to `/events/<slug>` (its poll = the RSVP). Write /
Preview (the same `renderMailingHtml` the server sends, `{first_name}` per person), "Send me a test" (to the sender's
account email, `[Test]` subject), then "Send to N" → confirm. `contactMailing` router (owners/editors; not in
`PROCEDURE_SCOPES`, so MCP tokens can't send): `options`, `eventCard`, `sendTest`, `send` (re-checks every id against the
page, refuses the same subject within 10 min). Resend batch (`sendContactMailing`), from the page's name, reply-to the
sender, `List-Unsubscribe` + one-click POST (`/api/contacts/unsubscribe`). Every send is logged in `contact_mailings`
(0072: who, when, segment in words + filter, subject/body, event, contact ids, sent/failed), shown as "Sent before".


## What happened after a send (migration 0080)

Each send also writes one `contact_mailing_recipients` row per person (Resend's email id, tagged `mailing=<id>`).
Resend's webhook `POST /api/webhooks/resend` (Svix signature, `RESEND_WEBHOOK_SECRET`; `resend.lib.ts`) fills in
delivered / opened / clicked / bounced / marked as spam (`shared/utils/mailingTracking.ts`); WeDance's own emails have
no row and are ignored. "Sent before" shows `mailingStatsLine` per send. A **hard** bounce sets
`profile_contacts.bounced_at` → `emailBlock` `bounced` (never emailed again); a spam complaint unsubscribes. Opens are
approximate (Apple Mail opens everything); clicks and bounces are reliable. Opens and clicks only arrive when open /
click tracking is on for the sending domain in Resend.
