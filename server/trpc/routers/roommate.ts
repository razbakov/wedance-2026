import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { festivalRoommateLookups, festivals, dancers } from '../../database/schema'

export const roommateRouter = router({
  list: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) return { looking: false, others: [] }

      let looking = false

      if (ctx.dancerId) {
        const [own] = await ctx.db
          .select({ id: festivalRoommateLookups.id })
          .from(festivalRoommateLookups)
          .where(and(
            eq(festivalRoommateLookups.festivalId, festival.id),
            eq(festivalRoommateLookups.dancerId, ctx.dancerId),
          ))
        looking = !!own
      }

      const othersQuery = ctx.dancerId
        ? ctx.db
            .select({
              name: dancers.name,
              photo: dancers.photo,
            })
            .from(festivalRoommateLookups)
            .innerJoin(dancers, eq(festivalRoommateLookups.dancerId, dancers.id))
            .where(and(
              eq(festivalRoommateLookups.festivalId, festival.id),
              ne(festivalRoommateLookups.dancerId, ctx.dancerId),
            ))
        : ctx.db
            .select({
              name: dancers.name,
              photo: dancers.photo,
            })
            .from(festivalRoommateLookups)
            .innerJoin(dancers, eq(festivalRoommateLookups.dancerId, dancers.id))
            .where(eq(festivalRoommateLookups.festivalId, festival.id))

      const others = await othersQuery

      return { looking, others }
    }),

  toggle: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) throw new Error('Festival not found')

      const [existing] = await ctx.db
        .select({ id: festivalRoommateLookups.id })
        .from(festivalRoommateLookups)
        .where(and(
          eq(festivalRoommateLookups.festivalId, festival.id),
          eq(festivalRoommateLookups.dancerId, ctx.dancerId),
        ))

      if (existing) {
        await ctx.db
          .delete(festivalRoommateLookups)
          .where(eq(festivalRoommateLookups.id, existing.id))
        return { looking: false }
      }

      await ctx.db.insert(festivalRoommateLookups).values({
        festivalId: festival.id,
        dancerId: ctx.dancerId,
      })

      return { looking: true }
    }),
})
