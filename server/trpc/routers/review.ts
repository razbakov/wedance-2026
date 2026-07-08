import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { reviews, dancers } from '../../database/schema'

export const TARGET_TYPES = ['festival', 'venue', 'artist', 'organizer', 'event'] as const
export type TargetType = (typeof TARGET_TYPES)[number]

/**
 * One review per dancer per target. Denormalizes the reviewer's name + handle
 * onto the row so the list needs no join. Shared by review.create (a normal
 * star review) and askLocals.recommend (an auto-5★ recommendation) — `source`
 * distinguishes them. Manual select-then-insert/update (not onConflictDoUpdate)
 * so it works against the hermetic FakeDb in tests too; the unique constraint
 * is the real backstop.
 */
export async function upsertReview(db: any, p: {
  dancerId: string
  targetType: TargetType
  targetSlug: string
  targetName?: string | null
  citySlug?: string | null
  rating: number
  text?: string | null
  source?: 'review' | 'recommendation'
}) {
  const [dancer] = await db
    .select({ name: dancers.name, username: dancers.username })
    .from(dancers)
    .where(eq(dancers.id, p.dancerId))

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(
      eq(reviews.targetType, p.targetType),
      eq(reviews.targetSlug, p.targetSlug),
      eq(reviews.dancerId, p.dancerId),
    ))

  if (existing) {
    await db.update(reviews)
      .set({ rating: p.rating, text: p.text ?? null, source: p.source ?? 'review' })
      .where(eq(reviews.id, existing.id))
    return { updated: true }
  }

  await db.insert(reviews).values({
    targetType: p.targetType,
    targetSlug: p.targetSlug,
    targetName: p.targetName ?? null,
    citySlug: p.citySlug ?? null,
    dancerId: p.dancerId,
    reviewerName: dancer?.name ?? null,
    reviewerUsername: dancer?.username ?? null,
    rating: p.rating,
    text: p.text ?? null,
    source: p.source ?? 'review',
  })
  return { updated: false }
}

export const reviewRouter = router({
  list: publicProcedure
    .input(z.object({
      targetType: z.enum(TARGET_TYPES),
      targetSlug: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: reviews.id,
          reviewerName: reviews.reviewerName,
          reviewerUsername: reviews.reviewerUsername,
          rating: reviews.rating,
          text: reviews.text,
          source: reviews.source,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(and(
          eq(reviews.targetType, input.targetType),
          eq(reviews.targetSlug, input.targetSlug),
          eq(reviews.status, 'visible'),
        ))

      const count = rows.length
      const average = count
        ? Math.round((rows.reduce((s: number, r: any) => s + r.rating, 0) / count) * 10) / 10
        : 0

      // Newest first (createdAt may be null in fakes → treat as now).
      const sorted = [...rows].sort((a: any, b: any) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())

      return { reviews: sorted, average, count }
    }),

  create: protectedProcedure
    .input(z.object({
      targetType: z.enum(TARGET_TYPES),
      targetSlug: z.string().min(1),
      targetName: z.string().max(160).optional(),
      citySlug: z.string().optional(),
      rating: z.number().int().min(1).max(5),
      text: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertReview(ctx.db, {
        dancerId: ctx.dancerId,
        targetType: input.targetType,
        targetSlug: input.targetSlug,
        targetName: input.targetName ?? null,
        citySlug: input.citySlug ?? null,
        rating: input.rating,
        text: input.text ?? null,
        source: 'review',
      })
      return { ok: true }
    }),
})
