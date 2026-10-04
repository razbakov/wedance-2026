import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { planItems } from '../../database/schema'

export const planRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        itemType: planItems.itemType,
        itemId: planItems.itemId,
      })
      .from(planItems)
      .where(eq(planItems.dancerId, ctx.dancerId))
  }),

  add: protectedProcedure
    .input(
      z.object({
        itemType: z.enum(['festival', 'event']),
        itemId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(planItems)
        .values({
          dancerId: ctx.dancerId,
          itemType: input.itemType,
          itemId: input.itemId,
        })
        .onConflictDoNothing()
    }),

  remove: protectedProcedure
    .input(
      z.object({
        itemType: z.enum(['festival', 'event']),
        itemId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(planItems)
        .where(
          and(
            eq(planItems.dancerId, ctx.dancerId),
            eq(planItems.itemType, input.itemType),
            eq(planItems.itemId, input.itemId),
          ),
        )
    }),
})
