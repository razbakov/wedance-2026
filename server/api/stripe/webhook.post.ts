import Stripe from 'stripe'
import { eq, and } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { festivals, festivalSignups } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey)

  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body or signature' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    throw createError({ statusCode: 400, statusMessage: 'Invalid signature' })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session

    const festivalSlug = session.metadata?.festivalSlug
    const dancerId = session.metadata?.dancerId

    if (!festivalSlug || !dancerId) {
      console.error('Stripe webhook missing metadata:', session.metadata)
      throw createError({ statusCode: 400, statusMessage: 'Missing metadata' })
    }

    const db = useDb()

    const [festival] = await db
      .select({ id: festivals.id })
      .from(festivals)
      .where(eq(festivals.slug, festivalSlug))

    if (!festival) {
      console.error('Stripe webhook: festival not found:', festivalSlug)
      throw createError({ statusCode: 400, statusMessage: 'Festival not found' })
    }

    // Real amount from Stripe (in cents), not hardcoded
    const paidAmount = session.amount_total ?? 0
    const isTicketPurchase = session.metadata?.type === 'ticket'

    // Check for existing signup — update if exists, insert if not
    const [existing] = await db
      .select({ id: festivalSignups.id })
      .from(festivalSignups)
      .where(and(
        eq(festivalSignups.festivalId, festival.id),
        eq(festivalSignups.dancerId, dancerId),
      ))

    if (existing) {
      // Upgrade the existing free signup to a paid one
      await db.update(festivalSignups)
        .set({
          paidAmount,
          stripeSessionId: session.id,
          ...(isTicketPurchase ? { verifiedTicketHolder: true, verifiedAt: new Date() } : {}),
        })
        .where(eq(festivalSignups.id, existing.id))
    } else {
      await db.insert(festivalSignups).values({
        festivalId: festival.id,
        dancerId,
        paidAmount,
        stripeSessionId: session.id,
        verifiedTicketHolder: isTicketPurchase,
        ...(isTicketPurchase ? { verifiedAt: new Date() } : {}),
      })
    }
  }

  return { received: true }
})
