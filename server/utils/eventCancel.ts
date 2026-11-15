/**
 * Cancelling an event (RAZ-948). The event stays published and listed, marked
 * "Cancelled" with the organiser's optional reason (events.cancelled_at /
 * cancel_reason / cancelled_by), and everyone who signed up is emailed once:
 *
 *   - the event on their plan (plan_items; a festival also by its key),
 *   - a "yes" on the event poll (event_rsvps, confirmed, not "next"),
 *   - going / a ticket (attendances, incl. unclaimed ticket stubs by email),
 *   - festival sign-ups and ticket buyers (festival_signups, TicketTailor email).
 *
 * Weekend-share joins of signed-in friends are already plan items; guests left
 * no email. Refunds are out of scope: ticket holders are told to contact the
 * organiser. Undo clears the columns and emails nobody.
 */
import { and, eq, inArray, isNotNull, ne, or } from 'drizzle-orm'
import { attendances, dancers, eventRsvps, events, festivalSignups, festivals, planItems } from '../database/schema'
import { formatEventWhen } from '../../shared/utils/eventTime'
import { eventPath } from '../../shared/utils/eventSlug'
import { sendEventCancelledEmail } from './email'

export const CANCEL_REASON_MAX = 280

export type CancelRecipient = { email: string; name: string; ticket: boolean }

/** Raw sign-ups of one event, as gathered from the tables above. */
export type SignupRows = {
  /** Dancer ids with the event on their plan, a confirmed poll "yes" or an attendance. */
  dancers: { id: string; ticket: boolean }[]
  /** People known by email only (unclaimed ticket stubs, TicketTailor buyers). */
  emails: { email: string; ticket: boolean }[]
  /** id → name + email of the dancers above. */
  people: { id: string; name: string | null; email: string | null }[]
  /** Never emailed: whoever cancelled it. */
  exclude?: string | null
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
  for (const [id, ticket] of ticketOf) {
    if (rows.exclude && id === rows.exclude) continue
    const p = people.get(id)
    if (p) add(p.email, (p.name ?? '').split(/\s+/)[0] ?? '', ticket)
  }
  const excludedEmail = rows.exclude ? people.get(rows.exclude)?.email?.toLowerCase() : null
  for (const e of rows.emails) {
    if (excludedEmail && e.email.trim().toLowerCase() === excludedEmail) continue
    add(e.email, '', e.ticket)
  }
  return [...by.values()]
}

/** Everyone to tell that this event is cancelled. */
export async function signupsOf(db: any, ev: any, exclude?: string | null): Promise<CancelRecipient[]> {
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

  const ids = [...new Set(list.map(d => d.id).concat(exclude ? [exclude] : []))]
  const people = ids.length
    ? await db.select({ id: dancers.id, name: dancers.name, email: dancers.email }).from(dancers).where(inArray(dancers.id, ids))
    : []
  return cancelRecipients({ dancers: list, emails, people, exclude })
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

/** Back on: clears the cancellation. Nobody is emailed. */
export async function uncancelEvent(db: any, id: string) {
  await db.update(events).set({ cancelledAt: null, cancelReason: null, cancelledBy: null, updatedAt: new Date() }).where(eq(events.id, id))
}
