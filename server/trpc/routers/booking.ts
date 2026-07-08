import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { bookableSpaces, bookingRequests, profiles } from '../../database/schema'

/**
 * Booking requests — connector model (WeDance holds no money). An organizer
 * requests a date for a bookable space; the venue responds off-platform for now.
 * Public so organizers can request without an account (email required); the
 * caller's dancerId is captured when signed in. Terms must be accepted.
 */
export const bookingRouter = router({
  // Scheduled events for a space/profile — the community calendar shown first on
  // an OpenAir commons page. Returns non-declined bookings (spaceId maps to a
  // space name client-side from the profile's spaces list).
  scheduleForProfile: publicProcedure
    .input(z.object({ profileId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: bookingRequests.id,
          spaceId: bookingRequests.spaceId,
          title: bookingRequests.title,
          eventType: bookingRequests.eventType,
          styles: bookingRequests.styles,
          artists: bookingRequests.artists,
          eventDate: bookingRequests.eventDate,
          startTime: bookingRequests.startTime,
          endTime: bookingRequests.endTime,
          headcount: bookingRequests.headcount,
          message: bookingRequests.message,
          requesterName: bookingRequests.requesterName,
          status: bookingRequests.status,
        })
        .from(bookingRequests)
        .where(eq(bookingRequests.profileId, input.profileId))

      return rows
        .filter((r: any) => r.status !== 'declined')
        .sort((a: any, b: any) => String(a.eventDate ?? '9999').localeCompare(String(b.eventDate ?? '9999')))
    }),

  // Upcoming events across all venues in a city — the "what's on" feed shown on
  // the city page. Joins bookings to their venue profile by citySlug.
  upcomingByCity: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: bookingRequests.id,
          title: bookingRequests.title,
          eventType: bookingRequests.eventType,
          styles: bookingRequests.styles,
          eventDate: bookingRequests.eventDate,
          startTime: bookingRequests.startTime,
          status: bookingRequests.status,
          venueName: profiles.name,
          venueHandle: profiles.username,
        })
        .from(bookingRequests)
        .innerJoin(profiles, eq(bookingRequests.profileId, profiles.id))
        .where(and(eq(profiles.citySlug, input.citySlug), eq(profiles.status, 'visible')))

      const today = new Date().toISOString().slice(0, 10)
      return rows
        .filter((r: any) => r.status !== 'declined' && (!r.eventDate || String(r.eventDate).slice(0, 10) >= today))
        .sort((a: any, b: any) => String(a.eventDate ?? '9999').localeCompare(String(b.eventDate ?? '9999')))
    }),

  // A single event's detail (for the /events/<id> page) — with venue + space.
  getEvent: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [ev] = await ctx.db
        .select({
          id: bookingRequests.id,
          title: bookingRequests.title,
          eventType: bookingRequests.eventType,
          styles: bookingRequests.styles,
          artists: bookingRequests.artists,
          eventDate: bookingRequests.eventDate,
          startTime: bookingRequests.startTime,
          endTime: bookingRequests.endTime,
          headcount: bookingRequests.headcount,
          message: bookingRequests.message,
          requesterName: bookingRequests.requesterName,
          status: bookingRequests.status,
          ticketUrl: bookingRequests.ticketUrl,
          spaceName: bookableSpaces.name,
          venueName: profiles.name,
          venueHandle: profiles.username,
          venueAddress: profiles.address,
          venueCity: profiles.city,
        })
        .from(bookingRequests)
        .innerJoin(bookableSpaces, eq(bookingRequests.spaceId, bookableSpaces.id))
        .innerJoin(profiles, eq(bookingRequests.profileId, profiles.id))
        .where(eq(bookingRequests.id, input.id))

      if (!ev) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event not found.' })
      return ev
    }),

  request: publicProcedure
    .input(z.object({
      spaceId: z.string().uuid(),
      ticketUrl: z.union([z.string().url(), z.literal('')]).optional(),
      email: z.string().email(),
      name: z.string().max(160).optional(),
      title: z.string().max(160).optional(),
      eventType: z.string().max(40).optional(),
      styles: z.array(z.string()).optional(),
      artists: z.array(z.string()).optional(),
      eventDate: z.string().optional(), // YYYY-MM-DD
      startTime: z.string().max(5).optional(), // HH:MM
      endTime: z.string().max(5).optional(),
      headcount: z.number().int().positive().max(100000).optional(),
      message: z.string().max(2000).optional(),
      termsAccepted: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.termsAccepted) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please accept the booking terms to continue.' })
      }

      const [space] = await ctx.db
        .select({ id: bookableSpaces.id, profileId: bookableSpaces.profileId })
        .from(bookableSpaces)
        .where(eq(bookableSpaces.id, input.spaceId))

      if (!space) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'That space no longer exists.' })
      }

      const [row] = await ctx.db
        .insert(bookingRequests)
        .values({
          spaceId: space.id,
          profileId: space.profileId,
          requesterId: ctx.dancerId ?? null,
          requesterEmail: input.email,
          requesterName: input.name ?? null,
          title: input.title ?? null,
          eventType: input.eventType ?? null,
          styles: input.styles ?? [],
          artists: input.artists ?? [],
          eventDate: input.eventDate ?? null,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          headcount: input.headcount ?? null,
          message: input.message ?? null,
          ticketUrl: input.ticketUrl || null,
          termsAcceptedAt: new Date(),
        })
        .returning({ id: bookingRequests.id })

      return { ok: true, id: row!.id }
    }),
})
