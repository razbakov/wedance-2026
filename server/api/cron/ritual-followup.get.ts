import { timingSafeEqual } from 'node:crypto'
import { useDb } from '../../utils/db'
import { sendRitualFollowups } from '../../utils/ritual'
import { siteUrl } from '../../utils/profileFeed'
import { trackServerEvent } from '../../utils/posthog'

/**
 * GET /api/cron/ritual-followup — the morning-after "How was it?" for a booked
 * meetup (RAZ-1071). Run daily by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`.
 * Without CRON_SECRET set it refuses (503). Re-running is safe: each dancer is emailed once per meetup.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const secret = process.env.CRON_SECRET
  if (!secret) throw createError({ statusCode: 503, statusMessage: 'CRON_SECRET is not set' })
  const got = Buffer.from(getHeader(event, 'authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const run = await sendRitualFollowups(useDb(), { siteUrl: siteUrl() })
  for (const dancerId of run.sentTo) {
    trackServerEvent(event, 'ritual_followup', dancerId, { channel: 'cron' })
  }
  return { sent: run.sent, skipped: run.skipped, failed: run.failed }
})
