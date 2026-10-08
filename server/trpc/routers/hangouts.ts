import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { hangouts, hangoutRsvps, dancers } from '../../database/schema'

/**
 * Hangouts — spontaneous activities where dancers can mark they're out.
 * Hangouts persist until the creator manually closes them.
 */
export const hangoutsRouter = router({
  // List active hangouts for a city (persist until manually closed)
  listTonight: publicProcedure
    .input(z.object({
      citySlug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: hangouts.id,
          kind: hangouts.kind,
          title: hangouts.title,
          time: hangouts.time,
          venue: hangouts.venue,
          host: hangouts.host,
          peopleCount: hangouts.peopleCount,
          status: hangouts.status,
          dancerId: hangouts.dancerId,
          createdAt: hangouts.createdAt,
        })
        .from(hangouts)
        .where(
          and(
            eq(hangouts.citySlug, input.citySlug),
            eq(hangouts.status, 'active'),
          ),
        )
        .orderBy(desc(hangouts.createdAt))

      // Fetch RSVPs in a second pass for proper aggregation
      const withRsvps = await Promise.all(
        rows.map(async (h) => {
          const rsvps = await ctx.db
            .select({
              dancerId: hangoutRsvps.dancerId,
              dancer: {
                name: dancers.name,
              },
            })
            .from(hangoutRsvps)
            .leftJoin(dancers, eq(hangoutRsvps.dancerId, dancers.id))
            .where(eq(hangoutRsvps.hangoutId, h.id))

          return {
            ...h,
            rsvpCount: rsvps.length,
            rsvps: rsvps.map(r => r.dancerId),
          }
        }),
      )

      return withRsvps
    }),

  // Create a new hangout (authenticated only)
  create: protectedProcedure
    .input(z.object({
      kind: z.enum(['dinner', 'bar', 'ride', 'floor']),
      title: z.string().min(1),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      venue: z.string().optional(),
      host: z.string().optional(),
      citySlug: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve host name from the creator's profile when not supplied
      let host = input.host
      if (!host) {
        const [dancer] = await ctx.db
          .select({ name: dancers.name })
          .from(dancers)
          .where(eq(dancers.id, ctx.dancerId))
        host = dancer?.name ?? undefined
      }

      const [result] = await ctx.db
        .insert(hangouts)
        .values({
          kind: input.kind,
          title: input.title,
          time: input.time,
          venue: input.venue,
          host,
          citySlug: input.citySlug,
          peopleCount: 1,
          dancerId: ctx.dancerId,
          status: 'active',
        })
        .returning()

      if (!result) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create hangout' })
      }

      // Auto-RSVP the creator so "1 in" shows immediately
      await ctx.db
        .insert(hangoutRsvps)
        .values({ hangoutId: result.id, dancerId: ctx.dancerId })

      return result
    }),

  // Toggle RSVP for current user
  toggleRsvp: protectedProcedure
    .input(z.object({ hangoutId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Check if hangout exists
      const [hangout] = await ctx.db
        .select()
        .from(hangouts)
        .where(eq(hangouts.id, input.hangoutId))

      if (!hangout) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hangout not found' })
      }

      // Check if RSVP already exists
      const [existing] = await ctx.db
        .select()
        .from(hangoutRsvps)
        .where(
          and(
            eq(hangoutRsvps.hangoutId, input.hangoutId),
            eq(hangoutRsvps.dancerId, ctx.dancerId),
          ),
        )

      if (existing) {
        // Remove RSVP
        await ctx.db
          .delete(hangoutRsvps)
          .where(
            and(
              eq(hangoutRsvps.hangoutId, input.hangoutId),
              eq(hangoutRsvps.dancerId, ctx.dancerId),
            ),
          )

        return { rsvpd: false }
      } else {
        // Add RSVP
        await ctx.db
          .insert(hangoutRsvps)
          .values({
            hangoutId: input.hangoutId,
            dancerId: ctx.dancerId,
          })

        return { rsvpd: true }
      }
    }),

  // Close a hangout (authenticated owner only)
  close: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [hangout] = await ctx.db
        .select()
        .from(hangouts)
        .where(eq(hangouts.id, input.id))

      if (!hangout) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Hangout not found' })
      }

      if (hangout.dancerId !== ctx.dancerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only close your own hangouts' })
      }

      await ctx.db
        .update(hangouts)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(hangouts.id, input.id))

      return { success: true }
    }),
})
