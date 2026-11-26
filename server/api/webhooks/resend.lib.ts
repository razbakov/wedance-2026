import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${body}`
 * with the base64 secret after `whsec_`; `svix-signature` holds one or more `v1,<base64>`.
 * A timestamp more than 5 minutes off is refused (replays).
 */
export function verifyResendSignature(p: {
  secret: string
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
  body: string
  now?: number
}): boolean {
  if (!p.secret || !p.id || !p.timestamp || !p.signature) return false
  const ts = Number(p.timestamp)
  if (!Number.isFinite(ts) || Math.abs((p.now ?? Date.now()) / 1000 - ts) > 300) return false
  const key = Buffer.from(p.secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${p.id}.${p.timestamp}.${p.body}`).digest()
  for (const part of p.signature.split(' ')) {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) continue
    const got = Buffer.from(sig, 'base64')
    if (got.length === expected.length && timingSafeEqual(got, expected)) return true
  }
  return false
}
