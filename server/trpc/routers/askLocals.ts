import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { recommendationRequests } from '../../database/schema'
import { slugify } from '../../utils/slug'
import { upsertReview } from './review'

/**
 * "Ask locals" — a newcomer posts a question for a city; locals answer by
 * recommending an organizer or venue. A recommendation writes into the reviews
 * spine as an auto-5★ review (source='recommendation'), auto-stubbing the target
 * by slug so repeated recommendations of the same place aggregate.
 */
export const askLocalsRouter = router({
  listByCity: publicProcedure
    .input(z.object({ citySlug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: recommendationRequests.id,
          question: recommendationRequests.question,
          createdAt: recommendationRequests.createdAt,
        })
        .from(recommendationRequests)
        .where(and(
          eq(recommendationRequests.citySlug, input.citySlug),
          eq(recommendationRequests.status, 'open'),
        ))

      return [...rows].sort((a: any, b: any) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    }),

  ask: protectedProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      question: z.string().min(3).max(280),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(recommendationRequests)
        .values({
          citySlug: input.citySlug,
          askerId: ctx.dancerId,
          question: input.question,
        })
        .returning({ id: recommendationRequests.id })
      return { id: row!.id }
    }),

  // Recommend an organizer/venue → an auto-5★ review on that target.
  recommend: protectedProcedure
    .input(z.object({
      citySlug: z.string().min(1),
      targetType: z.enum(['organizer', 'venue']),
      targetName: z.string().min(2).max(160),
      text: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const targetSlug = slugify(input.targetName)
      await upsertReview(ctx.db, {
        dancerId: ctx.dancerId,
        targetType: input.targetType,
        targetSlug,
        targetName: input.targetName,
        citySlug: input.citySlug,
        rating: 5,
        text: input.text ?? null,
        source: 'recommendation',
      })
      return { ok: true, targetType: input.targetType, targetSlug }
    }),
})
