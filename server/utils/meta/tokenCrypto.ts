import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { signingSecret } from '../../oauth/crypto'

/**
 * Instagram tokens at rest (#501): AES-256-GCM, `v1.<iv>.<tag>.<ciphertext>`
 * (base64url). A system-user token never expires, so a leaked database row
 * must not be enough to post on someone's Instagram.
 *
 * Key: META_TOKEN_KEY (32+ characters) when set, else derived from
 * OAUTH_SIGNING_SECRET (already required in production). Changing either
 * makes stored tokens unreadable — organisers then reconnect.
 */
function key(): Buffer {
  const k = process.env.META_TOKEN_KEY
  const base = k && k.length >= 32 ? k : `meta-token:${signingSecret()}`
  return createHash('sha256').update(base, 'utf8').digest()
}

export function encryptToken(token: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.')
}

export function decryptToken(stored: string): string {
  const [v, iv, tag, enc] = stored.split('.')
  if (v !== 'v1' || !iv || !tag || !enc) throw new Error('Unreadable Instagram token.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(enc, 'base64url')), decipher.final()]).toString('utf8')
}
