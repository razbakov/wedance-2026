/**
 * Saying yes to a booking request (RAZ-1089). Marks it booked, and when the
 * asker has a page, drafts an event on that page with this artist confirmed
 * in the line-up and the budget as the offer. Emails the asker either way.
 * Calling it again returns the same event.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { bookingInquiries, events, profileInvites, profileMembers, profiles } from '../database/schema'
import { cityInfo } from '../trpc/routers/businessEvents'
import { randomSuffix, slugify } from './slug'
import { sendBookingYesEmail } from './email'
import { bookingInstants, canBook, draftEventName, eventTypeForBooking, hostForBooking } from '../../shared/utils/bookingAccept'

const token = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)

export async function bookInquiry(db: any, args: {
  artist: { id: string; username: string; name: string; type: string; styles: string[] | null }
  inquiryId: string
  dancerId: string
  dancerEmail: string | null
  siteUrl: string
}): Promise<{ eventId: string | null; created: boolean; bookedNow: boolean; emailed: boolean }> {
  const [before] = await db.select().from(bookingInquiries)
    .where(and(eq(bookingInquiries.id, args.inquiryId), eq(bookingInquiries.profileId, args.artist.id)))
  if (!before) throw new TRPCError({ code: 'NOT_FOUND', message: 'That request isn’t on this page.' })
  if (before.status === 'declined') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request was declined. Move it back before booking it.' })
  }
  if (before.status === 'booked' && before.eventId) {
    return { eventId: before.eventId, created: false, bookedNow: false, emailed: false }
  }
  if (before.status !== 'booked' && !canBook(before.status)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'This request can’t be booked.' })
  }

  // Draft first, then mark it booked, so a failed save leaves the request waiting.
  let eventId: string | null = before.eventId ?? null
  let created = false
  if (!eventId) {
    const placed = await placeOnDraft(db, before, args)
    if (placed) {
      const [attached] = await db.update(bookingInquiries)
        .set({ eventId: placed })
        .where(and(eq(bookingInquiries.id, before.id), isNull(bookingInquiries.eventId)))
        .returning({ id: bookingInquiries.id })
      if (attached) {
        eventId = placed
        created = true
      } else {
        await db.delete(events).where(eq(events.id, placed))
        const [row] = await db.select({ eventId: bookingInquiries.eventId }).from(bookingInquiries).where(eq(bookingInquiries.id, before.id))
        eventId = row?.eventId ?? null
      }
    }
  }

  let bookedNow = false
  if (before.status !== 'booked') {
    const [claimed] = await db.update(bookingInquiries)
      .set({ status: 'booked', answeredAt: new Date() })
      .where(and(eq(bookingInquiries.id, before.id), inArray(bookingInquiries.status, ['new', 'answered'])))
      .returning({ id: bookingInquiries.id })
    if (claimed) bookedNow = true
    else {
      const [again] = await db.select({ status: bookingInquiries.status }).from(bookingInquiries).where(eq(bookingInquiries.id, before.id))
      if (again?.status !== 'booked') throw new TRPCError({ code: 'CONFLICT', message: 'That request changed. Reload and try again.' })
    }
  }

  let emailed = false
  if (bookedNow) {
    const day = before.eventDate
      ? new Date(`${before.eventDate}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      : ''
    const lines = [day, before.city, before.guests ? `About ${before.guests} people` : '', before.budget ? `Budget: ${before.budget}` : ''].filter(Boolean)
    try {
      await sendBookingYesEmail({
        to: before.email,
        name: before.name,
        artistName: args.artist.name,
        what: before.what,
        lines,
        hasEvent: !!eventId,
        link: eventId ? `${args.siteUrl}/business/events/${eventId}` : `${args.siteUrl}/business`,
      })
      emailed = true
    } catch (e) { console.error('[inquiries] yes email failed', e) }
  }
  return { eventId, created, bookedNow, emailed }
}

async function placeOnDraft(db: any, inquiry: any, args: { artist: { id: string; username: string; name: string; styles: string[] | null }; dancerId: string; dancerEmail: string | null }): Promise<string | null> {
  const pages = inquiry.requesterId
    ? await db.select({ id: profiles.id, name: profiles.name }).from(profileMembers)
      .innerJoin(profiles, eq(profiles.id, profileMembers.profileId))
      .where(eq(profileMembers.dancerId, inquiry.requesterId))
    : []
  const hostId = hostForBooking(
    { askerProfileId: inquiry.askerProfileId ?? null, organization: inquiry.organization ?? null },
    pages,
    args.artist.id,
  )
  if (!hostId) return null
  const [host] = await db.select({ id: profiles.id, username: profiles.username, name: profiles.name, type: profiles.type, city: profiles.city })
    .from(profiles).where(eq(profiles.id, hostId))
  if (!host) return null

  const loc = await cityInfo(db, inquiry.city || host.city)
  const when = bookingInstants(inquiry.eventDate, loc.timezone)
  const name = draftEventName(args.artist.name, inquiry.what)
  const type = eventTypeForBooking(inquiry.what)
  const [ev] = await db.insert(events).values({
    name,
    slug: `${slugify(name)}-${randomSuffix(5)}`,
    type,
    isFestival: ['Festival', 'Weekender', 'Congress'].includes(type),
    description: inquiry.message,
    startDate: when?.start ?? null,
    endDate: when?.end ?? null,
    timezone: loc.timezone,
    city: loc.city,
    citySlug: loc.citySlug,
    country: loc.country,
    price: inquiry.budget || '',
    artists: [args.artist.username],
    styles: args.artist.styles ?? [],
    hostProfileId: host.id,
    organizerUsername: host.type === 'organizer' ? host.username : null,
    organizerName: host.name,
    published: false,
    archived: false,
    source: 'booking-inquiry',
    sourceRef: { inquiryId: inquiry.id },
  }).returning({ id: events.id })

  const offer = (inquiry.budget ?? '').trim()
  const deal = { ...(offer ? { offer } : {}), guests: inquiry.guests, note: inquiry.message }
  try {
    await db.insert(profileInvites).values({
      token: token(),
      profileId: args.artist.id,
      eventId: ev!.id,
      createdBy: args.dancerId,
      status: 'confirmed',
      respondedAt: new Date(),
      request: deal,
      answeredBy: args.dancerId,
      answerEmail: args.dancerEmail,
      emailConfirmedAt: args.dancerEmail ? new Date() : null,
      kind: 'artist',
    }).onConflictDoUpdate({
      target: [profileInvites.eventId, profileInvites.profileId],
      set: {
        status: 'confirmed',
        respondedAt: new Date(),
        request: deal,
        answeredBy: args.dancerId,
        answerEmail: args.dancerEmail,
        emailConfirmedAt: args.dancerEmail ? new Date() : null,
      },
    })
  } catch (e) {
    await db.delete(events).where(eq(events.id, ev!.id))
    throw e
  }
  return ev!.id
}
