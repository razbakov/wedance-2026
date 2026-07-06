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
