/**
 * Who a booking request is delivered to: the page's team, else its private
 * booking email, else WeDance to pass on. Shared by the first email and the
 * three-day reminder so both reach the same people.
 */
import { eq } from 'drizzle-orm'
import { dancers, profileMembers } from '../database/schema'

export const BOOKING_FORWARD_TO = 'hello@wedance.vip'

export async function inquiryRecipients(
  db: any,
  profile: { id: string; name: string; contact: { email?: string } | null },
): Promise<{ to: { email: string; name: string }[]; forward: boolean }> {
  const team = await db.select({ email: dancers.email, name: dancers.name }).from(profileMembers)
    .innerJoin(dancers, eq(dancers.id, profileMembers.dancerId)).where(eq(profileMembers.profileId, profile.id))
  const own = profile.contact?.email?.trim()
  const forward = !team.length && !own
  const to = team.length ? team : own ? [{ email: own, name: profile.name }] : [{ email: BOOKING_FORWARD_TO, name: 'WeDance' }]
  return { to, forward }
}
