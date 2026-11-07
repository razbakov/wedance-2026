/**
 * Meta webhook verification (#501): when the callback URL is saved in the
 * dashboard (Instagram use case → Configure webhooks), Meta calls
 * GET ?hub.mode=subscribe&hub.verify_token=…&hub.challenge=… and expects the
 * challenge echoed back when the token is ours (META_WEBHOOK_VERIFY_TOKEN).
 */
import { metaConfig } from '../../utils/meta/config'
import { safeEqual } from '../../oauth/crypto'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const expected = metaConfig().webhookVerifyToken
  if (q['hub.mode'] === 'subscribe' && expected && typeof q['hub.verify_token'] === 'string' && safeEqual(q['hub.verify_token'], expected)) {
    setHeader(event, 'content-type', 'text/plain')
    return String(q['hub.challenge'] ?? '')
  }
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
})
