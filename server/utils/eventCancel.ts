/**
 * Cancelling an event (RAZ-948). The event stays published and listed, marked
 * "Cancelled" with the organiser's optional reason (events.cancelled_at /
 * cancel_reason / cancelled_by), and everyone who signed up is emailed once:
 *
 *   - the event on their plan (plan_items; a festival also by its key),
 *   - a "yes" on the event poll (event_rsvps, confirmed, not "next"; a guest's
 *     unconfirmed answer too when they left an email — guest_email, 0069),
 *   - going / a ticket (attendances, incl. unclaimed ticket stubs by email),
 *   - festival sign-ups and ticket buyers (festival_signups, TicketTailor email).
 *
 * Weekend-share joins of signed-in friends are already plan items; a guest's
 * join is a guest poll "yes", emailed once they left an email. Refunds are out of scope: ticket holders are told to contact the
 * organiser. "It's on again" (RAZ-969) clears the columns and, when the
 * organiser says so, emails the same people "Good news, it's on again".
 */
import { and, eq, inArray, isNotNull, isNull, ne, or } from 'drizzle-orm'
import { attendances, dancers, eventRsvps, events, festivalSignups, festivals, planItems } from '../database/schema'
import { formatEventWhen } from '../../shared/utils/eventTime'
import { eventPath } from '../../shared/utils/eventSlug'
import { sendEventBackOnEmail, sendEventCancelledEmail } from './email'

export const CANCEL_REASON_MAX = 280

export type CancelRecipient = { email: string; name: string; ticket: boolean }

/** Raw sign-ups of one event, as gathered from the tables above. */
export type SignupRows = {
  /** Dancer ids with the event on their plan, a confirmed poll "yes" or an attendance. */
  dancers: { id: string; ticket: boolean }[]
  /** People known by email only (unclaimed ticket stubs, TicketTailor buyers, poll guests). */
  emails: { email: string; ticket: boolean }[]
  /** id → name + email of the dancers above. */
  people: { id: string; name: string | null; email: string | null }[]
  /** Never emailed: whoever cancelled it (and, for "it's on again", whoever undid it). */
  exclude?: string | string[] | null
}

/**
 * One email per address (case-insensitive), ticket wins: a dancer who is on the
 * plan AND holds a ticket gets the ticket wording. Pure, unit-tested.
 */
export function cancelRecipients(rows: SignupRows): CancelRecipient[] {
  const by = new Map<string, CancelRecipient>()
  const add = (email: string | null | undefined, name: string, ticket: boolean) => {
    const e = (email ?? '').trim()
    if (!e || !e.includes('@')) return
    const key = e.toLowerCase()
    const had = by.get(key)
    if (had) { had.ticket ||= ticket; if (!had.name && name) had.name = name; return }
    by.set(key, { email: e, name, ticket })
  }
  const people = new Map(rows.people.map(p => [p.id, p]))
  const ticketOf = new Map<string, boolean>()
  for (const d of rows.dancers) ticketOf.set(d.id, (ticketOf.get(d.id) ?? false) || d.ticket)
  const excluded = new Set(excludeIds(rows.exclude))
  for (const [id, ticket] of ticketOf) {
    if (excluded.has(id)) continue
    const p = people.get(id)
    if (p) add(p.email, (p.name ?? '').split(/\s+/)[0] ?? '', ticket)
  }
  const excludedEmails = new Set([...excluded].map(id => people.get(id)?.email?.trim().toLowerCase()).filter(Boolean))
  for (const e of rows.emails) {
    if (excludedEmails.has(e.email.trim().toLowerCase())) continue
    add(e.email, '', e.ticket)
  }
  return [...by.values()]
}

function excludeIds(exclude: SignupRows['exclude']): string[] {
  return (Array.isArray(exclude) ? exclude : [exclude]).filter((x): x is string => !!x)
}

/** Everyone to tell that this event is cancelled (or on again). */
export async function signupsOf(db: any, ev: any, exclude?: string | string[] | null): Promise<CancelRecipient[]> {
  const { dancers: list, emails } = await signupRowsOf(db, ev)
  const ids = [...new Set(list.map(d => d.id).concat(excludeIds(exclude)))]
  const people = ids.length
    ? await db.select({ id: dancers.id, name: dancers.name, email: dancers.email }).from(dancers).where(inArray(dancers.id, ids))
    : []
  return cancelRecipients({ dancers: list, emails, people, exclude })
}

/**
 * Did this dancer sign up for the event (RAZ-1011: only they may review it)? Same sources as
 * `signupsOf` — on their plan, a confirmed poll answer other than "next", going / a ticket —
 * matched by dancer id, or by their email for ticket stubs and guests who signed in later.
 */
export async function wentTo(db: any, ev: any, dancer: { id: string; email?: string | null }): Promise<boolean> {
  const { dancers: list, emails } = await signupRowsOf(db, ev)
  if (list.some(d => d.id === dancer.id)) return true
  const mine = (dancer.email ?? '').trim().toLowerCase()
  return !!mine && emails.some(e => e.email.trim().toLowerCase() === mine)
}

/** The raw sign-ups of one event (dancer ids + email-only people), from every table above. */
export async function signupRowsOf(db: any, ev: any): Promise<Pick<SignupRows, 'dancers' | 'emails'>> {
  const key: string | null = (ev.festival as any)?.key ?? (ev.isFestival ? ev.slug : null)
  const list: SignupRows['dancers'] = []
  const emails: SignupRows['emails'] = []

  const plans = await db.select({ dancerId: planItems.dancerId }).from(planItems)
    .where(or(
      and(eq(planItems.itemType, 'event'), eq(planItems.itemId, ev.id)),
      key ? and(eq(planItems.itemType, 'festival'), eq(planItems.itemId, key)) : undefined,
    ))
  for (const p of plans) list.push({ id: p.dancerId, ticket: false })

  // The poll: a confirmed answer that says coming (anything but "next time").
  const polls = await db.select({ dancerId: eventRsvps.dancerId }).from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, ev.id), isNotNull(eventRsvps.dancerId), isNotNull(eventRsvps.confirmedAt), ne(eventRsvps.answer, 'next')))
  for (const r of polls) list.push({ id: r.dancerId, ticket: false })
  // Guests who left an email at the confirm-link step but never clicked it (0069).
  const guests = await db.select({ email: eventRsvps.guestEmail }).from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, ev.id), isNull(eventRsvps.dancerId), isNotNull(eventRsvps.guestEmail), ne(eventRsvps.answer, 'next')))
  for (const g of guests) if (g.email) emails.push({ email: g.email, ticket: false })

  const att = await db.select({ dancerId: attendances.dancerId, buyerEmail: attendances.buyerEmail, status: attendances.status })
    .from(attendances).where(and(eq(attendances.eventId, ev.id), inArray(attendances.status, ['going', 'ticket_holder'])))
  for (const a of att) {
    const ticket = a.status === 'ticket_holder'
    if (a.dancerId) list.push({ id: a.dancerId, ticket })
    else if (a.buyerEmail) emails.push({ email: a.buyerEmail, ticket })
  }

  if (key) {
    const [f] = await db.select({ id: festivals.id }).from(festivals).where(eq(festivals.slug, key))
    if (f) {
      const signups = await db.select({ dancerId: festivalSignups.dancerId, paid: festivalSignups.paidAmount, verified: festivalSignups.verifiedTicketHolder, email: festivalSignups.tickettailorBuyerEmail })
        .from(festivalSignups).where(eq(festivalSignups.festivalId, f.id))
      for (const s of signups) {
        const ticket = !!s.verified || (s.paid ?? 0) > 0
        if (s.dancerId) list.push({ id: s.dancerId, ticket })
        else if (s.email) emails.push({ email: s.email, ticket })
      }
    }
  }

  return { dancers: list, emails }
}

export type CancelResult = { id: string; name: string; cancelled: boolean; notified: number; alreadyCancelled: boolean }

/**
 * Mark it cancelled and email everyone who signed up. Cancelling an already
 * cancelled event only updates the reason (nobody is emailed twice).
 * `send` = false counts the people without emailing (MCP preview).
 */
export async function cancelEvent(
  ctx: { db: any; dancerId: string; waitUntil?: (p: Promise<unknown>) => void },
  ev: any,
  reason: string | null,
  opts: { siteUrl: string; organizer: string | null },
): Promise<CancelResult> {
  const now = new Date()
  const clean = reason?.trim().slice(0, CANCEL_REASON_MAX) || null
  const already = !!ev.cancelledAt
  await ctx.db.update(events)
    .set({ cancelledAt: already ? ev.cancelledAt : now, cancelReason: clean, cancelledBy: already ? ev.cancelledBy : ctx.dancerId, updatedAt: now })
    .where(eq(events.id, ev.id))
  if (already) return { id: ev.id, name: ev.name ?? '', cancelled: true, notified: 0, alreadyCancelled: true }

  const people = await signupsOf(ctx.db, ev, ctx.dancerId)
  const tz = ev.timezone || 'Europe/Berlin'
  const when = ev.startDate ? formatEventWhen(ev.startDate, ev.endDate, tz) : ''
  const link = `${opts.siteUrl}${eventPath(ev)}`
  const send = async () => {
    for (const p of people) {
      try {
        await sendEventCancelledEmail({ to: p.email, name: p.name, eventName: ev.name || 'Event', when, reason: clean, organizer: opts.organizer, ticket: p.ticket, link })
      } catch (e) {
        console.error('[cancel] email failed', ev.id, e)
      }
    }
  }
  // After the response when the platform lets us; else before it.
  if (ctx.waitUntil) ctx.waitUntil(send())
  else await send()
  return { id: ev.id, name: ev.name ?? '', cancelled: true, notified: people.length, alreadyCancelled: false }
}

/** The event has ended (or, without an end, started): too late to tell anyone it's on. */
export function isOver(ev: { endDate?: Date | string | null; startDate?: Date | string | null }, now = Date.now()): boolean {
  const end = ev.endDate ?? ev.startDate
  return !!end && new Date(end).getTime() < now
}

/**
 * Who gets "Good news, it's on again" (RAZ-969): the people the cancellation
 * email went to — everyone still signed up, minus whoever cancelled it and
 * whoever undoes it. Nobody once the event is over or when it isn't cancelled.
 */
export async function backOnRecipients(db: any, ev: any, dancerId: string): Promise<CancelRecipient[]> {
  if (!ev.cancelledAt || isOver(ev)) return []
  return signupsOf(db, ev, [ev.cancelledBy, dancerId])
}

export type UncancelResult = { uncancelled: boolean; notified: number }

/**
 * Back on: clears the cancellation. With `notify`, emails the people who got
 * the cancellation email that it's on again (after the response when it can).
 */
export async function uncancelEvent(
  ctx: { db: any; dancerId: string; waitUntil?: (p: Promise<unknown>) => void },
  ev: any,
  opts: { siteUrl: string; organizer: string | null; notify: boolean },
): Promise<UncancelResult> {
  if (!ev.cancelledAt) return { uncancelled: false, notified: 0 }
  const people = opts.notify ? await backOnRecipients(ctx.db, ev, ctx.dancerId) : []
  await ctx.db.update(events).set({ cancelledAt: null, cancelReason: null, cancelledBy: null, updatedAt: new Date() }).where(eq(events.id, ev.id))
  if (!people.length) return { uncancelled: true, notified: 0 }

  const tz = ev.timezone || 'Europe/Berlin'
  const when = ev.startDate ? formatEventWhen(ev.startDate, ev.endDate, tz) : ''
  const link = `${opts.siteUrl}${eventPath(ev)}`
  const send = async () => {
    for (const p of people) {
      try {
        await sendEventBackOnEmail({ to: p.email, name: p.name, eventName: ev.name || 'Event', when, organizer: opts.organizer, ticket: p.ticket, link })
      } catch (e) {
        console.error('[uncancel] email failed', ev.id, e)
      }
    }
  }
  if (ctx.waitUntil) ctx.waitUntil(send())
  else await send()
  return { uncancelled: true, notified: people.length }
}
