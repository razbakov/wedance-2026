import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { bookableSpaces, bookingRequests } from '../../database/schema'

/**
 * Booking requests — connector model (WeDance holds no money). An organizer
 * requests a date for a bookable space; the venue responds off-platform for now.
 * Public so organizers can request without an account (email required); the
 * caller's dancerId is captured when signed in. Terms must be accepted.
 */
export const bookingRouter = router({
  request: publicProcedure
    .input(z.object({
      spaceId: z.string().uuid(),
      email: z.string().email(),
      name: z.string().max(160).optional(),
      eventDate: z.string().optional(), // YYYY-MM-DD
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
          eventDate: input.eventDate ?? null,
          headcount: input.headcount ?? null,
          message: input.message ?? null,
          termsAcceptedAt: new Date(),
        })
        .returning({ id: bookingRequests.id })

      return { ok: true, id: row!.id }
    }),
})
