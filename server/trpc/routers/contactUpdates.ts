import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { and, asc, desc, eq, gte, isNull, or, sql } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { contactUpdateSends, dancers, events, profileContacts } from '../../database/schema'
import { requireMember } from './business'
import { loadContactActivity, activityFor } from '../../utils/contactActivity'
import { sendContactUpdates, type ContactUpdateMessage } from '../../utils/email'
import { siteUrl } from '../../utils/profileFeed'
import { profileGroup, trackServer } from '../../utils/posthog'
import { ACTIVITY_FILTERS, COMING_AS_ORDER, CONTACT_SOURCES } from '../../../shared/utils/contactSegments'
import {
  UPDATE_BODY_MAX, UPDATE_MAX_RECIPIENTS, UPDATE_SUBJECT_MAX, personalise, segmentLabel, updateAudience, updateEmailHtml, updateEmailText,
  type UpdateEvent, type UpdateSegment,
} from '../../../shared/utils/contactUpdate'
import { IMG, sizedImage } from '../../../shared/utils/image'
import { requireProfileRole } from '../../utils/profileAccess'

/**
 * Contacts → "Send an update" (RAZ-960): an organiser writes an update (or starts from the
 * "invite to my next event" template: event card + RSVP), picks a segment on the Contacts page,
 * previews it, sends a test to themselves, then sends it. Only contacts the page may email
 * (shared/utils/contactSegments.ts `emailBlock`), imported lists off unless ticked in
 * (shared/utils/contactUpdate.ts). Each email has a one-click unsubscribe for the page; each send
 * is logged in `contact_update_sends`. Nothing is sent without a click; apps (MCP tokens) can't
 * send — and these procedures aren't in the scope map, so tokens can't call them at all.
 */

const segmentInput = z.object({
  sources: z.array(z.enum(CONTACT_SOURCES)).max(CONTACT_SOURCES.length).default([]),
  activity: z.array(z.enum(ACTIVITY_FILTERS)).max(ACTIVITY_FILTERS.length).default([]),
  event: z.string().min(1).max(64).nullable().default(null),
  as: z.enum(COMING_AS_ORDER as [string, ...string[]]).nullable().default(null),
  includeImported: z.boolean().default(false),
})

const draftInput = z.object({
  username: z.string().min(1),
  segment: segmentInput,
  subject: z.string().trim().max(UPDATE_SUBJECT_MAX),
  body: z.string().trim().max(UPDATE_BODY_MAX),
  eventId: z.string().min(1).max(64).nullable().default(null),
})

/** No sends between two identical updates this close together (a double click, a second tab). */
const REPEAT_WINDOW_MS = 10 * 60_000

function noApps(ctx: any) {
  if (ctx.scopes) throw new TRPCError({ code: 'FORBIDDEN', message: 'Send updates from WeDance itself, after looking at them.' })
}

const eventUrl = (id: string) => `${siteUrl()}/events/${id}?utm_source=wedance&utm_medium=email&utm_campaign=contact_update`
const unsubscribeUrl = (contactId: string) => `${siteUrl()}/api/contacts/unsubscribe?id=${contactId}`

/** The page's next events (published, not over, not cancelled), soonest first — for the template. */
async function upcomingEvents(db: any, page: { id: string, username: string }, limit = 10): Promise<UpdateEvent[]> {
  const co = JSON.stringify([{ username: page.username }])
  const rows = await db.select({
    id: events.id, name: events.name, startDate: events.startDate, endDate: events.endDate, timezone: events.timezone,
    venueName: events.venueName, venueAddress: events.venueAddress, cover: events.cover, price: events.price,
  }).from(events).where(and(
    or(eq(events.hostProfileId, page.id), eq(events.organizerUsername, page.username), eq(events.venueUsername, page.username), sql`${events.coOrganizers} @> ${co}::jsonb`),
    eq(events.published, true), eq(events.archived, false), isNull(events.cancelledAt),
    gte(events.startDate, sql`(now() at time zone 'UTC')`),
  )).orderBy(asc(events.startDate)).limit(limit)
  return rows.map((e: any) => ({
    id: e.id, name: e.name || 'Event', startDate: new Date(e.startDate).toISOString(), endDate: e.endDate ? new Date(e.endDate).toISOString() : null,
    timezone: e.timezone, venueName: e.venueName, venueAddress: e.venueAddress, cover: sizedImage(e.cover || null, IMG.card) ?? null, price: e.price || null,
  }))
}

async function eventFor(db: any, page: { id: string, username: string }, eventId: string | null) {
  if (!eventId) return null
  const ev = (await upcomingEvents(db, page, 60)).find(e => e.id === eventId)
  if (!ev) throw new TRPCError({ code: 'BAD_REQUEST', message: 'That event isn’t one of your upcoming events any more.' })
  return ev
}

/** Everyone in the segment the page may email (same rules as the Contacts page). */
async function audience(db: any, page: { id: string, username: string }, segment: UpdateSegment) {
  const [rows, act] = await Promise.all([
    db.select({
      id: profileContacts.id, email: profileContacts.email, name: profileContacts.name, source: profileContacts.source,
      status: profileContacts.status, createdAt: profileContacts.createdAt, dancerId: profileContacts.dancerId, accountName: dancers.name,
    }).from(profileContacts).leftJoin(dancers, eq(dancers.id, profileContacts.dancerId))
      .where(eq(profileContacts.profileId, page.id)).orderBy(desc(profileContacts.createdAt)),
    loadContactActivity(db, page),
  ])
  const list = rows.map((r: any) => ({
    id: r.id as string, email: r.email as string, name: (r.name || r.accountName || null) as string | null, source: r.source, status: r.status,
    createdAt: r.createdAt, hasAccount: !!r.dancerId, activity: activityFor(act.byDancer, r.dancerId),
  }))
  return updateAudience(list, segment)
}

async function me(db: any, dancerId: string) {
  const [d] = await db.select({ email: dancers.email, name: dancers.name }).from(dancers).where(eq(dancers.id, dancerId))
  if (!d) throw new TRPCError({ code: 'NOT_FOUND', message: 'Account not found.' })
  return d as { email: string, name: string | null }
}

const replyToOf = (p: any, fallback: string) => ((p.contact ?? {}) as { email?: string }).email?.trim() || fallback

function requireWords(input: { subject: string, body: string }) {
  if (!input.subject) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Write a subject.' })
  if (!input.body) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Write your update.' })
}

export const contactUpdatesRouter = router({
  /** What the composer needs: your address (for the test), the template's events, the send log. */
  compose: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    const [mine, upcoming, sends] = await Promise.all([
      me(ctx.db, ctx.dancerId),
      upcomingEvents(ctx.db, { id: p.id, username: p.username }),
      ctx.db.select({
        id: contactUpdateSends.id, createdAt: contactUpdateSends.createdAt, subject: contactUpdateSends.subject, segmentLabel: contactUpdateSends.segmentLabel,
        recipients: contactUpdateSends.recipients, failed: contactUpdateSends.failed, byName: dancers.name, eventId: contactUpdateSends.eventId,
      }).from(contactUpdateSends).leftJoin(dancers, eq(dancers.id, contactUpdateSends.sentBy))
        .where(eq(contactUpdateSends.profileId, p.id)).orderBy(desc(contactUpdateSends.createdAt)).limit(20),
    ])
    return { profile: { username: p.username, name: p.name }, myEmail: mine.email, events: upcoming, sends }
  }),

  /** How many it goes to (and who's left out), plus the email as it will look. */
  preview: protectedProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    const p = await requireMember(ctx, input.username)
    const page = { id: p.id, username: p.username }
    const [a, ev, mine] = await Promise.all([audience(ctx.db, page, input.segment as UpdateSegment), eventFor(ctx.db, page, input.eventId), me(ctx.db, ctx.dancerId)])
    const html = updateEmailHtml({
      pageName: p.name, subject: input.subject, body: input.body, name: mine.name, event: ev, eventUrl: ev ? eventUrl(ev.id) : null,
      unsubscribeUrl: '#', test: false,
    })
    return { recipients: Math.min(a.to.length, UPDATE_MAX_RECIPIENTS), over: a.to.length > UPDATE_MAX_RECIPIENTS, cantEmail: a.cantEmail, imported: a.imported, subject: personalise(input.subject, mine.name), html }
  }),

  /** The update to your own address only, marked as a test. Not logged, nobody else gets it. */
  sendTest: protectedProcedure.input(draftInput).mutation(async ({ ctx, input }) => {
    noApps(ctx)
    requireWords(input)
    const p = await requireMember(ctx, input.username)
    await requireProfileRole(ctx, p.id, 'editor')
    const ev = await eventFor(ctx.db, { id: p.id, username: p.username }, input.eventId)
    const mine = await me(ctx.db, ctx.dancerId)
    const mail = { pageName: p.name, subject: input.subject, body: input.body, name: mine.name, event: ev, eventUrl: ev ? eventUrl(ev.id) : null, unsubscribeUrl: `${siteUrl()}/business/network/${p.username}/contacts`, test: true }
    const r = await sendContactUpdates({
      profileName: p.name, replyTo: replyToOf(p, mine.email),
      messages: [{ to: mine.email, subject: `[Test] ${personalise(input.subject, mine.name)}`, html: updateEmailHtml(mail), text: updateEmailText(mail), unsubscribeUrl: mail.unsubscribeUrl }],
    })
    if (!r.sent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The test didn’t go out. Please try again.' })
    return { to: mine.email }
  }),

  /**
   * Send it. `expected` is the count the organiser saw: if the segment changed since (someone
   * unsubscribed, signed up), nothing goes out and the new count comes back to confirm again.
   */
  send: protectedProcedure
    .input(draftInput.extend({ expected: z.number().int().min(1), template: z.enum(['invite_next_event']).nullable().default(null) }))
    .mutation(async ({ ctx, input }) => {
      noApps(ctx)
      requireWords(input)
      const p = await requireMember(ctx, input.username)
      // Owners and editors send; moderators can look but not email everyone.
      await requireProfileRole(ctx, p.id, 'editor')
      const page = { id: p.id, username: p.username }
      const segment = input.segment as UpdateSegment
      const [a, ev, mine] = await Promise.all([audience(ctx.db, page, segment), eventFor(ctx.db, page, input.eventId), me(ctx.db, ctx.dancerId)])
      const to = a.to.slice(0, UPDATE_MAX_RECIPIENTS)
      if (!to.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nobody in this segment can be emailed.' })
      if (to.length !== input.expected) throw new TRPCError({ code: 'CONFLICT', message: `This segment now has ${to.length} ${to.length === 1 ? 'person' : 'people'} you can email, not ${input.expected}. Check and send again.` })

      const [recent] = await ctx.db.select({ id: contactUpdateSends.id }).from(contactUpdateSends).where(and(
        eq(contactUpdateSends.profileId, p.id), eq(contactUpdateSends.subject, input.subject), eq(contactUpdateSends.body, input.body),
        gte(contactUpdateSends.createdAt, new Date(Date.now() - REPEAT_WINDOW_MS)),
      )).limit(1)
      if (recent) throw new TRPCError({ code: 'CONFLICT', message: 'You sent this update a few minutes ago.' })

      const label = segmentLabel(segment, ev?.name ?? (segment.event ? (await eventName(ctx.db, segment.event)) : null))
      // The log row first, so a slow or failed send is still on record.
      const [log] = await ctx.db.insert(contactUpdateSends).values({
        profileId: p.id, sentBy: ctx.dancerId, segment, segmentLabel: label, subject: input.subject, body: input.body,
        eventId: ev?.id ?? null, template: input.template, recipients: to.length, failed: 0,
      }).returning({ id: contactUpdateSends.id, createdAt: contactUpdateSends.createdAt })

      const messages: ContactUpdateMessage[] = to.map((c) => {
        const mail = { pageName: p.name, subject: input.subject, body: input.body, name: c.name, event: ev, eventUrl: ev ? eventUrl(ev.id) : null, unsubscribeUrl: unsubscribeUrl(c.id) }
        return { to: c.email, subject: personalise(input.subject, c.name), html: updateEmailHtml(mail), text: updateEmailText(mail), unsubscribeUrl: mail.unsubscribeUrl }
      })
      const r = await sendContactUpdates({ profileName: p.name, replyTo: replyToOf(p, mine.email), messages })
      await ctx.db.update(contactUpdateSends).set({ recipients: r.sent, failed: r.failed }).where(eq(contactUpdateSends.id, log.id))

      trackServer(ctx, 'contact_update_sent', {
        profile: p.username, profile_type: p.type, recipients: r.sent, failed: r.failed, has_event: !!ev, template: input.template,
        include_imported: segment.includeImported, filters: segment.sources.length + segment.activity.length + (segment.event ? 1 : 0),
        left_out_imported: a.imported, ...profileGroup(p.username),
      })
      return { id: log.id, sent: r.sent, failed: r.failed, segmentLabel: label }
    }),
})

async function eventName(db: any, id: string): Promise<string | null> {
  const [e] = await db.select({ name: events.name }).from(events).where(eq(events.id, id))
  return e?.name ?? null
}
