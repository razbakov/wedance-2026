import { timingSafeEqual } from 'node:crypto'
import { useDb } from '../../utils/db'
import { remindBookingInquiries } from '../../utils/bookingReminders'
import { siteUrl } from '../../utils/profileFeed'
import { trackServerEvent } from '../../utils/posthog'

/**
 * GET /api/cron/booking-reminders — one email for a booking request still
 * unanswered after three days (RAZ-1089). Run daily by Vercel Cron, which
 * sends `Authorization: Bearer $CRON_SECRET`. Without CRON_SECRET set it
 * refuses (503). Re-running is safe: reminded_at is set once a send lands.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const secret = process.env.CRON_SECRET
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET is not set' })
  const got = Buffer.from(getHeader(event, 'authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const run = await remindBookingInquiries(useDb(), { siteUrl: siteUrl() })
  for (const r of run.reminded) {
    trackServerEvent(event, 'booking_inquiry_reminded', null, { channel: 'cron', inquiry_id: r.inquiryId, profile: r.profile })
  }
  return { checked: run.checked, reminded: run.reminded.length, failed: run.failed }
})
