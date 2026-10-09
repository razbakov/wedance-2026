import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { router, publicProcedure } from '../trpc'
import { dancers, festivals, referrals } from '../../database/schema'
import { getReferralDiscountPercent } from '../../utils/ticket-prices'

export const referralRouter = router({
  /**
   * Validate a referral code (username or dancer ID) for a given festival.
   * Returns the referrer's display name and the discount percentage, or null
   * if the code is invalid or the festival has no referral program.
   *
   * Public — the viewer may not be signed in yet when they land on a
   * referral link.
   */
  validate: publicProcedure
    .input(z.object({
      festivalSlug: z.string(),
      referralCode: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      const discountPercent = getReferralDiscountPercent(input.festivalSlug)
      if (discountPercent === 0) {
        return null
      }

      // Look up the referrer by username first, then by dancer ID.
      let referrer: { id: string; name: string; username: string | null } | undefined

      const [byUsername] = await ctx.db
        .select({ id: dancers.id, name: dancers.name, username: dancers.username })
        .from(dancers)
        .where(eq(dancers.username, input.referralCode))

      if (byUsername) {
        referrer = byUsername
      } else {
        // Try as UUID dancer ID (silently ignore malformed UUIDs).
        try {
          const [byId] = await ctx.db
            .select({ id: dancers.id, name: dancers.name, username: dancers.username })
            .from(dancers)
            .where(eq(dancers.id, input.referralCode))
          if (byId) referrer = byId
        } catch {
          // Not a valid UUID — no match.
        }
      }

      if (!referrer) return null

      return {
        referrerName: referrer.name,
        referrerUsername: referrer.username,
        discountPercent,
      }
    }),

  /**
   * List referrals the current dancer has made (as referrer).
   * Used on the profile / dashboard to show "your referral credits".
   */
  myReferrals: publicProcedure
    .input(z.object({ festivalSlug: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.dancerId) return []

      const conditions = [eq(referrals.referrerId, ctx.dancerId)]
      if (input?.festivalSlug) {
        const [festival] = await ctx.db
          .select({ id: festivals.id })
          .from(festivals)
          .where(eq(festivals.slug, input.festivalSlug))
        if (festival) {
          conditions.push(eq(referrals.festivalId, festival.id))
        }
      }

      const rows = await ctx.db
        .select({
          id: referrals.id,
          status: referrals.status,
          discountCents: referrals.discountCents,
          createdAt: referrals.createdAt,
          completedAt: referrals.completedAt,
        })
        .from(referrals)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))

      return rows
    }),
})
