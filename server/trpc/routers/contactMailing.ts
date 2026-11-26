import { z } from 'zod'
import { and, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { contactMailingRecipients, contactMailings, dancers, events, profileContacts, profileMembers } from '../../database/schema'
import { requireMember } from './business'
import { profileGroup, trackServer } from '../../utils/posthog'
import { siteUrl } from '../../utils/profileFeed'
import { sendContactMailing } from '../../utils/email'
import { eventPath } from '../../../shared/utils/eventSlug'
import { formatEventWhen } from '../../../shared/utils/eventTime'
import { IMG, sizedImage } from '../../../shared/utils/image'
import { mailingStats, type MailingStats } from '../../../shared/utils/mailingTracking'
import {
  MAILING_BODY_MAX, MAILING_MAX_RECIPIENTS, MAILING_SUBJECT_MAX,
  mailingRecipients, personalise, renderMailingHtml, renderMailingText, type MailingContent, type MailingEventCard,
} from '../../../shared/utils/contactMailing'

/**
 * A page's email to its contacts (RAZ-975 / RAZ-960): Contacts → "Email N". The organiser
 * writes (or starts from "Invite to my next event"), previews, sends a test to themselves,
 * then sends to the contacts the list's filter shows. Only contacts the page may email get it
 * (contactSegments.emailBlock: unsubscribed and imported lists never do), each address once,
 * each with a one-click unsubscribe. Every send is logged in `contact_mailings`.
 *
 * Web only: none of these is in PROCEDURE_SCOPES, so connected apps (MCP) can't send.
 * Owners and editors send; moderators don't.
 */

const DUPLICATE_WINDOW_MS = 10 * 60_000

const content = z.object({
  username: z.string().min(1),
  subject: z.string().trim().min(1).max(MAILING_SUBJECT_MAX),
  body: z.string().trim().min(1).max(MAILING_BODY_MAX),
  eventId: z.string().uuid().nullish(),
})

async function requireSender(ctx: any, username: string) {
  const p = await requireMember(ctx, username)
  if (ctx.isAdmin) return p
  const [m] = await ctx.db.select({ role: profileMembers.role }).from(profileMembers)
    .where(and(eq(profileMembers.profileId, p.id), eq(profileMembers.dancerId, ctx.dancerId)))
  if (m?.role === 'moderator') throw new TRPCError({ code: 'FORBIDDEN', message: `Only owners and editors of @${username} can email its contacts.` })
  return p
}

/** The page's events people can still come to: run, hosted or co-organised by it, published, not cancelled. */
function pageEventsWhere(p: { id: string, username: string }, now: Date) {
  const co = JSON.stringify([{ username: p.username }])
  return and(
    sql`(${events.hostProfileId} = ${p.id} or ${events.organizerUsername} = ${p.username} or ${events.venueUsername} = ${p.username} or ${events.coOrganizers} @> ${co}::jsonb)`,
    eq(events.published, true), eq(events.archived, false), isNull(events.cancelledAt), gte(events.startDate, now),
  )
}

async function eventCard(ctx: any, p: { id: string, username: string }, eventId: string | null | undefined): Promise<{ card: MailingEventCard, id: string } | null> {
  if (!eventId) return null
  const [ev] = await ctx.db.select({
    id: events.id, name: events.name, startDate: events.startDate, endDate: events.endDate, timezone: events.timezone,
    venueName: events.venueName, cover: events.cover,
  }).from(events).where(and(eq(events.id, eventId), pageEventsWhere(p, new Date(0))))
  if (!ev?.startDate) throw new TRPCError({ code: 'NOT_FOUND', message: 'That event isn’t one of this page’s published events.' })
  return {
    id: ev.id,
    card: {
      name: ev.name || 'Event',
      when: formatEventWhen(ev.startDate, ev.endDate, ev.timezone ?? undefined),
      place: ev.venueName,
      cover: sizedImage(ev.cover || null, IMG.large) ?? null,
      url: `${siteUrl()}${eventPath(ev)}?utm_source=email&utm_medium=contacts&utm_campaign=${encodeURIComponent(p.username)}`,
    },
  }
}

const unsubscribeUrl = (contactId: string) => `${siteUrl()}/api/contacts/unsubscribe?id=${contactId}`

async function senderEmail(ctx: any): Promise<{ email: string | null, name: string | null }> {
  const [d] = await ctx.db.select({ email: dancers.email, name: dancers.name }).from(dancers).where(eq(dancers.id, ctx.dancerId))
  return { email: d?.email ?? null, name: d?.name ?? null }
}

export const contactMailingRouter = router({
  /** What the composer needs: the page's coming events (for the template) and the last sends. */
  options: protectedProcedure.input(z.object({ username: z.string().min(1) })).query(async ({ ctx, input }) => {
    const p = await requireSender(ctx, input.username)
    const now = new Date()
    const [evs, sends, me] = await Promise.all([
      ctx.db.select({ id: events.id, name: events.name, startDate: events.startDate, endDate: events.endDate, timezone: events.timezone })
        .from(events).where(pageEventsWhere(p, now)).orderBy(events.startDate).limit(20),
      ctx.db.select({
        id: contactMailings.id, subject: contactMailings.subject, segment: contactMailings.segment, recipients: contactMailings.recipients,
        sent: contactMailings.sent, failed: contactMailings.failed, status: contactMailings.status, createdAt: contactMailings.createdAt, byName: dancers.name,
      }).from(contactMailings).leftJoin(dancers, eq(dancers.id, contactMailings.sentBy))
        .where(eq(contactMailings.profileId, p.id)).orderBy(desc(contactMailings.createdAt)).limit(10),
      senderEmail(ctx),
    ])
    // What happened after each send (migration 0080): delivered / opened / clicked / bounced per recipient.
    const ids = sends.map((x: any) => x.id as string)
    const tracked = ids.length
      ? await ctx.db.select({
          mailingId: contactMailingRecipients.mailingId, status: contactMailingRecipients.status, deliveredAt: contactMailingRecipients.deliveredAt,
          firstOpenedAt: contactMailingRecipients.firstOpenedAt, firstClickedAt: contactMailingRecipients.firstClickedAt,
        }).from(contactMailingRecipients).where(inArray(contactMailingRecipients.mailingId, ids))
      : []
    const byMailing = new Map<string, any[]>()
    for (const t of tracked as any[]) byMailing.set(t.mailingId, [...(byMailing.get(t.mailingId) ?? []), t])
    return {
      profile: { username: p.username, name: p.name as string },
      pageUrl: `${siteUrl()}/@${p.username}`,
      events: evs.map((e: any) => ({ id: e.id as string, name: (e.name || 'Event') as string, when: formatEventWhen(e.startDate, e.endDate, e.timezone ?? undefined) })),
      sends: (sends as any[]).map(x => ({ ...x, stats: byMailing.has(x.id) ? mailingStats(byMailing.get(x.id)!) : null })) as { id: string, subject: string, segment: string, recipients: number, sent: number, failed: number, status: string, createdAt: Date, byName: string | null, stats: MailingStats | null }[],
      /** Tests go here; replies to the real email too. */
      myEmail: me.email,
    }
  }),

  /** The event card as the email will show it (the preview). */
  eventCard: protectedProcedure.input(z.object({ username: z.string().min(1), eventId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const p = await requireSender(ctx, input.username)
    return (await eventCard(ctx, p, input.eventId))!.card
  }),

  /** The email, to the sender only, marked as a test. */
  sendTest: protectedProcedure.input(content).mutation(async ({ ctx, input }) => {
    const p = await requireSender(ctx, input.username)
    const me = await senderEmail(ctx)
    if (!me.email) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Your account has no email to send the test to.' })
    const ev = await eventCard(ctx, p, input.eventId)
    const c: MailingContent = { profileName: p.name, subject: input.subject, body: input.body, event: ev?.card, pageUrl: `${siteUrl()}/@${p.username}` }
    const to = { name: me.name }
    const r = await sendContactMailing({
      profileName: p.name, replyTo: me.email, subject: `[Test] ${personalise(input.subject, me.name)}`,
      messages: [{ to: me.email, html: renderMailingHtml(c, to), text: renderMailingText(c, to) }],
    })
    if (!r.sent) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'The test didn’t go out. Try again in a minute.' })
    return { to: me.email }
  }),

  /**
   * Send it. `contactIds` = the contacts the list's filter shows; the server keeps only
   * this page's contacts it may email. The same subject twice within 10 minutes is refused
   * (a double click, or two people on the team at once).
   */
  send: protectedProcedure
    .input(content.extend({
      contactIds: z.array(z.string().uuid()).min(1).max(MAILING_MAX_RECIPIENTS),
      segment: z.string().max(300).default(''),
      filter: z.record(z.string(), z.unknown()).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const p = await requireSender(ctx, input.username)
      const rows = await ctx.db.select({ id: profileContacts.id, email: profileContacts.email, name: profileContacts.name, status: profileContacts.status, source: profileContacts.source, bouncedAt: profileContacts.bouncedAt })
        .from(profileContacts).where(and(eq(profileContacts.profileId, p.id), inArray(profileContacts.id, input.contactIds)))
      const to = mailingRecipients(rows as any[])
      if (!to.length) throw new TRPCError({ code: 'BAD_REQUEST', message: 'None of these contacts can be emailed: they never signed up for your emails, unsubscribed, or their address bounced.' })

      const [recent] = await ctx.db.select({ id: contactMailings.id }).from(contactMailings)
        .where(and(eq(contactMailings.profileId, p.id), eq(contactMailings.subject, input.subject), gte(contactMailings.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS))))
        .limit(1)
      if (recent) throw new TRPCError({ code: 'CONFLICT', message: 'This email went out a few minutes ago. Change the subject to send another one.' })

      const ev = await eventCard(ctx, p, input.eventId)
      const me = await senderEmail(ctx)
      const [log] = await ctx.db.insert(contactMailings).values({
        profileId: p.id, sentBy: ctx.dancerId, subject: input.subject, body: input.body, eventId: ev?.id ?? null,
        segment: input.segment, filter: input.filter, contactIds: to.map(c => c.id), recipients: to.length,
      }).returning({ id: contactMailings.id })
      if (!log) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Couldn’t start the send. Try again.' })

      const c: MailingContent = { profileName: p.name, subject: input.subject, body: input.body, event: ev?.card, pageUrl: `${siteUrl()}/@${p.username}` }
      const r = await sendContactMailing({
        profileName: p.name, replyTo: me.email, subject: input.subject, mailingId: log.id,
        messages: to.map((x) => {
          const who = { name: x.name, unsubscribeUrl: unsubscribeUrl(x.id) }
          return { to: x.email, subject: personalise(input.subject, x.name), html: renderMailingHtml(c, who), text: renderMailingText(c, who), unsubscribeUrl: who.unsubscribeUrl }
        }),
      })
      await ctx.db.update(contactMailings)
        .set({ sent: r.sent, failed: r.failed, status: r.sent ? 'sent' : 'failed', finishedAt: new Date() })
        .where(eq(contactMailings.id, log.id))
      // One row per recipient; Resend's webhook fills in delivered / opened / clicked / bounced by `resendId`.
      // Tracking must never fail a send that already went out.
      try {
        const recipientRows = to.map((x, i) => ({
          mailingId: log.id, contactId: x.id, email: x.email,
          resendId: r.results[i]?.resendId ?? null, status: (r.results[i]?.ok === false ? 'failed' : 'sent') as 'failed' | 'sent',
        }))
        for (let i = 0; i < recipientRows.length; i += 500) await ctx.db.insert(contactMailingRecipients).values(recipientRows.slice(i, i + 500))
      } catch (e) { console.error('[contact-mailing] recipients not logged', e) }
      trackServer(ctx, 'contacts_emailed', {
        recipients: to.length, sent: r.sent, failed: r.failed, skipped: input.contactIds.length - to.length,
        has_event: !!ev, filtered: !!input.segment, profile: p.username, profile_type: p.type, ...profileGroup(p.username),
      })
      return { id: log.id as string, recipients: to.length, sent: r.sent, failed: r.failed, skipped: input.contactIds.length - to.length }
    }),
})
