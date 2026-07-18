import { pgTable, uuid, text, integer, boolean, timestamp, date, unique, index, json } from 'drizzle-orm/pg-core'

export const dancers = pgTable('dancers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  photo: text('photo'),
  danceStyles: json('dance_styles').$type<string[]>().default([]),
  role: text('role'),
  city: text('city'),
  neonAuthId: text('neon_auth_id').unique(),
  isAdmin: boolean('is_admin').default(false),
  // Public handle for the shareable profile URL (/u/<username>). Generated from
  // the name + a short random suffix at register, and backfilled on onboarding
  // for dancers created before this field existed. Nullable so legacy rows stay
  // valid until backfilled; unique so the URL is a stable identity.
  username: text('username').unique(),
  // Profile detail rendered on /u/<username>: a short bio + social links.
  bio: text('bio'),
  instagram: text('instagram'),
  youtube: text('youtube'),
  website: text('website'),
  // Privacy: when false the public profile is hidden from everyone but the
  // owner (getByUsername 404s for other viewers). Default public.
  profilePublic: boolean('profile_public').default(true),
  // Email + password auth (FirebaseScrypt, ported from wedance-v4). Empty string
  // default = "no password set" — a dancer created via magic-link/festival flow
  // has no credentials and cannot log in via password until they register one.
  salt: text('salt').default(''),
  hash: text('hash').default(''),
  // Onboarding: `intent` is the chosen persona key (e.g. 'social', 'festivals',
  // 'learn', 'perform', 'organize'); `onboardedAt` is set once the user finishes
  // (or skips) onboarding so we never nag them again. Both nullable — a dancer
  // created before onboarding existed, or via a stub flow, has neither set.
  intent: text('intent'),
  onboardedAt: timestamp('onboarded_at'),
  magicToken: text('magic_token'),
  magicTokenExpiresAt: timestamp('magic_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  dancerId: uuid('dancer_id').notNull().references(() => dancers.id),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
})

export const festivals = pgTable('festivals', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  maxFreeSpots: integer('max_free_spots').notNull().default(10),
  stripePaymentLink: text('stripe_payment_link'),
  ticketUrl: text('ticket_url'),
})

export const festivalSignups = pgTable('festival_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  festivalId: uuid('festival_id').notNull().references(() => festivals.id),
  // dancerId nullable so we can stub a verified ticket holder before they sign in.
  // PR 4 (claim flow) links the dancer once the buyer authenticates via magic link.
  dancerId: uuid('dancer_id').references(() => dancers.id),
  paidAmount: integer('paid_amount').notNull().default(0),
  stripeSessionId: text('stripe_session_id'),
  // TicketTailor verification fields. A row with verified_ticket_holder = true
  // means an external paid-ticket purchase was confirmed via webhook; this is
  // the load-bearing field for the public attendee roster.
  verifiedTicketHolder: boolean('verified_ticket_holder').notNull().default(false),
  tickettailorOrderId: text('tickettailor_order_id').unique(),
  tickettailorBuyerEmail: text('tickettailor_buyer_email'),
  verifiedAt: timestamp('verified_at'),
  // Per-event privacy opt-in for the public attendee roster.
  // 'public_full'    — name + city + photo
  // 'public_minimal' — name + city only (default; privacy-conservative)
  // 'hidden'         — not listed individually; counted in `unclaimed`-style aggregates only
  rosterVisibility: text('roster_visibility').notNull().default('public_minimal').$type<'public_full' | 'public_minimal' | 'hidden'>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('festival_dancer_unique').on(t.festivalId, t.dancerId),
])

export const dinners = pgTable('dinners', {
  id: uuid('id').primaryKey().defaultRandom(),
  festivalId: uuid('festival_id').notNull().references(() => festivals.id),
  day: text('day').notNull(),
  date: date('date'),
  timeSlot: text('time_slot').notNull(),
  restaurant: text('restaurant'),
  restaurantAddress: text('restaurant_address'),
  revealDate: date('reveal_date'),
  maxSize: integer('max_size').notNull().default(6),
}, (t) => [
  unique('dinner_festival_day_time').on(t.festivalId, t.day, t.timeSlot),
])

export const dinnerSignups = pgTable('dinner_signups', {
  id: uuid('id').primaryKey().defaultRandom(),
  dinnerId: uuid('dinner_id').notNull().references(() => dinners.id),
  dancerId: uuid('dancer_id').notNull().references(() => dancers.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('dinner_dancer_unique').on(t.dinnerId, t.dancerId),
])

export const dinnerGroups = pgTable('dinner_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  dinnerId: uuid('dinner_id').notNull().references(() => dinners.id),
  chatLink: text('chat_link'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const dinnerGroupMembers = pgTable('dinner_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => dinnerGroups.id),
  dancerId: uuid('dancer_id').notNull().references(() => dancers.id),
})

// ---------------------------------------------------------------------------
// City dance-video voting + competitions + giveaways (O-009)
//
// Videos are EMBED URLs (YouTube / Instagram / TikTok), never hosted uploads —
// we store the source URL + a derived thumbnail URL. Ranking is ELO
// (Bradley-Terry, start 1500, K=32), updated on every pairwise vote — NOT raw
// vote count. Submissions default to `pending`; only `approved` videos enter
// the voting pool or can win Video of the Month.
// ---------------------------------------------------------------------------

export const cityVideos = pgTable('city_videos', {
  id: uuid('id').primaryKey().defaultRandom(),
  citySlug: text('city_slug').notNull(),
  // Optional link to a known dancer; submissions from the public form are
  // identified by email only until (if ever) claimed.
  dancerId: uuid('dancer_id').references(() => dancers.id),
  submittedByEmail: text('submitted_by_email').notNull(),
  title: text('title').notNull(),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  danceStyle: text('dance_style'),
  // Competition bucket, e.g. '2026-07'. Winner = highest ELO among approved
  // videos for the current month.
  competitionMonth: text('competition_month').notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'approved' | 'rejected'>(),
  eloScore: integer('elo_score').notNull().default(1500),
  voteCount: integer('vote_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const videoVotes = pgTable('video_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  citySlug: text('city_slug').notNull(),
  winnerVideoId: uuid('winner_video_id').notNull().references(() => cityVideos.id),
  loserVideoId: uuid('loser_video_id').notNull().references(() => cityVideos.id),
  // Anonymous session id from the `wd_vote_sid` cookie (server-set if missing).
  voterSessionId: text('voter_session_id').notNull(),
  voterDancerId: uuid('voter_dancer_id').references(() => dancers.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  // Dedupe support: `getPair` and `vote` look up every prior vote for a
  // session in a city to avoid re-showing a pair. A pair (A,B) is treated as
  // unordered — the router canonicalises the two ids before comparing, so
  // (A,B) and (B,A) collide. This index makes the per-session lookup cheap.
  index('video_votes_session_idx').on(t.voterSessionId, t.citySlug),
])

export const giveaways = pgTable('giveaways', {
  id: uuid('id').primaryKey().defaultRandom(),
  citySlug: text('city_slug').notNull(),
  sponsorName: text('sponsor_name').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  prizeDescription: text('prize_description').notNull(),
  // The promoted festival / class / social — where "Enter" and the sponsor
  // brand point.
  ctaUrl: text('cta_url').notNull(),
  imageUrl: text('image_url'),
  termsUrl: text('terms_url'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  status: text('status').notNull().default('active').$type<'active' | 'ended' | 'draft'>(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const giveawayEntries = pgTable('giveaway_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  giveawayId: uuid('giveaway_id').notNull().references(() => giveaways.id),
  dancerId: uuid('dancer_id').references(() => dancers.id),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  // Free-entry: one entry per email per giveaway.
  unique('giveaway_entry_email_unique').on(t.giveawayId, t.email),
])

// Reviews & ratings — polymorphic by (targetType, targetSlug) so a review can
// attach to ANY entity (festival / venue / artist / organizer), including
// on-demand stubs created by "ask locals" recommendations, without needing a
// full entity table for each. `source` separates a normal review from an
// auto-5★ recommendation. One review per dancer per target.
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: text('target_type').notNull().$type<'festival' | 'venue' | 'artist' | 'organizer'>(),
  targetSlug: text('target_slug').notNull(),
  targetName: text('target_name'),
  // For organizer/venue recommendations: which city the target is in.
  citySlug: text('city_slug'),
  dancerId: uuid('dancer_id').notNull().references(() => dancers.id),
  // Denormalized reviewer identity (name + handle) so the review list needs no
  // join and can link to /u/<handle>. Snapshotted at write time.
  reviewerName: text('reviewer_name'),
  reviewerUsername: text('reviewer_username'),
  rating: integer('rating').notNull(),
  text: text('text'),
  source: text('source').notNull().default('review').$type<'review' | 'recommendation'>(),
  status: text('status').notNull().default('visible').$type<'visible' | 'hidden'>(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  // One review per dancer per target (a recommend also upserts through this).
  unique('review_target_dancer_unique').on(t.targetType, t.targetSlug, t.dancerId),
])

// Community groups (WhatsApp / Telegram / …) per city — the cold-start
// directory for cities where WeDance has no events yet.
export const communityGroups = pgTable('community_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  citySlug: text('city_slug').notNull(),
  name: text('name').notNull(),
  platform: text('platform').notNull().default('whatsapp').$type<'whatsapp' | 'telegram' | 'facebook' | 'other'>(),
  inviteUrl: text('invite_url').notNull(),
  styles: json('styles').$type<string[]>().default([]),
  source: text('source'),
  verified: boolean('verified').default(false),
  status: text('status').notNull().default('visible').$type<'visible' | 'hidden'>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// "Ask locals" — a question posted for a city, answered by recommendations
// (which write into `reviews` with source='recommendation').
export const recommendationRequests = pgTable('recommendation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  citySlug: text('city_slug').notNull(),
  askerId: uuid('asker_id').notNull().references(() => dancers.id),
  question: text('question').notNull(),
  status: text('status').notNull().default('open').$type<'open' | 'closed'>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Professional profiles — venues, artists, organizers — under the unified
// /@<username> handle namespace (v4-style). Dancers keep their own row + handle
// in `dancers`; the /@handle route resolves either. Reviews attach polymorphically
// by (type, username).
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  type: text('type').notNull().$type<'venue' | 'artist' | 'organizer'>(),
  name: text('name').notNull(),
  city: text('city'),
  citySlug: text('city_slug'),
  photo: text('photo'),
  bio: text('bio'),
  styles: json('styles').$type<string[]>().default([]),
  address: text('address'),
  // Venue floor type matters to dancers (parquet / tiles / concrete).
  floorType: text('floor_type'),
  // 'OpenAir' | 'Indoor' | … — an OpenAir community spot (e.g. Pinakothek) is a
  // free commons, not a commercial rental.
  venueType: text('venue_type'),
  // Drawn map of the areas (image URL).
  mapUrl: text('map_url'),
  // Community guidelines the space runs by (the "politics" a moderator proposes).
  guidelines: text('guidelines'),
  // 'free' (community commons, moderator-managed) | 'commercial' (venue rental).
  bookingModel: text('booking_model').notNull().default('commercial').$type<'free' | 'commercial'>(),
  // The community-elected moderator (annual term) who manages free bookings and
  // proposes the guidelines. Full election flow is a follow-up; stored flat for now.
  moderatorName: text('moderator_name'),
  moderatorHandle: text('moderator_handle'),
  moderatorSince: integer('moderator_since'),
  socials: json('socials').$type<{ platform: string; url: string }[]>().default([]),
  claimed: boolean('claimed').default(false),
  status: text('status').notNull().default('visible').$type<'visible' | 'hidden'>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// A profile (venue) can offer N bookable areas — e.g. Pinakothek's 5 spaces.
export const bookableSpaces = pgTable('bookable_spaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  name: text('name').notNull(),
  capacity: integer('capacity'),
  floorType: text('floor_type'),
  priceInfo: text('price_info'),
  description: text('description'),
  imageUrl: text('image_url'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

// Booking requests — connector model (no payment held). An organizer requests a
// date for a space; the venue responds. T&C accepted at request time.
export const bookingRequests = pgTable('booking_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaceId: uuid('space_id').notNull().references(() => bookableSpaces.id),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  // The organiser running this event — an 'organizer' profile. Lets the event
  // surface on the organiser's page and marks that organiser "active this week"
  // on the city directory. Nullable: legacy/self-serve bookings may have none.
  organizerId: uuid('organizer_id').references(() => profiles.id),
  requesterId: uuid('requester_id').references(() => dancers.id),
  requesterEmail: text('requester_email').notNull(),
  requesterName: text('requester_name'),
  // Event details — a booking IS a scheduled event, so it carries enough info
  // to show on the community calendar: title, type, styles, date + time window.
  title: text('title'),
  eventType: text('event_type'), // Social · Party · Workshop · Class · Practica
  styles: json('styles').$type<string[]>().default([]),
  // Artists / teachers / DJs featured — names or @handles. Lets the event surface
  // on each artist's profile.
  artists: json('artists').$type<string[]>().default([]),
  eventDate: date('event_date'),
  startTime: text('start_time'), // 'HH:MM'
  endTime: text('end_time'),     // 'HH:MM'
  headcount: integer('headcount'),
  message: text('message'), // description / notes
  // Optional external tickets link — free community events leave this null.
  ticketUrl: text('ticket_url'),
  termsAcceptedAt: timestamp('terms_accepted_at'),
  status: text('status').notNull().default('pending').$type<'pending' | 'accepted' | 'declined'>(),
  // Free/OpenAir commons only (G804): the elected moderator approves/declines
  // requests against the active guidelines. Who decided, when, and an optional
  // note back to the requester. Null on commercial venues (decided off-platform).
  moderatedById: uuid('moderated_by_id').references(() => dancers.id),
  moderatedAt: timestamp('moderated_at'),
  moderationNote: text('moderation_note'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Festival submissions from the /organizers/create wizard. There is no live
// self-serve publish yet — the wizard captures the full draft here for the
// team to review and onboard, instead of pretending to go live. The whole
// draft is stored as a JSON payload so the schema doesn't have to track every
// wizard field.
export const festivalSubmissions = pgTable('festival_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug'),
  name: text('name'),
  submittedById: uuid('submitted_by_id').references(() => dancers.id),
  submittedByEmail: text('submitted_by_email'),
  payload: json('payload').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull().default('pending').$type<'pending' | 'reviewing' | 'onboarded' | 'declined'>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// --- Moderator elections (community governance for free/OpenAir commons) ------
// Epic G800 (WED-152): a free space's moderator is elected annually. Candidates
// self-nominate and propose the guidelines the space runs by; the community votes
// on an OPEN, verifiable ledger (timestamped, attributable, editable-with-history);
// the winner's guidelines become the active ruleset the moderator enforces on the
// free-booking queue. Replaces the flat profiles.moderator* fields.

// The election itself + its lifecycle (G801). One active (non-closed) election
// per profile is enforced in the router.
export const moderatorElections = pgTable('moderator_elections', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  status: text('status').notNull().default('nominations').$type<'nominations' | 'voting' | 'closed'>(),
  // The one-year term the winner will serve.
  termStart: date('term_start'),
  termEnd: date('term_end'),
  // Phase transitions, each timestamped.
  nominationsOpenAt: timestamp('nominations_open_at').defaultNow(),
  votingOpenAt: timestamp('voting_open_at'),
  closesAt: timestamp('closes_at'), // planned close (informational)
  closedAt: timestamp('closed_at'), // actual close
  // Set on close. No FK (would create a cycle with electionCandidates.electionId).
  winnerCandidateId: uuid('winner_candidate_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('moderator_elections_profile_idx').on(t.profileId),
])

// A self-nominated candidate + the guidelines they run on (G802). One candidacy
// per dancer per election; a real (verified) profile is required — enforced in
// the router by requiring the dancer to have a username.
export const electionCandidates = pgTable('election_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  electionId: uuid('election_id').notNull().references(() => moderatorElections.id),
  dancerId: uuid('dancer_id').notNull().references(() => dancers.id),
  guidelines: text('guidelines').notNull(),
  statement: text('statement'), // optional short pitch
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  unique('election_candidates_unique').on(t.electionId, t.dancerId),
])

// The CURRENT vote per voter — one row per (election, voter), upserted on change
// (G803). One real profile = one vote (G801 anti-stuffing). The tally uses this
// table (latest vote per voter); the full trail lives in electionVoteHistory.
export const electionVotes = pgTable('election_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  electionId: uuid('election_id').notNull().references(() => moderatorElections.id),
  voterDancerId: uuid('voter_dancer_id').notNull().references(() => dancers.id),
  candidateId: uuid('candidate_id').notNull().references(() => electionCandidates.id),
  createdAt: timestamp('created_at').defaultNow(), // first cast
  updatedAt: timestamp('updated_at').defaultNow(), // last change
}, (t) => [
  unique('election_votes_unique').on(t.electionId, t.voterDancerId),
])

// Immutable append-only log of every cast/change (G803). Makes "is my vote still
// X?" verifiable — a vote is never silently overwritten, each change is a row.
export const electionVoteHistory = pgTable('election_vote_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  electionId: uuid('election_id').notNull().references(() => moderatorElections.id),
  voterDancerId: uuid('voter_dancer_id').notNull().references(() => dancers.id),
  fromCandidateId: uuid('from_candidate_id'), // null = first cast
  toCandidateId: uuid('to_candidate_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('election_vote_history_idx').on(t.electionId, t.voterDancerId),
])

// Per-term guideline versions (G804): on close, the winner's guidelines become
// the space's active ruleset; every term is preserved so governance history is
// auditable across elections.
export const guidelineVersions = pgTable('guideline_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id),
  electionId: uuid('election_id').references(() => moderatorElections.id),
  moderatorDancerId: uuid('moderator_dancer_id').references(() => dancers.id),
  guidelines: text('guidelines').notNull(),
  termStart: date('term_start'),
  termEnd: date('term_end'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('guideline_versions_profile_idx').on(t.profileId),
])
