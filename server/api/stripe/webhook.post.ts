import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
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

    // Idempotent insert — ignore conflict on unique(festivalId, dancerId)
    try {
      await db.insert(festivalSignups).values({
        festivalId: festival.id,
        dancerId,
        paidAmount: 100,
        stripeSessionId: session.id,
      })
    } catch (e: any) {
      const msg = e.message || ''
      const causeMsg = e.cause?.message || ''
      const code = e.cause?.code || ''
      if (msg.includes('unique') || msg.includes('duplicate') ||
          causeMsg.includes('unique') || causeMsg.includes('duplicate') ||
          code === '23505') {
        // Already signed up — idempotent, just return OK
        console.log('Stripe webhook: duplicate signup ignored for', dancerId, festivalSlug)
      } else {
        throw e
      }
    }
  }

  return { received: true }
})
