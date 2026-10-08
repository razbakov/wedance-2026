/**
 * Organizer insights for a festival (the "dashboard" promised on /organizers).
 *
 * Today: the style & level mix of the attendees (P726) — aggregates only, never
 * names or contacts, so a dancer's roster privacy setting doesn't apply here.
 *
 * Access: admins, or the organizer behind the festival. There is no festival
 * owner column yet; the organizer is the dancer who submitted the festival via
 * the /organizers/create wizard and whose submission the team marked
 * `onboarded` (same slug). That keeps ownership team-verified — submitting a
 * draft with someone else's slug grants nothing until it is onboarded.
 */
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'
import { festivals, festivalSignups, festivalSubmissions, dancers } from '../../database/schema'
import { computeStyleLevelMix } from '../../../shared/utils/styleLevelMix'

export const festivalInsightsRouter = router({
  /** Festivals the caller may open insights for (all of them for admins). */
  myFestivals: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.isAdmin) {
        return ctx.db
          .select({ slug: festivals.slug, name: festivals.name, startDate: festivals.startDate })
          .from(festivals)
          .orderBy(festivals.startDate)
      }
      const rows = await ctx.db
        .select({ slug: festivals.slug, name: festivals.name, startDate: festivals.startDate })
        .from(festivals)
        .innerJoin(festivalSubmissions, eq(festivalSubmissions.slug, festivals.slug))
        .where(and(
          eq(festivalSubmissions.submittedById, ctx.dancerId),
          eq(festivalSubmissions.status, 'onboarded'),
        ))
      // A re-submitted festival can have several onboarded drafts.
      return [...new Map(rows.map(r => [r.slug, r])).values()]
    }),

  styleLevelMix: protectedProcedure
    .input(z.object({ festivalSlug: z.string().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id, slug: festivals.slug, name: festivals.name, styles: festivals.styles })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })
      }

      if (!ctx.isAdmin) {
        const [submission] = await ctx.db
          .select({ id: festivalSubmissions.id })
          .from(festivalSubmissions)
          .where(and(
            eq(festivalSubmissions.slug, festival.slug),
            eq(festivalSubmissions.submittedById, ctx.dancerId),
            eq(festivalSubmissions.status, 'onboarded'),
          ))
        if (!submission) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Only this festival’s organizer can see its insights.' })
        }
      }

      // Every signup counts as an attendee: free joins, paid unlocks and
      // verified ticket holders. Unclaimed ticket stubs (no dancer yet) are
      // counted but have no profile to read styles from.
      const rows = await ctx.db
        .select({
          dancerId: festivalSignups.dancerId,
          danceStyles: dancers.danceStyles,
          danceLevels: dancers.danceLevels,
        })
        .from(festivalSignups)
        .leftJoin(dancers, eq(festivalSignups.dancerId, dancers.id))
        .where(eq(festivalSignups.festivalId, festival.id))

      const mix = computeStyleLevelMix(
        rows.map(r => (r.dancerId ? { danceStyles: r.danceStyles, danceLevels: r.danceLevels } : null)),
        festival.styles ?? [],
      )

      return { festival: { slug: festival.slug, name: festival.name }, ...mix }
    }),
})
