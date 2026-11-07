/**
 * Meta webhook deliveries (#501): comments, messages and mentions on connected
 * Instagram accounts. Signed with the app secret (X-Hub-Signature-256), checked
 * on the raw body before anything is parsed. Deliveries for accounts not
 * connected to a WeDance page are dropped; the rest are stored for the inbox
 * (instagram_webhook_events). Always 200 quickly once verified, so Meta doesn't
 * retry or switch the subscription off.
 */
import { inArray } from 'drizzle-orm'
import { useDb } from '../../utils/db'
import { instagramConnections, instagramWebhookEvents } from '../../database/schema'
import { metaConfig } from '../../utils/meta/config'
import { verifyWebhookSignature } from '../../utils/meta/signatures'
import { webhookRows } from '../../utils/meta/webhookRows'

export default defineEventHandler(async (event) => {
  const raw = (await readRawBody(event)) ?? ''
  if (!verifyWebhookSignature(raw, getHeader(event, 'x-hub-signature-256'), metaConfig().appSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Bad signature' })
  }
  let body: unknown
  try { body = JSON.parse(raw) } catch { return { ok: true } }
  const rows = webhookRows(body)
  if (!rows.length) return { ok: true }
  const db = useDb()
  const known = await db.select({ id: instagramConnections.igUserId }).from(instagramConnections)
    .where(inArray(instagramConnections.igUserId, [...new Set(rows.map(r => r.igUserId))]))
  const ids = new Set(known.map((k: any) => k.id))
  const keep = rows.filter(r => ids.has(r.igUserId))
  if (keep.length) await db.insert(instagramWebhookEvents).values(keep)
  return { ok: true, stored: keep.length }
})
