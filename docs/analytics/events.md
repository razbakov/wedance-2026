# Analytics (PostHog) — setup and event catalogue

_Every `track`/`trackOnce` event in `app/` and every `server_*` event in `server/` must have a row here: `server/utils/posthog.catalogue.test.ts` reads this file. Strategy, KPIs and gaps live in [tracking-plan.md](tracking-plan.md)._

**Setup.** Client: `app/plugins/03.posthog.client.ts` (posthog-js, EU host, manual `$pageview`
on route change, `person_profiles: 'identified_only'`). Call sites use `useTrack()`
(`app/composables/useTrack.ts`: `track`, `trackOnce`, `identify`, `reset`, `sessionReplayUrl`) —
never import posthog directly; everything is a no-op without `NUXT_PUBLIC_POSTHOG_KEY` (tests).
Server: `server/utils/posthog.ts` → `trackServer(ctx, name, props)` from tRPC procedures
(dependency-free `fetch` to `/i/v0/e/`, handed to `ctx.waitUntil`, never throws, off under vitest);
`trackServerEvent(h3Event, name, distinctId, props, { dedupeKey })` from webhooks / plain API routes
(no tRPC ctx: `distinctId` = the buyer's dancer id when known, else anonymous; `channel: 'webhook'`;
`dedupeKey` → deterministic event `uuid` so redeliveries collapse).
`server/utils/posthog.catalogue.test.ts` fails when a `server_*` event in code is missing from the table below.

**Local dev never sends.** The Vercel-pulled `.env` holds the PRODUCTION key. The client plugin is a
no-op on a dev build (`import.meta.dev`) and on local hosts (`app/lib/analytics-host.ts`: localhost,
127.x, ::1, `*.localhost`, `*.test`); the server helper is off under `nuxt dev`. To debug PostHog
locally, use a separate test project key, and still expect nothing from localhost — test on a preview.

**The `app` filter rule.** 2026 shares the WeDance v4 PostHog project (EU free plan = one project).
Every event — client super-property and server payload — carries `app: 'wedance-2026'`.
**Always filter insights/funnels on `app = wedance-2026`.**

**Identity.** `identify(dancerId)` runs on sign-in (`setSession`) and on every session restore
(`auth.me` → `_applyMe`), idempotently (skipped when `get_distinct_id()` already is the dancer; only
person props are refreshed). Person props are non-PII only: `city`, `is_admin`, `role`, `intent`,
`onboarded`, `dance_styles_count`, `has_username`. Never send names, emails or raw search text.
`reset()` on sign-out. Server events use `distinct_id = dancerId`; anonymous server calls get a random
id + `$process_person_profile: false`.

**Client vs server convention.** Conversions fire twice: the client event (in-session context:
pageviews, replay, UTM) and a `server_<same name>` copy from the router (survives ad blockers).
**Count conversions on `server_*`**; use the un-prefixed client event for in-session funnels. Never
mix the two in one count. Server events also carry `$lib: 'wedance-server'` and `channel: web|mcp`.

## Client events (`useTrack().track`)

| Event | Fired in | Props |
|---|---|---|
| `$pageview` | `plugins/03.posthog.client.ts` (route change) | `path` |
| `signup_completed` | `useAuth.register`, `useAuth.verifyMagicLink` (server says `isNew`, rule below), `useAuth.confirmInviteEmail` | `method` (password / magic_link / invite_email) |
| `login_completed` | `useAuth.login`, `useAuth.verifyMagicLink` | `method` |
| `onboarding_completed` | `useAuth.completeOnboarding` | `intent` |
| `profile_updated` | `useAuth.updateProfile` | `fields_changed` (field NAMES only, `app/lib/changed-fields.ts`) |
| `onboarding_step_completed` | `onboarding.vue` (intent picked · details saved · skipped) | `step` (intent / details / skip), `intent`, `repeat` (already onboarded), `has_details` · `has_city`, `styles_count`, `has_role` |
| `landing_cta_click` | `about.vue` (the homepage until 2026-11-15) | `cta` (find_festival / seeker … / see_attendees / private_events / festival_organizers), `section` (hero / journey / proof / business / footer) |
| `find_your_dance_started` / `find_your_dance_completed` | `find-your-dance.vue` (first video watched or choice · a style or the taster chosen; not a quiz) | `style`, `via` · `style_chosen`, `taster`, `answers_count` (videos watched), `styles_suggested` |
| `profile_viewed` | `/@handle` (business profiles, `trackOnce`), `/u/<handle>` (dancers — no handle sent) | `profile` (business only), `profile_type`, `city`, `claimed`, `own`, `surface` |
| `outbound_click` | delegated listener `plugins/06.outbound-click.client.ts` (every external link) | `kind` (ticket / website / instagram / map / whatsapp / telegram / community_group / email / phone / ai_app / …; `data-outbound-kind` overrides), `platform`, `host` (never path/query), `object_type`, `object_id` (`data-object-*` or the page's `useTrackContext`), `city`, `surface` (route name) |
| `plan_shared` | `SharePlanModal` "Bring friends" (RAZ-1001: the plain link — signed out or no story for the event — or "Or send your workshop plan" under the story; the festival year is shared as a story, `year_story_shared`) | `object` (festival = a workshop plan / event = just the link / year), `method` (copy / native), `festival` / `workshops` / `festivals`, `referral` (the link carried `?ref=`, only when the festival has a referral discount), `surface` |
| `shared_plan_viewed` | `FestivalView` (`?invite=` / `?plan=shared`), `my-year?user=` | `object`, `festival`, `signed_in`, `workshops` / `festivals`, `has_referral` |
| `referral_link_shared` | (retired in RAZ-1001: the referral code rides on the one "Bring friends" link — `plan_shared` `referral`) | `method`, `festival`, `surface` |
| `tracked_link_visit` | `plugins/05.tracked-link.client.ts` (`?via=` promoter link) | `code_type`, `referral_code` (promoter link code), `counted`, `landing` |
| `organizer_insights_viewed` | `organizers/insights.vue` (once per festival per 30 min) | `festival`, `profile_type`, `festivals` |
| `venue_cta_click` | `for-venues.vue` | `surface`, `cta` (list_venue / for_organizers / booking_terms) |
| `city_viewed` | `pages/cities/[city]/index.vue` (once per mount) | `city`, `style` |
| `event_viewed` | `pages/events/[id].vue` (non-festival, once per mount) | `event_id`, `city`, `style`, `event_type`, `synced`, `is_festival` |
| `festival_viewed` | `pages/events/[id].vue` (festival) | same as `event_viewed` |
| `event_tab_opened` | `FestivalView` (an event with sessions or a festival): Overview / Lineup / Schedule / Passes / Reviews tabs (RAZ-1008, RAZ-1011; `?tab=`) · `events/[id]` (a plain event): Overview / Reviews | `tab`, `via` (nav / summary = a "What's inside" card / hero = Get pass or the stars under the picture / link), `event_id`, `is_festival` |
| `filter_used` | city page style chip · All / Parties / Classes (`CityKindFilter`, RAZ-1018) · Pick a date (`CityDateJump`, RAZ-1021) | `surface`, `city`, `filter_keys` (style / type / date), `style`, `type` (party / class), `date` (YYYY-MM-DD) |
| `search_used` | `/festivals`, `/artists`, `/gigs` (`useTrackSearch`, debounced) | `surface`, `query_length`, `filter_keys`, `results` |
| `week_plan_add` / `week_plan_remove` | `useWeekPlan` (Going! toggle), `my-plan` enroll / course X | `event_id`, `week_count` or `source`; add: `event_type`, `city`, `surface` |
| `year_plan_add` / `year_plan_remove` | `useYearPlan` | `festival_slug`, `year_count`; add: `festival`, `surface` |
| `workshop_plan_add` / `workshop_plan_remove` | `festival/FestivalView.vue` | `festival`, `workshop_id`, `workshop_type`, `partner_status` |
| `discover_swipe` | `/meet` Meet new friends deck (on My plan until RAZ-989) | `direction`, `card_kind`, `added_festival`, `added_event` (always false since the deck is people only), `surface` (meet) |
| `notice_opened` | Match toast, the header bell history, or the Meet match card (RAZ-1071). Opening it is the click through to the meetup. | `kind` (match), `via` (toast / bell / meet) |
| `plan_zoom_opened` | My plan's Today / Week / Month / Year tabs (RAZ-1006): a tab clicked | `tab` (today / week / month / year), `from` |
| `meet_friends_opened` | `MeetFriendsEntry` on My plan (the card leading to `/meet`, RAZ-989) · `EventMeetPrompt` under "You're in" after signing up to a night (RAZ-981) | `surface` (my_plan / my_plan_empty / `<event surface>_signup`), `people` (dancers waiting in the deck; null = not loaded) |
| `meet_match_answered` | `MeetMatches` ("Your dance friends" on My plan, RAZ-985): a match's night → "I’m going too" / "I’m going" (added to the plan with `metadata.with` = the match) or "Next time" (an event Skip) | `answer` (going / next_time), `they_going`, `source` (deck / festival), `event_id` |
| `ritual_booked` | `/meet/ritual` "Book my spot" on a real match (RAZ-1071) | `event_id` |
| `ritual_revealed` | `/meet/ritual` "Turn your phone" — the symbol is shown to the other person | `event_id` |
| `ritual_reported` | `/meet/ritual` "Couldn't meet?" saved | `problem` (couldnt_find / no_show / left / unsafe / other), `event_id` |
| `ritual_how` | `/meet/ritual?morning=1` "How was it?" | `how` (good / not), `event_id` |
| `dance_card_saved` | `/dance-card` (RAZ-1005): a signed-in dancer saves the deck's dance card (Lead / Follow + levels, then photo, name, city, bio — the same cards as signed-out /meet) to their profile | `photo_added` (first photo), `photo_replaced`, `styles` (count), `surface` (back_link = came from a night's "Add a photo" / direct) |
| `meet_empty_shared` | `MeetEmptyNext` (an empty /meet deck, RAZ-1002): "Ask" an organiser for their next night, "Send" a venue's page, "Invite a friend" | `what` (organiser / venue / friend), `stage` (nights / organisers / venues / nothing / no-city), `method` (native / copy / none) |
| `goal_added` | `useGoals.addGoal` | `style` |
| `follow` / `unfollow` | `/@handle`, `PromoterProfile` (profiles); `FestivalView` shared plan (dancer) | `target`, `profile`, `profile_type`, `surface` |
| `whos_going_profile_opened` | `GoingSection` face tap | `item_type`, `item_id` |
| `going_visibility_changed` | `GoingSection` share toggle · festival Overview "Show me" / "Hide me" (RAZ-1008, `surface: festival_overview`) | `share`, `item_type`, `item_id` |
| `wave_sent` / `wave_retracted` | `GoingSection`, `DiscoverDancers`, `EventWhosComing` pairing (sent only) | `festival`, `surface` |
| `rsvp_answered` | `EventSignup` "Cancel my spot" → confirm (answer `next`, RAZ-1003; was "I can’t come after all"; signing up is `event_signed_up` since RAZ-995) | `answer` (partner / needLeader / needFollower / yes / next), `signed_in`, `surface`, `event_id` |
| `rsvp_contact_shared` | (retired in RAZ-995: the sign-up's "Also tell me about next events" replaced "Let <page> keep in touch"; `rsvp.shareContact` stays for MCP) | `share`, `has_phone`, `surface`, `event_id` |
| `event_signup_opened` | `EventSignup` (the one button on a class / event page, RAZ-995; or "Change") | `surface`, `event_id`, `changing`, `not_bookable` (nobody on WeDance takes its bookings: the button showed where it was imported from, RAZ-1007) |
| `event_signed_up` | `EventSignup` last step ("Book my spot" / "Pay €N" / "Continue to payment"; RAZ-1003 renamed "Sign up" / "I’m coming" to "Book my spot") | `answer`, `signed_in`, `has_pass`, `pay` (now / door / null), `people` (1 / 2), `keep_in_touch`, `surface`, `event_id` |
| `contacts_emailed` | `BusinessContactMailing` (Contacts → "Email N" → "Yes, send", RAZ-975) | `recipients`, `has_event` (invite with an event card), `filtered` (a segment, not everyone), `tested` (sent themselves a test first), `profile` |
| `discover_deck_joined` | `DiscoverDancers` "show me" | `item_type`, `item_id`, `was_going` |
| `hangout_created` | `FestivalView`, `my-plan` | `kind`, `surface`, `event_id` / `event_linked` |
| `hangout_rsvp` | `FestivalView`, `my-plan` | `going`, `surface`, `hangout_id` |
| `dinner_joined` · `ride_share_posted` · `roommate_search_toggled` | `useDinners` · `useRideShares` · `useRoommates` | `dinner_id` · `festival`, `type` · `festival`, `looking` |
| `shared_plan_signup` | `FestivalView`, `my-year` ("add friend" from a shared plan) | `surface`, `slug` |
| `ask_locals_post` · `video_submit` · `video_vote` · `city_battle_vote` | city components | `city`, … |
| `review_submitted` · `giveaway_entered` · `election_nominated` | `ReviewsSection`, `EventHowWasIt` (an event's hero after the night, RAZ-1011) · `GiveawayCard` · `elections/[handle]` | target ids; event hero: `target_type`, `target`, `rating`, `has_text`, `updated`, `via` (email / page), `surface` (event_hero) |
| `review_ask_opened` | `events/[id]` opened from a star in the morning-after email (`?rate=N`, once per mount, RAZ-1011) | `event_id`, `rating`, `signed_in`, `went` |
| `review_ask_missed` | `EventHowWasIt` "Don’t ask me again" (the email's "Didn’t make it?" link) | `event_id`, `signed_in` |
| `event_form_opened` | `business/events/new.vue` — the organiser answers "Where are you starting from?" (RAZ-939) | `start` (post / copy / scratch) |
| `event_created` / `event_published` | `business/events/new.vue` ("From scratch" or "Like my last event"; starts a draft; `event_published` only when "Publish it now" is ticked); publish = draft→live in `business/events/[id]` (checklist "Publish" button or the Published box) | `event_id`, `is_festival`, `city`, `style`, `published`, `source` (scratch / copy), `dates` (copy) |
| `event_cancelled` | `BusinessCancelEvents` (event editor → Cancel, or Business → Events → tick events / "Select today's", RAZ-948) | `event_id` (one event, else null), `events`, `notified`, `has_reason`, `bulk` |
| `event_uncancelled` | `BusinessUncancelEvent` (event editor → "It's on again", RAZ-969) | `event_id`, `notify` (email the people told it was off), `notified` |
| `event_link_shared` | Business → Home (RAZ-973): the share button on a Today card, or "Share it" in a quiet week's Last 7 days | `event_id`, `method` (native / copy), `surface` (business_home) |
| `event_imported` | `business/events/new.vue` "I have a post" (#453) | `event_id`, `source` (instagram), `created` (false = this post's draft already existed), `lineup`, `has_cover` |
| `business_profile_created` | `business/new.vue` | `profile`, `profile_type`, `from_instagram` |
| `public_page_set` | `settings/index.vue` "Your public page" (one handle per person, #474) | `cleared`, `profile_type` |
| `profile_merged` | `BusinessDuplicates` (Business → page → Duplicates) | `profile` (kept), `merged_profile`, `moved` |
| `page_deleted` | `BusinessDeletePage` (Business → page → Delete page, RAZ-944) | `profile` |
| `profile_claim_started` / `team_join_started` | `business/claim.vue` (form opened) | `profile`, `kind` |
| `profile_claim_requested` / `team_join_requested` | `business/claim.vue` (sent) | `profile`, `kind`, `evidence_type` |
| `profile_claimed` | `confirm/[token].vue` (invite link) | `via`, `new_account` |
| `invite_email_confirmed` | `useAuth.confirmInviteEmail` ("That's me" in the answer email → `/confirm/<token>?that=`) | `owner`, `new_account` |
| `tickets_claimed` | `charanga/claim.vue` | `count`, `festivals` |
| `booking_inquiry_sent` · `booking_join_offered` · `booking_request_submitted` | `BookingInquiryForm`, `PromoterProfile`, `/@handle`, `book/[handle]` | `profile`, … |
| `booking_added_to_event` | `book/[handle]` "Add <artist> to an event's line-up" picker under the request form (RAZ-964: same styles, one row per series, ≤5) | `profile`, `series` (the row was a series' next date), `rows` (events the picker showed) |
| `event_inquiry_submitted` | `for-events.vue` | `event_type`, `city` |
| `gig_posted` · `gig_cta_click` | `gigs/index.vue` | `kind`, `category` · `action`, `gig_id` |
| `ticket_cta_click` | `FestivalHero` (external shop), `FestivalView` (Stripe checkout) | `slug` / `festival`, `provider` (stripe / tickettailor / external), `tickets`, … |
| `organizer_cta_click` · `sponsor_cta_click` · `press_cta_click` · `whats_new_*_click` | marketing pages | `surface`, `kind` |
| `app_connected` | `oauth/authorize.vue` | `scopes`, `business` |
| `ai_app_cta_click` | `AiAppCta` ("Use WeDance in ChatGPT": docs connect-ai, Settings → Connected apps, new event, Business dashboard, for-organizers, my-plan bottom line) · `ChatgptPlanPitch` (top of My plan until ChatGPT is connected; the landing `MyPlanLanding` on `/` and signed-out `/my-plan`) | `app` (chatgpt), `surface` (docs_connect_ai / settings_connections / business_event_new / business_dashboard_empty / business_dashboard_needs / for_organizers / my_plan / my_plan_top / my_plan_landing / home) |
| `instagram_connect_started` | `BusinessInstagram` (Business → page → Instagram, before Meta's dialog) | `profile`, `reconnect` |
| `instagram_post_published` | `BusinessContentPlan` "Post to feed" / "Add to story" | `event_id`, `post_kind`, `format`, `to` (feed / story) |
| `weekend_plan_viewed` | `w/[code].vue` (Share my weekend page, once per mount) | `own`, `parties`, `friends`, `story` (opened with `?story=1`) |
| `weekend_joined` | `w/[code].vue` "I'm in" | `signed_in`, `surface` |
| `weekend_reminder_requested` | `w/[code].vue` email step after a guest's "I'm in" (magic link sent) | `surface` |
| `weekend_story_shared` | `WeekendStory` story panel (`w/[code].vue`, My plan → "Where you're dancing", an event page's "Bring friends" — one event, RAZ-1001) | `method` (native / download / copy), `parties`, `own_line` (the sharer wrote their own line), `surface` (weekend-page / my_plan / event) |
| `year_story_shared` | `YearStory` story panel in My plan under "Your festivals" (RAZ-897; moved from /my-year in RAZ-966; the link opens `/my-year?user=`) | `method` (native / download / copy), `festivals`, `own_line` (the sharer wrote their own line), `surface` (my_plan; year-modal before RAZ-966) |
| `year_review_viewed` | `YearReview` on /my-year (your year in dance, RAZ-966; once per year per session) | `year`, `nights`, `screens`, `festivals` |
| `year_review_shared` | `YearReview` "Share this one" / "Share all" / "Save picture" / "Save all" | `method` (native / download), `screens` (pictures shared), `screen` (kind on screen), `year` |
| `year_review_plan_clicked` | `YearReview` last step "Plan <next year>" (→ My plan's "Your festivals") / "Find festivals" | `to` (plan / festivals), `year`, `nights` |
| `year_review_entry_clicked` | `YearReviewEntry` in My plan (banner in Dec/Jan, else the link under "Your festivals" / the empty plan) | `variant` (banner / link), `year`, `year_turn` |
| `problem_report_opened` / `problem_report_submitted` / `problem_report_screenshot` / `problem_report_failed` | `ReportProblem` | `type` · `has_screenshot`, `screenshot_dropped` (submitted: sent only after leaving the shot out) · `captured`, `retake` (screenshot) · `reason` (failed: blocked / timeout / forbidden / no_client / other — `feedbackFailure` in `app/lib/sentry-feedback.ts`). Sentry's traffic goes through our own `/api/m` tunnel (`server/utils/sentryTunnel.ts`) so blockers of `*.sentry.io` don't drop reports |
| `community_group_submitted` | `SubmitGroupDialog` ("Share a group" on a city's Local groups) | `city`, `platform`, `duplicate` |
| `city_schedule_published` | `BusinessCitySchedule` (city page → Weekly post: Post to feed / story / Telegram) | `city`, `to` (instagram_feed / instagram_story / telegram) |
| `city_occasion_published` | `BusinessCityOccasion` (city page → Plan → an occasion: Post to feed / story / Telegram, RAZ-970) | `city`, `occasion` (e.g. buss-und-bettag), `to` |
| `city_occasion_asked` | `BusinessCityOccasion` → Ask organisers (email sent) | `city`, `occasion`, `pages` |

## Server events (`trackServer`, all prefixed `server_`)

| Event | Procedure | Props |
|---|---|---|
| `server_signup_completed` | `auth.register`, `auth.verifyMagicLink` (account created by this flow, see note), `artistInvites.confirmEmail` (method `invite_email`) | `method`, `has_city`, `via_link` |
| `server_login_completed` | `auth.login`, `auth.verifyMagicLink` | `method` |
| `server_onboarding_completed` | `auth.completeOnboarding` | `intent` |
| `server_event_created` | `businessEvents.create`, `businessEvents.createSeries`, `businessEvents.copy` ("Like my last event", always drafts) | `event_id`, `is_festival`, `host_type`, `city`, `published`, `series_id`, `dates`, `copied_from` (copy) |
| `server_event_uncancelled` | `businessEvents.uncancel` ("It's on again", web + MCP `cancel_event` `undo`; only when it was cancelled) | `event_id`, `notify` (organiser chose to email), `notified` (people emailed), `hours_cancelled`, `is_festival`, `host_type`, `$groups` |
| `server_event_cancelled` | `businessEvents.cancel` (web + MCP `cancel_event`; once per event — re-cancelling only edits the reason) | `event_id`, `notified` (people emailed), `has_reason`, `bulk`, `is_festival`, `host_type`, `$groups` |
| `server_event_imported` | `eventImport.fromInstagram` (web + MCP `import_from_instagram`; the draft itself also fires `server_event_created`) | `event_id`, `source` (instagram), `kind` (post / reel), `lineup`, `organizers`, `has_venue_page`, `has_cover`, `has_ticket`, `sessions`, `$groups` |
| `server_event_published` | `create`/`createSeries` with `published`, `update` draft→live, `publishSeries` | `event_id`, `is_festival`, `series_id`, `dates` |
| `server_booking_request_submitted` | `booking.request` (was server_booking_requested until 2026-10-20) | `booking_id`, `signed_in` |
| `server_booking_inquiry_sent` | `inquiries.send` (was server_inquiry_sent until 2026-10-20) | `inquiry_id`, `profile`, `delivered`, `signed_in` |
| `server_event_inquiry_submitted` | `feedback.inquiry` | `event_type`, `city` |
| `server_festival_draft_submitted` | `festival.submitDraft` (server only) | `submission_id`, `festival`, `signed_in` |
| `server_profile_claim_requested` / `server_team_join_requested` | `businessTeam.requestAccess`, `business.requestClaim` | `profile`, `profile_type`, `kind`, `evidence_type` |
| `server_profile_claimed` | `business.decideClaim` approve (claimant's id), `artistInvites.claim`, `artistInvites.confirmEmail`, `admin.addPageOwner` | `profile`, `via` (review / invite / invite_email / admin — an admin made them owner in Admin → Users) |
| `server_invite_answered` | `artistInvites.respond` with an answer (artist in / can't · venue can host / another date / can't) | `kind` (artist / venue), `answer`, `changed`, `has_email`, `signed_in`, `member`, `has_terms`, `event_id`, `$groups` |
| `server_invite_email_confirmed` | `artistInvites.confirmEmail` ("That's me" in the answer email, first time per invite) | `kind`, `answer`, `new_account`, `owner`, `event_id`, `$groups` |
| `server_business_profile_created` | `business.create` | `profile`, `profile_type` |
| `server_profile_merged` | `business.merge` (web + MCP `merge_profiles`) | `profile` (kept), `merged_profile`, `profile_type`, `same_type`, `moved`, `$groups` |
| `server_page_deleted` | `business.deletePage` (owners; only a page nothing uses — `server/utils/deleteProfile.ts`) | `profile`, `profile_type`, `followers`, `team`, `days_old`, `$groups` |
| `server_review_submitted` | `review.create` (web + MCP `write_review`; events only from people who went, after the night — RAZ-1011) | `target_type`, `rating`, `has_text`, `updated`, `went`, `event_id`, `$groups` (events) |
| `server_review_ask_missed` | `review.missed` ("Didn’t make it?" in the morning-after email, first time per ask) | `event_id`, `signed_in` |
| `server_review_asks_sent` | `/api/cron/review-asks` (daily Vercel cron) — **anonymous**, one per event asked | `event_id`, `asked`, `failed`, `channel: cron` |
| `server_rsvp_answered` | `rsvp.answer` (signed out → unconfirmed; signed in → confirmed at once) | `event_id`, `answer`, `signed_in`, `confirmed`, `$groups` |
| `server_rsvp_confirmed` | `rsvp.answer` signed in, folding in this browser's / magic link's unconfirmed answer | `event_id`, `answer`, `hours_to_confirm`, `$groups` |
| `server_event_signed_up` | `rsvp.signUp` (RAZ-995: how you come + pass + pay + contact; signed out = unconfirmed until the magic link) | `event_id`, `answer`, `signed_in`, `has_pass`, `pay`, `people`, `keep_in_touch`, `$groups` |
| `server_rsvp_contact_shared` | `rsvp.shareContact` (the dancer shares / stops sharing their contact with the event's host, else organiser page) | `event_id`, `share`, `has_phone`, `new_contact`, `$groups` |
| `server_contacts_emailed` | `contactMailing.send` (web only — connected apps can't send) | `recipients`, `sent`, `failed`, `skipped` (shown but not mailable), `has_event`, `filtered`, `profile`, `profile_type`, `$groups` |
| `server_festival_joined` | `festivalSignup.join` | `festival` |
| `server_ticket_checkout_started` | `festivalSignup.ticketCheckout`, `festivalSignup.createCheckoutSession` | `festival`, `tickets`, `referral` |
| `server_subscription_checkout_started` | `organizerSubscription.createCheckout` | `plan`, `profile_type` |
| `server_gig_applied` | `gigs.applyTo` | `gig_id`, `category`, `as_profile`, `reapplied`, `$groups` |
| `server_gig_application_decided` | `gigs.decideApplication` | `gig_id`, `category`, `decision`, `hours_to_decide` |
| `server_booking_decided` | `election.moderateBooking` (free spaces; commercial venues decide off-platform) | `booking_id`, `decision`, `hours_to_decide`, `redecided`, `free` |
| `server_inquiry_replied` | `inquiries.setStatus` (first move out of `new`) | `inquiry_id`, `status` (answered / declined), `hours_to_reply`, `profile`, `profile_type`, `$groups` |
| `server_flyer_generated` | `businessFlyers.make` / `directions` / `again` / `feed` / `fix` / `refresh` (each is an AI paint) | `event_id`, `mode`, `variant_count`, `saved_look`, `references`, `feelings`, `from_kept`, `$groups` |
| `server_flyer_kept` | `businessFlyers.keep` | `event_id`, `mode`, `post_kind`, `new_look`, `$groups` |
| `server_caption_written` | `businessFlyers.writeCaption`, `businessPosts.writeCaption` / `writeCaptions` | `event_id`, `language`, `scope` (event / post / plan), `count`, `failed`, `post_kind`, `$groups` |
| `server_post_proposed` | `businessPosts.propose` (content plan) | `event_id`, `added`, `total`, `is_festival`, `$groups` |
| `server_promo_kit_opened` | `referral.promoKit` | `event_id`, `profile_type`, `manager`, `has_link`, `has_flyer`, `painting`, `language`, `$groups` |
| `server_venue_ask_sent` / `server_venue_ask_booked` / `server_venue_ask_unbooked` | `venueAsks.ask` / `book` / `unbook` | `event_id`, `venue`, `updated`, `guests`, `needs_count`, `venue_managed`, `has_offer`, `plan_items` (ask only), `$groups` |
| `server_checked_in` | `attendance.checkIn` (door, organiser's id) | `event_id`, `is_festival`, `$groups` |
| `server_site_saved` | `businessSite.save`, `businessSite.restore` (not when nothing changed) | `profile`, `profile_type`, `first_save`, `sections`, `locales`, `restored`, `$groups` |
| `server_instagram_connected` | `/api/meta/instagram/callback` (Meta's redirect, account saved) | `profile`, `profile_type`, `accounts_granted`, `$groups` |
| `server_instagram_disconnected` | `instagram.disconnect` | `profile`, `profile_type`, `$groups` |
| `server_instagram_post_published` | `instagram.publishPost` | `event_id`, `post_kind`, `format`, `to` (feed / story), `profile`, `$groups` |
| `server_community_group_submitted` | `communityGroup.submit` (a dancer shares a local group) | `city`, `platform`, `duplicate` |
| `server_community_group_reviewed` | `communityGroup.review` (a city admin approves / declines) | `city`, `platform`, `decision` (approved / rejected), `hours_to_review` |
| `server_city_schedule_published` | `citySchedule.publishInstagram` / `publishTelegram` | `city`, `to` (instagram_feed / instagram_story / telegram), `events`, `channels`, `with_picture`, `$groups` |
| `server_city_occasion_published` | `cityOccasions.publishInstagram` / `publishTelegram` (RAZ-970) | `city`, `occasion`, `kind` (silent / party / season), `to`, `langs`, `channels`, `$groups` |
| `server_city_occasion_asked` | `cityOccasions.ask` (organisers with events in the city emailed) | `city`, `occasion`, `kind`, `pages`, `emails`, `$groups` |
| `server_city_admin_added` | `cityChannels.addAdmin` (Admin → Cities) | `city`, `role`, `$groups` |
| `server_weekend_shared` | `weekend.share` (new link only; My plan makes it on its own to show the story, MCP `share_my_weekend`) | `events`, `replaced_previous`, `surface` (my_plan / mcp / web / event = an event page's "Bring friends", RAZ-1001) — `my_plan` is not a share intent; count intent on `weekend_story_shared` |
| `server_weekend_joined` | `weekend.join` (a friend's first "I'm in" on a party) | `signed_in`, `coming`, `friends` |
| `server_weekend_join_confirmed` | `weekend.join` signed in with a guest token (the magic link came back; guest joins folded into the account) | `parties`, `hours_to_confirm` |
| `server_member_role_set` | `businessTeam.setRole` (role actually changed) | `profile`, `profile_type`, `from_role`, `role`, `self`, `$groups` |
| `server_mcp_tool_called` | every MCP tool call (`server/mcp/server.ts` `callTool`), signed in or anonymous | `tool`, `result` (ok / error / preview / denied), `error_code`, `client_app` (chatgpt / claude / cursor / … — `server/mcp/caller.ts`; not `app`, which is the project filter), `country` (Vercel geo, ISO-2), `anonymous`, `latency_ms`, `channel: mcp` |
| `server_meet_matched` | `plan.discoverSwipe` (a deck Yes) / `wave.send` (a festival wave) that meets a Yes back (RAZ-985) | `via` (deck / festival), `emailed` (the other dancer got "said yes too"), `email_skip` (off / no_email / not_shown / already / today / error) |
| `server_ritual_booked` | `ritual.book` (the night goes on the plan) | `event_id` |
| `server_ritual_revealed` | `ritual.reveal` (first time they turn the phone) | `event_id` |
| `server_ritual_reported` | `ritual.report` | `problem` (couldnt_find / no_show / left / unsafe / other), `event_id` |
| `server_ritual_how` | `ritual.how` (the morning-after answer) | `how` (good / not), `event_id` |
| `server_ritual_followup` | `/api/cron/ritual-followup` (the morning-after email, one per dancer) | `channel: cron` |
| `server_account_deleted` | `auth.deleteAccount` — **anonymous**, no person profile | `days_since_signup` |
| `server_ticket_purchased` | Stripe webhook `checkout.session.completed` (festival checkout; not on redelivery) · TicketTailor webhook, first of `order.created`/`order.completed` per order | `festival`, `provider` (stripe / tickettailor), `product` (ticket / social_unlock), `tickets`, `amount` (cents), `currency`, `$revenue` (major units), `$currency`, `referral`, `referral_code` (promoter tracked-link code), `discount` (cents) |
| `server_ticket_checkout_expired` | Stripe webhook `checkout.session.expired` (festival checkout) | `festival`, `provider`, `product`, `tickets`, `referral`, `referral_code` |
| `server_subscription_activated` | Stripe webhook `checkout.session.completed` (`mode=subscription`, first delivery) | `plan`, `profile_id`, `provider`, `amount` (cents), `currency`, `interval`, `$revenue`, `$currency` |
| `server_subscription_cancelled` | Stripe webhook `customer.subscription.deleted` (or `updated` → canceled), once per subscription | `plan`, `profile_id`, `provider`, `amount`, `currency`, `interval`, `reason` (Stripe enum), `days_active` |

**Groups.** PostHog group type `profile` = a business profile's username. Client:
`useTrack().group('profile', username)` on Business mode pages (`/business/network/<username>/…`,
via the posthog plugin) and on `/@handle` for its managers. Server: `...profileGroup(username)` /
`...eventGroup(ev)` (organiser, else venue) add `$groups` to events where a business profile is in
scope (event created/published, claims, flyers, captions, inquiries, team, site, venue asks,
promo kit, gig applications as a page). Use group-based insights to count organisations, not people.

Webhook events (`channel: 'webhook'`) use the buyer's dancer id as `distinct_id` (Stripe metadata;
TicketTailor by buyer-email match, else anonymous). **Revenue = sum of `$revenue` on
`server_ticket_purchased` + `server_subscription_activated`** (first period only — renewals are not
yet tracked).

**Magic-link sign-up rule** (`server/utils/magicLinkSignup.ts`): a magic-link sign-in counts as a
sign-up only when the account was created by the magic-link flow — created < 24 h ago, no `source_ref`
(migrated v4 dancers never count), no password, never email-verified, and no earlier session.
Anything else is `login_completed`.

Adding an event: snake_case, one per user intent, non-PII props, and add a row above.
