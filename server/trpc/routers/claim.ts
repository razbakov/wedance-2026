/**
 * Magic-link claim flow for TicketTailor verified attendees.
 *
 * Background: PR 1's webhook (server/api/webhooks/tickettailor.lib.ts) inserts
 * `festival_signups` rows when a TicketTailor order arrives. If the buyer's
 * email doesn't match an existing dancer, the row is stubbed with
 * `dancer_id = NULL` and `tickettailor_buyer_email` populated.
 *
 * This router lets the buyer claim those stub rows once they sign in:
 *
 *   1. TicketTailor confirmation email contains a "Connect on WeDance" link to
 *      `/charanga/claim`.
 *   2. The page (app/pages/charanga/claim.vue) calls `getClaimStatus` (public)
 *      to render a "we found your ticket" hint pre-auth.
 *   3. After magic-link sign-in, the page calls `claimMyTicketHolderRows`
 *      (protected) which links every matching stub row to the now-authenticated
 *      dancer.
 *
 * The mutation is idempotent — calling it with no stubs returns
 * `{ claimed: 0, festivals: [] }`. Re-runs after a successful claim also return
 * 0 (the stubs no longer have `dancer_id IS NULL`).
 */
import { z } from 'zod'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { dancers, festivals, festivalSignups } from '../../database/schema'

export const claimRouter = router({
  /**
   * Find every stub row whose `tickettailor_buyer_email` matches the
   * authenticated user's email and link them to the dancer.
   *
   * Returns the list of festivals (slug + name) the user is now confirmed for.
   */
  claimMyTicketHolderRows: protectedProcedure.mutation(async ({ ctx }) => {
    const [me] = await ctx.db
      .select({ id: dancers.id, email: dancers.email })
      .from(dancers)
      .where(eq(dancers.id, ctx.dancerId))

    if (!me) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Dancer not found' })
    }

    const email = me.email.toLowerCase().trim()

    const stubs = await ctx.db
      .select({
        id: festivalSignups.id,
        festivalId: festivalSignups.festivalId,
      })
      .from(festivalSignups)
      .where(and(
        eq(festivalSignups.tickettailorBuyerEmail, email),
        isNull(festivalSignups.dancerId),
      ))

    if (stubs.length === 0) {
      return { claimed: 0, festivals: [] as { slug: string; name: string }[] }
    }

    // Defensive: if the dancer already has a (festival_id, dancer_id) row for
    // any of these festivals, the unique constraint would fire on the bulk
    // update. Drop those stubs and only claim what's safely linkable.
    const existingFestivalRows = await ctx.db
      .select({ festivalId: festivalSignups.festivalId })
      .from(festivalSignups)
      .where(eq(festivalSignups.dancerId, me.id))

    const alreadyLinkedFestivalIds = new Set(existingFestivalRows.map(r => r.festivalId))
    const claimable = stubs.filter(s => !alreadyLinkedFestivalIds.has(s.festivalId))

    if (claimable.length === 0) {
      return { claimed: 0, festivals: [] as { slug: string; name: string }[] }
    }

    const claimableIds = claimable.map(s => s.id)

    await ctx.db
      .update(festivalSignups)
      .set({ dancerId: me.id })
      .where(inArray(festivalSignups.id, claimableIds))

    const claimedFestivalIds = Array.from(new Set(claimable.map(s => s.festivalId)))

    const festivalRows = await ctx.db
      .select({ slug: festivals.slug, name: festivals.name })
      .from(festivals)
      .where(inArray(festivals.id, claimedFestivalIds))

    return {
      claimed: claimable.length,
      festivals: festivalRows.map(f => ({ slug: f.slug, name: f.name })),
    }
  }),

  /**
   * Public lookup used by the claim page when the user arrives via the
   * confirmation email but is not yet signed in. Tells us whether *any* stub
   * row exists for the supplied email so we can render the right copy.
   */
  getClaimStatus: publicProcedure
    .input(z.object({
      email: z.string().email().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!input.email) {
        return { pending: false as const }
      }

      const email = input.email.toLowerCase().trim()

      const [stub] = await ctx.db
        .select({ festivalId: festivalSignups.festivalId })
        .from(festivalSignups)
        .where(and(
          eq(festivalSignups.tickettailorBuyerEmail, email),
          isNull(festivalSignups.dancerId),
        ))
        .limit(1)

      if (!stub) {
        return { pending: false as const }
      }

      const [festival] = await ctx.db
        .select({ slug: festivals.slug, name: festivals.name })
        .from(festivals)
        .where(eq(festivals.id, stub.festivalId))

      if (!festival) {
        return { pending: false as const }
      }

      return {
        pending: true as const,
        festivalSlug: festival.slug,
        festivalName: festival.name,
      }
    }),
})
