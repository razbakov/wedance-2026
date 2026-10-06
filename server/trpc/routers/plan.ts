import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { planItems } from '../../database/schema'

export const planRouter = router({
  count: publicProcedure
    .input(z.object({ itemType: z.enum(['festival', 'event', 'goal']), itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(planItems)
        .where(and(eq(planItems.itemType, input.itemType), eq(planItems.itemId, input.itemId)))
      return row?.count ?? 0
    }),

  // Basic list — only itemType + itemId. Used by the hydration plugin and
  // composables (useWeekPlan, useYearPlan) that don't need metadata.
  // Deliberately avoids selecting the metadata column so the query works
  // even if migration 0023 hasn't been applied yet.
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        itemType: planItems.itemType,
        itemId: planItems.itemId,
      })
      .from(planItems)
      .where(eq(planItems.dancerId, ctx.dancerId))
  }),

  // Detailed list — includes metadata. Used by my-plan for course
  // enrollment details and goal persistence.
  listDetailed: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        itemType: planItems.itemType,
        itemId: planItems.itemId,
        metadata: planItems.metadata,
      })
      .from(planItems)
      .where(eq(planItems.dancerId, ctx.dancerId))
  }),

  add: protectedProcedure
    .input(
      z.object({
        itemType: z.enum(['festival', 'event', 'goal']),
        itemId: z.string(),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const values: typeof planItems.$inferInsert = {
        dancerId: ctx.dancerId,
        itemType: input.itemType,
        itemId: input.itemId,
      }
      if (input.metadata) {
        values.metadata = input.metadata
      }
      await ctx.db
        .insert(planItems)
        .values(values)
        .onConflictDoNothing()
    }),

  remove: protectedProcedure
    .input(
      z.object({
        itemType: z.enum(['festival', 'event', 'goal']),
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
