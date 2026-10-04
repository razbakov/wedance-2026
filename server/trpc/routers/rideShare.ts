import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { festivalRideShares, festivals, dancers } from '../../database/schema'

export const rideShareRouter = router({
  list: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) return []

      const rows = await ctx.db
        .select({
          id: festivalRideShares.id,
          type: festivalRideShares.type,
          originCity: festivalRideShares.originCity,
          date: festivalRideShares.date,
          seatsAvailable: festivalRideShares.seatsAvailable,
          dancerId: festivalRideShares.dancerId,
          dancerName: dancers.name,
          dancerPhoto: dancers.photo,
        })
        .from(festivalRideShares)
        .innerJoin(dancers, eq(festivalRideShares.dancerId, dancers.id))
        .where(eq(festivalRideShares.festivalId, festival.id))

      return rows.map((r) => ({
        id: r.id,
        type: r.type,
        originCity: r.originCity,
        date: r.date,
        seatsAvailable: r.seatsAvailable,
        dancerName: r.dancerName,
        dancerPhoto: r.dancerPhoto,
        isOwn: ctx.dancerId === r.dancerId,
      }))
    }),

  create: protectedProcedure
    .input(z.object({
      festivalSlug: z.string(),
      type: z.enum(['offering', 'looking']),
      originCity: z.string(),
      date: z.string(),
      seatsAvailable: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })

      // Check for existing ride share by this dancer
      const [existing] = await ctx.db
        .select({ id: festivalRideShares.id })
        .from(festivalRideShares)
        .where(and(
          eq(festivalRideShares.festivalId, festival.id),
          eq(festivalRideShares.dancerId, ctx.dancerId),
        ))

      if (existing) {
        // Update existing
        await ctx.db
          .update(festivalRideShares)
          .set({
            type: input.type,
            originCity: input.originCity,
            date: input.date,
            seatsAvailable: input.seatsAvailable ?? null,
          })
          .where(eq(festivalRideShares.id, existing.id))
        return { updated: true }
      }

      await ctx.db.insert(festivalRideShares).values({
        festivalId: festival.id,
        dancerId: ctx.dancerId,
        type: input.type,
        originCity: input.originCity,
        date: input.date,
        seatsAvailable: input.seatsAvailable ?? null,
      })

      return { created: true }
    }),

  delete: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })

      await ctx.db
        .delete(festivalRideShares)
        .where(and(
          eq(festivalRideShares.festivalId, festival.id),
          eq(festivalRideShares.dancerId, ctx.dancerId),
        ))

      return { deleted: true }
    }),
})
