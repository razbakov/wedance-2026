/**
 * Whether an event takes bookings on WeDance (RAZ-1007, RAZ-1016).
 *
 * Bookings go to the host page, else the organiser — the same page as
 * contactPageFor. That page has a team when someone on WeDance would see the
 * sign-up. Otherwise the dancer is sent to book where the event was copied from.
 */
import { eq, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { events } from '../database/schema'

/** SQL: the page bookings go to has a profile_members row. Shared with events.get. */
export function bookableSql(hostProfileId: unknown, organizerUsername: unknown) {
  return sql<boolean>`exists (select 1 from profile_members m where m.profile_id = coalesce(${hostProfileId}, (select p.id from profiles p where p.username = ${organizerUsername} limit 1)))`
}

/** Hostname of the event's own link, without a leading www. */
export function bookingHost(link: string | null | undefined): string | null {
  if (!link) return null
  try {
    return new URL(link).hostname.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

/** What a refused sign-up says: where to book, or to ask the organiser. */
export function bookElsewhereMessage(link: string | null | undefined): string {
  const host = bookingHost(link)
  if (host) return `Nobody on WeDance takes bookings for this event. Book on ${host}.`
  return `Nobody on WeDance takes bookings for this event. Ask the organiser directly.`
}

/** Cause of a refused sign-up. `link` is events.link (null when the event has none). */
export class BookElsewhere extends Error {
  readonly link: string | null
  constructor(link: string | null) {
    super('BookElsewhere')
    this.name = 'BookElsewhere'
    this.link = link
  }
}

export function unbookableError(link: string | null): TRPCError {
  return new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: bookElsewhereMessage(link),
    cause: new BookElsewhere(link),
  })
}

/** Whether this event takes a sign-up, and where to send the dancer if not. */
export async function eventBooking(db: any, eventId: string): Promise<{ bookable: boolean, link: string | null }> {
  const [row] = await db.select({
    bookable: bookableSql(events.hostProfileId, events.organizerUsername),
    link: events.link,
  }).from(events).where(eq(events.id, eventId)).limit(1)
  return { bookable: !!row?.bookable, link: row?.link ?? null }
}
