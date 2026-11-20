import { timingSafeEqual } from 'node:crypto'
import { useDb } from '../../utils/db'
import { sendReviewAsks } from '../../utils/reviewAsk'
import { siteUrl } from '../../utils/profileFeed'
import { trackServerEvent } from '../../utils/posthog'

/**
 * GET /api/cron/review-asks — the morning-after "How was it?" emails (RAZ-1011).
 * Run daily by Vercel Cron (vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
 * Without CRON_SECRET set it refuses (503): nothing is sent. Re-running is safe — each address
 * is asked once per event (event_review_asks).
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const secret = process.env.CRON_SECRET
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET is not set' })
  const got = Buffer.from(getHeader(event, 'authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const run = await sendReviewAsks(useDb(), { siteUrl: siteUrl() })
  for (const e of run.perEvent) {
    trackServerEvent(event, 'review_asks_sent', null, { channel: 'cron', event_id: e.eventId, asked: e.asked, failed: e.failed })
  }
  return { events: run.events, asked: run.asked, skipped: run.skipped, failed: run.failed }
})
