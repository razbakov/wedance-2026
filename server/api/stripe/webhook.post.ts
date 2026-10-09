import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { festivals, festivalSignups, dancers } from '../../database/schema'
import { sendTicketConfirmationEmail } from '../../utils/email'
import { completeReferral, expireReferral } from './webhook.lib'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.stripeSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Stripe is not configured' })
  }
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

    // Ticket checkouts carry an amountCents metadata field with the
    // server-validated price. Fall back to the Stripe session total
    // (which equals the line-item sum), then to 100 (the €1 social
    // unlock amount) for backwards-compat with old sessions.
    const paidAmount = session.metadata?.amountCents
      ? Number(session.metadata.amountCents)
      : session.amount_total ?? 100

    // Ticket checkouts should mark the buyer as a verified ticket holder
    // so they appear on the attendee roster.
    const isTicketCheckout = !!session.metadata?.ticketName

    const db = useDb()

    const [festival] = await db
      .select({ id: festivals.id, name: festivals.name, startDate: festivals.startDate, endDate: festivals.endDate })
      .from(festivals)
      .where(eq(festivals.slug, festivalSlug))

    if (!festival) {
      console.error('Stripe webhook: festival not found:', festivalSlug)
      throw createError({ statusCode: 400, statusMessage: 'Festival not found' })
    }

    // Idempotent insert — ignore conflict on unique(festivalId, dancerId)
    let isDuplicate = false
    try {
      await db.insert(festivalSignups).values({
        festivalId: festival.id,
        dancerId,
        paidAmount,
        stripeSessionId: session.id,
        ...(isTicketCheckout ? { verifiedTicketHolder: true } : {}),
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
        isDuplicate = true
      } else {
        throw e
      }
    }

    // Mark referral as completed if this checkout carried a referral.
    // Runs on every delivery (including retries where the signup is a duplicate)
    // because the referral row may still be 'pending' even if the signup already
    // exists. The UPDATE is inherently idempotent.
    if (session.metadata?.referrerId) {
      try {
        await completeReferral(db, session.id)
      } catch (refErr) {
        console.error('Stripe webhook: referral completion failed:', refErr)
      }
    }

    // Send confirmation email after a NEW signup is persisted.
    // Fire-and-forget: a Resend failure must not break the webhook.
    if (!isDuplicate) {
      try {
        const [dancer] = await db
          .select({ email: dancers.email, name: dancers.name })
          .from(dancers)
          .where(eq(dancers.id, dancerId))

        if (dancer?.email) {
          await sendTicketConfirmationEmail({
            to: dancer.email,
            buyerName: dancer.name || 'Dancer',
            festivalName: festival.name,
            festivalSlug,
            startDate: festival.startDate,
            endDate: festival.endDate,
            ticketName: session.metadata?.ticketName ?? null,
            amountCents: paidAmount,
          })
        }
      } catch (emailErr) {
        console.error('Stripe webhook: confirmation email failed:', emailErr)
      }
    }
  }

  // When a checkout session expires without payment, mark any associated
  // referral as 'expired' so the referee can use a new referral link later.
  if (stripeEvent.type === 'checkout.session.expired') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    if (session.metadata?.referrerId) {
      try {
        await expireReferral(useDb(), session.id)
      } catch (refErr) {
        console.error('Stripe webhook: referral expiration failed:', refErr)
      }
    }
  }

  return { received: true }
})
