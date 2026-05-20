import { pgTable, uuid, text, integer, boolean, timestamp, date, unique, json } from 'drizzle-orm/pg-core'

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
