import { createHmac } from 'node:crypto'
import { safeEqual } from '../../oauth/crypto'

/**
 * Checks on what Meta sends us (#501), keyed by the app secret.
 *
 * - Webhooks: `X-Hub-Signature-256: sha256=<hex HMAC of the raw body>`.
 * - Data deletion / deauthorize callbacks: a `signed_request` form field,
 *   `<base64url sig>.<base64url JSON>`, HMAC-SHA256 over the payload part.
 */
export function verifyWebhookSignature(rawBody: string, header: string | null | undefined, appSecret: string): boolean {
  if (!appSecret || !header?.startsWith('sha256=')) return false
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  return safeEqual(header.slice(7).toLowerCase(), expected)
}

export interface SignedRequest { user_id?: string; algorithm?: string; issued_at?: number; [k: string]: unknown }

export function parseSignedRequest(signedRequest: string | null | undefined, appSecret: string): SignedRequest | null {
  if (!appSecret || !signedRequest || signedRequest.length > 8192) return null
  const [sig, payload, extra] = signedRequest.split('.')
  if (!sig || !payload || extra !== undefined) return null
  const expected = createHmac('sha256', appSecret).update(payload).digest('base64url')
  if (!safeEqual(sig.replace(/=+$/, ''), expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (data?.algorithm && String(data.algorithm).toUpperCase() !== 'HMAC-SHA256') return null
    return data
  } catch {
    return null
  }
}
