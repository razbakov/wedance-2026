import { z } from 'zod'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { planItems, dancers, festivals, festivalSignups } from '../../database/schema'
import { getReferralDiscountPercent } from '../../utils/ticket-prices'

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

  /**
   * Fetch the current dancer's planned festivals with ticket status and
   * referral data — the "own view" of the year plan page.
   */
  myPlan: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db
      .select({ itemId: planItems.itemId })
      .from(planItems)
      .where(
        and(
          eq(planItems.dancerId, ctx.dancerId),
          eq(planItems.itemType, 'festival'),
        ),
      )

    if (items.length === 0) return []

    const slugs = items.map((i) => i.itemId)

    const festivalRows = await ctx.db
      .select({
        id: festivals.id,
        slug: festivals.slug,
        name: festivals.name,
        startDate: festivals.startDate,
        endDate: festivals.endDate,
        city: festivals.city,
        logo: festivals.logo,
        accentColor: festivals.accentColor,
        styles: festivals.styles,
      })
      .from(festivals)
      .where(inArray(festivals.slug, slugs))

    if (festivalRows.length === 0) return []

    const signupRows = await ctx.db
      .select({
        festivalId: festivalSignups.festivalId,
        verifiedTicketHolder: festivalSignups.verifiedTicketHolder,
      })
      .from(festivalSignups)
      .where(
        and(
          eq(festivalSignups.dancerId, ctx.dancerId),
          inArray(
            festivalSignups.festivalId,
            festivalRows.map((f) => f.id),
          ),
        ),
      )

    const ticketByFestivalId = new Map(
      signupRows.map((s) => [s.festivalId, s.verifiedTicketHolder]),
    )

    return festivalRows
      .map((f) => ({
        slug: f.slug,
        name: f.name,
        startDate: f.startDate ?? '',
        endDate: f.endDate ?? '',
        location: f.city ?? '',
        logo: f.logo ?? '',
        accentColor: f.accentColor ?? '',
        styles: (f.styles as string[]) ?? [],
        ticketStatus: (ticketByFestivalId.get(f.id) ? 'purchased' : 'not-purchased') as 'purchased' | 'not-purchased',
        referralDiscountPercent: getReferralDiscountPercent(f.slug),
      }))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
  }),

  /**
   * Fetch another dancer's planned festivals for the shared year-plan view.
   * Public — the viewer may not be signed in.  Returns festival details,
   * ticket status (whether the sharer has a verified ticket), and the
   * referral discount percentage so the UI can show "you both get X% off".
   */
  sharedPlan: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      // 1. Look up the sharer by username.
      const [sharer] = await ctx.db
        .select({
          id: dancers.id,
          name: dancers.name,
          photo: dancers.photo,
          role: dancers.role,
          username: dancers.username,
          profilePublic: dancers.profilePublic,
        })
        .from(dancers)
        .where(eq(dancers.username, input.username))

      if (!sharer || sharer.profilePublic === false) {
        return null
      }

      // 2. Get all festival plan items for this dancer.
      const items = await ctx.db
        .select({ itemId: planItems.itemId })
        .from(planItems)
        .where(
          and(
            eq(planItems.dancerId, sharer.id),
            eq(planItems.itemType, 'festival'),
          ),
        )

      if (items.length === 0) {
        return {
          sharer: {
            name: sharer.name,
            photo: sharer.photo,
            role: sharer.role as 'lead' | 'follow' | null,
            username: sharer.username,
          },
          festivals: [],
        }
      }

      const slugs = items.map((i) => i.itemId)

      // 3. Fetch festival details for all planned slugs.
      const festivalRows = await ctx.db
        .select({
          id: festivals.id,
          slug: festivals.slug,
          name: festivals.name,
          startDate: festivals.startDate,
          endDate: festivals.endDate,
          city: festivals.city,
          logo: festivals.logo,
          accentColor: festivals.accentColor,
          styles: festivals.styles,
        })
        .from(festivals)
        .where(inArray(festivals.slug, slugs))

      // 4. Check which festivals the sharer has a verified ticket for.
      let ticketByFestivalId = new Map<string, boolean>()
      if (festivalRows.length > 0) {
        const signupRows = await ctx.db
          .select({
            festivalId: festivalSignups.festivalId,
            verifiedTicketHolder: festivalSignups.verifiedTicketHolder,
          })
          .from(festivalSignups)
          .where(
            and(
              eq(festivalSignups.dancerId, sharer.id),
              inArray(
                festivalSignups.festivalId,
                festivalRows.map((f) => f.id),
              ),
            ),
          )

        ticketByFestivalId = new Map(
          signupRows.map((s) => [s.festivalId, s.verifiedTicketHolder]),
        )
      }

      // 5. Build the response, sorted by start date.
      const result = festivalRows
        .map((f) => ({
          slug: f.slug,
          name: f.name,
          startDate: f.startDate ?? '',
          endDate: f.endDate ?? '',
          location: f.city ?? '',
          logo: f.logo ?? '',
          accentColor: f.accentColor ?? '',
          styles: (f.styles as string[]) ?? [],
          hasTicket: ticketByFestivalId.get(f.id) ?? false,
          referralDiscountPercent: getReferralDiscountPercent(f.slug),
        }))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))

      return {
        sharer: {
          name: sharer.name,
          photo: sharer.photo,
          role: sharer.role as 'lead' | 'follow' | null,
          username: sharer.username,
        },
        festivals: result,
      }
    }),
})
