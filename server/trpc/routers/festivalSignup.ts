import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import Stripe from 'stripe'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { festivals, festivalSignups, dancers } from '../../database/schema'

function getStripe() {
  const config = useRuntimeConfig()
  return new Stripe(config.stripeSecretKey)
}


export const festivalSignupRouter = router({
  status: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({
          id: festivals.id,
          maxFreeSpots: festivals.maxFreeSpots,
          stripePaymentLink: festivals.stripePaymentLink,
        })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) {
        return { totalSignups: 0, maxFreeSpots: 10, userSignedUp: false, stripePaymentLink: null }
      }

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(festivalSignups)
        .where(eq(festivalSignups.festivalId, festival.id))

      let userSignedUp = false
      if (ctx.dancerId) {
        const [signup] = await ctx.db
          .select()
          .from(festivalSignups)
          .where(and(
            eq(festivalSignups.festivalId, festival.id),
            eq(festivalSignups.dancerId, ctx.dancerId),
          ))
        userSignedUp = !!signup
      }

      return {
        totalSignups: Number(count),
        maxFreeSpots: festival.maxFreeSpots,
        userSignedUp,
        stripePaymentLink: festival.stripePaymentLink,
      }
    }),

  join: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id, maxFreeSpots: festivals.maxFreeSpots })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) throw new Error('Festival not found')

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(festivalSignups)
        .where(eq(festivalSignups.festivalId, festival.id))

      const totalSignups = Number(count)
      const isFree = totalSignups < festival.maxFreeSpots

      if (!isFree) {
        throw new Error('Free spots are full. Pay EUR 1 to join.')
      }

      try {
        await ctx.db.insert(festivalSignups).values({
          festivalId: festival.id,
          dancerId: ctx.dancerId,
          paidAmount: 0,
        })
      } catch (e: any) {
        const msg = e.message || ''
        const causeMsg = e.cause?.message || ''
        const code = e.cause?.code || ''
        if (msg.includes('unique') || msg.includes('duplicate') ||
            causeMsg.includes('unique') || causeMsg.includes('duplicate') ||
            code === '23505') {
          return { alreadyJoined: true }
        }
        throw e
      }

      return { joined: true }
    }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id, name: festivals.name, maxFreeSpots: festivals.maxFreeSpots })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) throw new Error('Festival not found')

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(festivalSignups)
        .where(eq(festivalSignups.festivalId, festival.id))

      if (Number(count) < festival.maxFreeSpots) {
        throw new Error('Free spots still available. Use the free join instead.')
      }

      // Check if already signed up
      const [existing] = await ctx.db
        .select()
        .from(festivalSignups)
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.dancerId, ctx.dancerId),
        ))

      if (existing) {
        throw new Error('Already signed up for this festival.')
      }

      const config = useRuntimeConfig()
      const stripe = getStripe()

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `WeDance – ${festival.name}`,
                description: 'Unlock social activities: dinners, rides & more',
              },
              unit_amount: 100,
            },
            quantity: 1,
          },
        ],
        metadata: {
          festivalSlug: input.festivalSlug,
          dancerId: ctx.dancerId,
        },
        success_url: `${config.siteUrl}/festivals/${input.festivalSlug}?payment=success`,
        cancel_url: `${config.siteUrl}/festivals/${input.festivalSlug}?payment=cancel`,
      })

      return { checkoutUrl: session.url }
    }),
})
