import { z } from 'zod'
import { eq, and, ne } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { festivalRoommateLookups, festivals, dancers } from '../../database/schema'
import { ensureFestival } from '../../utils/ensureFestival'

export const roommateRouter = router({
  list: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const festivalId = await ensureFestival(ctx.db, input.festivalSlug)

      if (!festivalId) return { looking: false, others: [] }
      const festival = { id: festivalId }

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

      const selectFields = {
        name: dancers.name,
        photo: dancers.photo,
        city: dancers.city,
        username: dancers.username,
      }

      const othersQuery = ctx.dancerId
        ? ctx.db
            .select(selectFields)
            .from(festivalRoommateLookups)
            .innerJoin(dancers, eq(festivalRoommateLookups.dancerId, dancers.id))
            .where(and(
              eq(festivalRoommateLookups.festivalId, festival.id),
              ne(festivalRoommateLookups.dancerId, ctx.dancerId),
            ))
        : ctx.db
            .select(selectFields)
            .from(festivalRoommateLookups)
            .innerJoin(dancers, eq(festivalRoommateLookups.dancerId, dancers.id))
            .where(eq(festivalRoommateLookups.festivalId, festival.id))

      const others = await othersQuery

      return { looking, others }
    }),

  toggle: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const festivalId = await ensureFestival(ctx.db, input.festivalSlug)

      if (!festivalId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })
      const festival = { id: festivalId }

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
