/**
 * Who is on an event's door list (RAZ-928). Same people Who's coming names,
 * minus "next time", plus a festival's passes when this event is that festival.
 * Emails stay here: the list the organiser sees never includes one.
 */
import { and, eq, gt, inArray, isNotNull, or, sql } from 'drizzle-orm'
import { attendances, dancers, eventRsvps, festivals, festivalSignups, planItems } from '../database/schema'
import { UNCONFIRMED_TTL_HOURS } from '../../shared/utils/rsvp'
import { buildDoorList, type DoorGuest, type DoorPass } from '../../shared/utils/doorList'

/** Answers that count: every confirmed one, plus unconfirmed ones younger than the TTL. Same rule as the poll. */
function countedRsvpWhere(eventId: string) {
  const fresh = new Date(Date.now() - UNCONFIRMED_TTL_HOURS * 3600_000)
  return and(eq(eventRsvps.eventId, eventId), or(isNotNull(eventRsvps.confirmedAt), gt(eventRsvps.updatedAt, fresh)))
}

export interface DoorEvent {
  id: string
  festival?: { key?: string } | null
  isFestival?: boolean | null
  slug?: string | null
}

/** The festivals.slug this event's passes live under, if it is a festival. */
export function eventFestivalKey(ev: DoorEvent): string | null {
  const key = ev.festival && typeof ev.festival === 'object' ? ev.festival.key : null
  if (typeof key === 'string' && key) return key
  return ev.isFestival && ev.slug ? ev.slug : null
}

export async function loadDoorGuests(db: any, ev: DoorEvent): Promise<DoorGuest[]> {
  const key = eventFestivalKey(ev)
  const [polls, att, plans, passes] = await Promise.all([
    db.select({
      id: eventRsvps.id, dancerId: eventRsvps.dancerId, answer: eventRsvps.answer,
      confirmedAt: eventRsvps.confirmedAt, name: eventRsvps.name, partnerName: eventRsvps.partnerName,
      checkedInAt: eventRsvps.checkedInAt,
    }).from(eventRsvps).where(countedRsvpWhere(ev.id)),
    db.select({
      id: attendances.id, dancerId: attendances.dancerId, status: attendances.status, checkedInAt: attendances.checkedInAt,
    }).from(attendances).where(and(eq(attendances.eventId, ev.id), inArray(attendances.status, ['going', 'ticket_holder']))),
    db.select({ dancerId: planItems.dancerId }).from(planItems).where(and(
      isNotNull(planItems.dancerId),
      key
        ? or(
            and(eq(planItems.itemType, 'event'), eq(planItems.itemId, ev.id)),
            and(eq(planItems.itemType, 'festival'), eq(planItems.itemId, key)),
          )
        : and(eq(planItems.itemType, 'event'), eq(planItems.itemId, ev.id)),
    )),
    loadPasses(db, key),
  ])

  const ids = [...new Set<string>([...polls, ...att, ...plans, ...passes].map((r: any) => r.dancerId).filter(Boolean))]
  const people = ids.length
    ? await db.select({ id: dancers.id, name: dancers.name, photo: dancers.photo }).from(dancers).where(inArray(dancers.id, ids))
    : []

  return buildDoorList({
    polls: polls.map((r: any) => ({
      id: r.id, dancerId: r.dancerId, answer: r.answer, confirmed: !!r.confirmedAt,
      name: r.name ?? null, partnerName: r.partnerName ?? null, checkedIn: !!r.checkedInAt,
    })),
    attendances: att.map((a: any) => ({ id: a.id, dancerId: a.dancerId, status: a.status, checkedIn: !!a.checkedInAt })),
    plans,
    passes,
    people,
  })
}

async function loadPasses(db: any, key: string | null): Promise<DoorPass[]> {
  if (!key) return []
  const [fest] = await db.select({ id: festivals.id }).from(festivals).where(eq(festivals.slug, key)).limit(1)
  if (!fest) return []
  const rows = await db.select({
    id: festivalSignups.id,
    dancerId: festivalSignups.dancerId,
    paid: festivalSignups.paidAmount,
    verified: festivalSignups.verifiedTicketHolder,
    email: festivalSignups.tickettailorBuyerEmail,
  }).from(festivalSignups).where(eq(festivalSignups.festivalId, fest.id))
  return rows.map((s: any) => {
    const ticket = !!s.verified || (s.paid ?? 0) > 0
    return {
      id: s.id,
      dancerId: s.dancerId,
      ticket,
      stub: !s.dancerId && ticket && !!s.email?.trim(),
    }
  })
}

/** Where a paid festival pass came from, for the attendance a check-in creates. */
export async function passSource(db: any, ev: DoorEvent, dancerId: string): Promise<'stripe' | 'tickettailor'> {
  const key = eventFestivalKey(ev)
  if (!key) return 'stripe'
  const [fest] = await db.select({ id: festivals.id }).from(festivals).where(eq(festivals.slug, key)).limit(1)
  if (!fest) return 'stripe'
  const [s] = await db.select({ orderId: festivalSignups.tickettailorOrderId })
    .from(festivalSignups)
    .where(and(eq(festivalSignups.festivalId, fest.id), eq(festivalSignups.dancerId, dancerId)))
    .limit(1)
  return s?.orderId ? 'tickettailor' : 'stripe'
}

/**
 * A festival pass that belongs to this event. A claimed one is the dancer;
 * an unclaimed paid one carries the buyer email the stub is stored under.
 * The email never goes to the client.
 */
export async function passHolder(db: any, ev: DoorEvent, signupId: string): Promise<{ dancerId: string } | { email: string; source: 'stripe' | 'tickettailor' } | null> {
  const key = eventFestivalKey(ev)
  if (!key) return null
  const [fest] = await db.select({ id: festivals.id }).from(festivals).where(eq(festivals.slug, key)).limit(1)
  if (!fest) return null
  const [s] = await db.select({
    dancerId: festivalSignups.dancerId,
    paid: festivalSignups.paidAmount,
    verified: festivalSignups.verifiedTicketHolder,
    email: festivalSignups.tickettailorBuyerEmail,
    orderId: festivalSignups.tickettailorOrderId,
  }).from(festivalSignups).where(and(eq(festivalSignups.id, signupId), eq(festivalSignups.festivalId, fest.id))).limit(1)
  if (!s) return null
  if (s.dancerId) return { dancerId: s.dancerId }
  const email = s.email?.trim().toLowerCase()
  if (!email || !(s.verified || (s.paid ?? 0) > 0)) return null
  return { email, source: s.orderId ? 'tickettailor' : 'stripe' }
}

/** Attendance stub for an unclaimed ticket, matched on the buyer email. */
export function stubWhere(eventId: string, email: string) {
  return and(eq(attendances.eventId, eventId), sql`${attendances.dancerId} is null`, sql`lower(${attendances.buyerEmail}) = ${email}`)
}
