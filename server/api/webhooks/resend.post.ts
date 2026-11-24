/**
 * Resend webhook: what happened to each email a page sent its contacts (migration 0080).
 *
 * 1. Verify the Svix signature (`RESEND_WEBHOOK_SECRET`) over the raw body, before parsing.
 * 2. Find the recipient row by Resend's `email_id`. WeDance's own emails (magic links,
 *    reminders) have no row and are acknowledged and ignored.
 * 3. Apply the event (shared/utils/mailingTracking.ts): delivered / opened / clicked /
 *    bounced / marked as spam. A hard bounce sets the contact's `bounced_at` (never emailed
 *    again); a spam complaint unsubscribes them.
 *
 * Opens and clicks are counted with SQL increments, so events arriving at once don't lose
 * counts. Resend retries non-2xx answers, so unknown ids still answer 200.
 */
import { eq, sql } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { contactMailingRecipients, profileContacts } from '../../database/schema'
import { applyTrackingEvent, type TrackingEvent } from '../../../shared/utils/mailingTracking'
import { verifyResendSignature } from './resend.lib'

export default defineEventHandler(async (event) => {
  const secret = useRuntimeConfig().resendWebhookSecret as string
  if (!secret) {
    console.error('[resend webhook] RESEND_WEBHOOK_SECRET is not set')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', data: { error: 'webhook_secret_missing' } })
  }
  const body = await readRawBody(event)
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Empty body' })
  const ok = verifyResendSignature({
    secret, body,
    id: getHeader(event, 'svix-id'), timestamp: getHeader(event, 'svix-timestamp'), signature: getHeader(event, 'svix-signature'),
  })
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', data: { error: 'invalid_signature' } })

  let ev: TrackingEvent & { data?: { email_id?: string } }
  try { ev = JSON.parse(body) } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid JSON' }) }
  const emailId = ev.data?.email_id
  if (!emailId) return { ok: true, tracked: false }

  const db = useDb()
  const [row] = await db.select().from(contactMailingRecipients).where(eq(contactMailingRecipients.resendId, emailId)).limit(1)
  if (!row) return { ok: true, tracked: false }

  const patch = applyTrackingEvent(row as any, ev)
  if (!patch) return { ok: true, tracked: false }

  const { opens, clicks, ...rest } = patch.recipient
  const set: Record<string, unknown> = { ...rest, updatedAt: new Date() }
  if (ev.type === 'email.opened') set.opens = sql`${contactMailingRecipients.opens} + 1`
  if (ev.type === 'email.clicked') {
    set.clicks = sql`${contactMailingRecipients.clicks} + 1`
    set.opens = sql`greatest(${contactMailingRecipients.opens}, 1)`
  }
  await db.update(contactMailingRecipients).set(set as any).where(eq(contactMailingRecipients.id, row.id))

  if (row.contactId && patch.contact === 'bounced') {
    await db.update(profileContacts).set({ bouncedAt: new Date(), updatedAt: new Date() }).where(eq(profileContacts.id, row.contactId))
  }
  if (row.contactId && patch.contact === 'unsubscribe') {
    await db.update(profileContacts).set({ status: 'unsubscribed', updatedAt: new Date() }).where(eq(profileContacts.id, row.contactId))
  }
  return { ok: true, tracked: true }
})
