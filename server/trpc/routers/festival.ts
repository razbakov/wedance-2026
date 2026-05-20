/**
 * Public festival read APIs.
 *
 * Today only `bySlug` exists — the DB-backed event page (PR 3 of O-008) needs
 * a way to fetch a single festival by its URL slug. This deliberately returns
 * the minimum set of fields the event page renders; we keep the public shape
 * narrow so future schema additions don't accidentally leak.
 *
 * Other festival data (workshops, teachers, roster) lives in its own router
 * (or, for v0 of the workshop/cart UI, in `~/app/data/mock-*.ts`).
 */
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { festivals } from '../../database/schema'

export const festivalRouter = router({
  /**
   * Fetch a single festival by slug.
   *
   * Returns `null` when the slug doesn't match — callers render a 404 on null.
   * Slugs are URL-safe lowercase strings; empty input fails Zod validation.
   */
  bySlug: publicProcedure
    .input(z.object({
      slug: z.string().min(1).max(120),
    }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({
          id: festivals.id,
          slug: festivals.slug,
          name: festivals.name,
          startDate: festivals.startDate,
          endDate: festivals.endDate,
          ticketUrl: festivals.ticketUrl,
          maxFreeSpots: festivals.maxFreeSpots,
        })
        .from(festivals)
        .where(eq(festivals.slug, input.slug))

      if (!festival) {
        return null
      }

      return festival
    }),
})
