/**
 * One reminder for a booking request still unanswered after three days
 * (RAZ-1089). Sent to the same people as the first email. A request older
 * than two weeks is left alone, so turning this on doesn’t mail the backlog.
 */
import { and, eq, isNull, lte, gt } from 'drizzle-orm'
import { bookingInquiries, profiles } from '../database/schema'
import { dueForReminder, REMIND_AFTER_MS, REMIND_UNTIL_MS } from '../../shared/utils/bookingAccept'
import { sendBookingReminderEmail } from './email'
import { inquiryRecipients } from './bookingRecipients'

export async function remindBookingInquiries(db: any, opts: { siteUrl: string; now?: Date; limit?: number }) {
  const now = opts.now ?? new Date()
  const rows = await db.select({
    id: bookingInquiries.id,
    name: bookingInquiries.name,
    what: bookingInquiries.what,
    createdAt: bookingInquiries.createdAt,
    status: bookingInquiries.status,
    remindedAt: bookingInquiries.remindedAt,
    profileId: profiles.id,
    profileName: profiles.name,
    username: profiles.username,
    contact: profiles.contact,
  }).from(bookingInquiries)
    .innerJoin(profiles, eq(profiles.id, bookingInquiries.profileId))
    .where(and(
      eq(bookingInquiries.status, 'new'),
      isNull(bookingInquiries.remindedAt),
      lte(bookingInquiries.createdAt, new Date(now.getTime() - REMIND_AFTER_MS)),
      gt(bookingInquiries.createdAt, new Date(now.getTime() - REMIND_UNTIL_MS)),
    ))
    .limit(opts.limit ?? 100)

  const reminded: { inquiryId: string; profile: string }[] = []
  let failed = 0
  for (const row of rows) {
    if (!dueForReminder(row, now)) continue
    const { to } = await inquiryRecipients(db, { id: row.profileId, name: row.profileName, contact: row.contact })
    const sentOn = new Date(row.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    let sent = 0
    for (const m of to) {
      try {
        await sendBookingReminderEmail({
          to: m.email, name: m.name, askerName: row.name, profileName: row.profileName,
          what: row.what, sentOn, link: `${opts.siteUrl}/business/network/${row.username}/bookings`,
        })
        sent++
      } catch (e) {
        failed++
        console.error('[inquiries] reminder failed', e)
      }
    }
    if (sent > 0) {
      const [marked] = await db.update(bookingInquiries)
        .set({ remindedAt: now })
        .where(and(eq(bookingInquiries.id, row.id), isNull(bookingInquiries.remindedAt)))
        .returning({ id: bookingInquiries.id })
      if (marked) reminded.push({ inquiryId: row.id, profile: row.username })
    }
  }
  return { reminded, failed, checked: rows.length }
}
