import { eq, and } from 'drizzle-orm'
import { referrals } from '../../database/schema'

/**
 * Mark the referral tied to a Stripe checkout session as 'completed'.
 *
 * Idempotent: the WHERE clause filters on status='pending', so an
 * already-completed row is a no-op (0 rows updated).
 */
export async function completeReferral(db: any, stripeSessionId: string) {
  return db
    .update(referrals)
    .set({ status: 'completed', completedAt: new Date() })
    .where(and(
      eq(referrals.stripeSessionId, stripeSessionId),
      eq(referrals.status, 'pending'),
    ))
}

/**
 * Mark the referral tied to a Stripe checkout session as 'expired'.
 *
 * Idempotent: only transitions 'pending' → 'expired'.
 */
export async function expireReferral(db: any, stripeSessionId: string) {
  return db
    .update(referrals)
    .set({ status: 'expired' })
    .where(and(
      eq(referrals.stripeSessionId, stripeSessionId),
      eq(referrals.status, 'pending'),
    ))
}
