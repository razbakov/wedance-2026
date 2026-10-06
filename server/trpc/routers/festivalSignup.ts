import { z } from 'zod'
import { eq, and, sql } from 'drizzle-orm'
import Stripe from 'stripe'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { festivals, festivalSignups, dancers } from '../../database/schema'
import { getTicketPriceCents } from '../../utils/ticket-prices'

function getStripe() {
  const config = useRuntimeConfig()
  if (!config.stripeSecretKey) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Stripe is not configured',
    })
  }
  return new Stripe(config.stripeSecretKey)
}

// Roster visibility levels for the public attendee roster.
// See migration 0002_o008_roster_visibility.sql for the full doc.
const visibilityLevel = z.enum(['public_full', 'public_minimal', 'hidden'])
export type RosterVisibility = z.infer<typeof visibilityLevel>


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
        return { totalSignups: 0, maxFreeSpots: 10, userSignedUp: false, verifiedTicketHolder: false, stripePaymentLink: null }
      }

      const [{ count }] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(festivalSignups)
        .where(eq(festivalSignups.festivalId, festival.id))

      let userSignedUp = false
      let verifiedTicketHolder = false
      if (ctx.dancerId) {
        const [signup] = await ctx.db
          .select({
            id: festivalSignups.id,
            verifiedTicketHolder: festivalSignups.verifiedTicketHolder,
          })
          .from(festivalSignups)
          .where(and(
            eq(festivalSignups.festivalId, festival.id),
            eq(festivalSignups.dancerId, ctx.dancerId),
          ))
        userSignedUp = !!signup
        verifiedTicketHolder = signup?.verifiedTicketHolder ?? false
      }

      return {
        totalSignups: Number(count),
        maxFreeSpots: festival.maxFreeSpots,
        userSignedUp,
        verifiedTicketHolder,
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

  // One-tap ticket checkout — creates a Stripe Checkout session for one
  // or more ticket passes (combo support). Pre-fills the buyer's email
  // from their account so signed-in dancers don't re-enter details.
  //
  // Prices are resolved SERVER-SIDE from the ticket-prices registry —
  // the client sends only ticket names, never amounts.  This prevents
  // price-tampering.
  ticketCheckout: protectedProcedure
    .input(z.object({
      festivalSlug: z.string(),
      ticketNames: z.array(z.string().min(1).max(200)).min(1).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve each ticket price server-side.
      const resolved = input.ticketNames.map((name) => {
        const ticket = getTicketPriceCents(input.festivalSlug, name)
        if (!ticket) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `Ticket not found: ${name}` })
        }
        if (ticket.soldOut) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `This ticket is sold out: ${name}` })
        }
        return { name, priceCents: ticket.priceCents }
      })

      const totalCents = resolved.reduce((sum, t) => sum + t.priceCents, 0)

      const [festival] = await ctx.db
        .select({ id: festivals.id, name: festivals.name })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })
      }

      // Prevent duplicate ticket purchase.
      const [existingSignup] = await ctx.db
        .select({
          id: festivalSignups.id,
          verifiedTicketHolder: festivalSignups.verifiedTicketHolder,
        })
        .from(festivalSignups)
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.dancerId, ctx.dancerId),
        ))

      if (existingSignup?.verifiedTicketHolder) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You already have a ticket for this festival.',
        })
      }

      // Look up the dancer's email so Stripe can pre-fill the checkout form.
      const [dancer] = await ctx.db
        .select({ email: dancers.email, name: dancers.name })
        .from(dancers)
        .where(eq(dancers.id, ctx.dancerId))

      if (!dancer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Dancer not found' })
      }

      const config = useRuntimeConfig()
      const stripe = getStripe()

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: dancer.email,
        line_items: resolved.map((t) => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${festival.name} — ${t.name}`,
            },
            unit_amount: t.priceCents,
          },
          quantity: 1,
        })),
        metadata: {
          festivalSlug: input.festivalSlug,
          ticketName: input.ticketNames.join(', '),
          dancerId: ctx.dancerId,
          amountCents: String(totalCents),
        },
        success_url: `${config.siteUrl}/festivals/${input.festivalSlug}?payment=success`,
        cancel_url: `${config.siteUrl}/festivals/${input.festivalSlug}?payment=cancel`,
      })

      return { checkoutUrl: session.url }
    }),

  // Public verified-attendee roster for a festival.
  //
  // Filters to verified ticket holders only and respects each row's
  // `roster_visibility` setting. Stub rows (`dancer_id IS NULL`, created by
  // the TicketTailor webhook before the buyer signs in) have no display
  // identity yet, so they are NOT listed individually — they are surfaced
  // as a single `unclaimed` count alongside the array of attendees.
  publicRoster: publicProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) {
        return { attendees: [], unclaimed: 0 }
      }

      // Pull every verified row for the festival (claimed + stubs). We
      // post-process in JS — the row count for a single festival is small
      // (hundreds at most) and this keeps the SQL simple while letting us
      // shape the response per visibility level.
      const rows = await ctx.db
        .select({
          id: festivalSignups.id,
          dancerId: festivalSignups.dancerId,
          rosterVisibility: festivalSignups.rosterVisibility,
          dancerName: dancers.name,
          dancerCity: dancers.city,
          dancerPhoto: dancers.photo,
        })
        .from(festivalSignups)
        .leftJoin(dancers, eq(festivalSignups.dancerId, dancers.id))
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.verifiedTicketHolder, true),
        ))

      let unclaimed = 0
      const attendees: Array<{
        id: string
        dancerId: string | null
        displayName: string | null
        city: string | null
        photoUrl: string | null
        verifiedTicketHolder: true
      }> = []

      for (const row of rows) {
        // Stub rows: webhook-created, buyer hasn't signed in yet. They have
        // no display name, so we only count them.
        if (!row.dancerId) {
          unclaimed += 1
          continue
        }

        // Hidden rows: buyer opted out of the public roster.
        if (row.rosterVisibility === 'hidden') {
          continue
        }

        const isFull = row.rosterVisibility === 'public_full'
        attendees.push({
          id: row.id,
          dancerId: row.dancerId,
          displayName: row.dancerName ?? null,
          city: row.dancerCity ?? null,
          photoUrl: isFull ? (row.dancerPhoto ?? null) : null,
          verifiedTicketHolder: true,
        })
      }

      return { attendees, unclaimed }
    }),

  // Update the caller's own roster visibility for one festival.
  // Errors if the caller does not have a signup row for `festivalSlug`
  // (you can't set visibility for a festival you haven't joined).
  setMyVisibility: protectedProcedure
    .input(z.object({
      festivalSlug: z.string(),
      level: visibilityLevel,
    }))
    .mutation(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Festival not found' })
      }

      const [existing] = await ctx.db
        .select({ id: festivalSignups.id })
        .from(festivalSignups)
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.dancerId, ctx.dancerId),
        ))

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'You have no signup for this festival yet.',
        })
      }

      await ctx.db
        .update(festivalSignups)
        .set({ rosterVisibility: input.level })
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.dancerId, ctx.dancerId),
        ))

      return { level: input.level }
    }),

  // Read the caller's current visibility for a festival. Returns the
  // configured level, or `null` if the caller has no signup row yet
  // (so the UI can fall back to a sensible default before the user joins).
  getMyVisibility: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [festival] = await ctx.db
        .select({ id: festivals.id })
        .from(festivals)
        .where(eq(festivals.slug, input.festivalSlug))

      if (!festival) return { level: null as RosterVisibility | null }

      const [row] = await ctx.db
        .select({ level: festivalSignups.rosterVisibility })
        .from(festivalSignups)
        .where(and(
          eq(festivalSignups.festivalId, festival.id),
          eq(festivalSignups.dancerId, ctx.dancerId),
        ))

      return { level: (row?.level ?? null) as RosterVisibility | null }
    }),

  // Return all festival slugs where the current user has a paid ticket.
  // Used by /my-plan to sync ticket-bought state from the backend.
  myTickets: protectedProcedure
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({ festivalSlug: festivals.slug })
        .from(festivalSignups)
        .innerJoin(festivals, eq(festivalSignups.festivalId, festivals.id))
        .where(and(
          eq(festivalSignups.dancerId, ctx.dancerId),
          sql`${festivalSignups.paidAmount} > 0`,
        ))

      return rows.map(r => r.festivalSlug)
    }),
})
