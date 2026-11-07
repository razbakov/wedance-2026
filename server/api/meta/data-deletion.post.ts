/**
 * Meta's data deletion callback (#501) — App settings → Basic → User data
 * deletion → https://2026.wedance.vip/api/meta/data-deletion.
 *
 * Meta posts a `signed_request` when someone removes the WeDance app from their
 * Facebook / Instagram settings and asks for their data to be deleted. With
 * Unified login WeDance only holds the system-user token for the Instagram
 * accounts they connected — never their Facebook profile — and Meta revokes
 * that token when the app is removed. We answer with a confirmation code and a
 * page where they can see how to delete the rest of their WeDance data.
 */
import { randomBytes } from 'node:crypto'
import { metaConfig } from '../../utils/meta/config'
import { parseSignedRequest } from '../../utils/meta/signatures'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const req = parseSignedRequest(body?.signed_request, metaConfig().appSecret)
  if (!req) throw createError({ statusCode: 400, statusMessage: 'Bad signed_request' })
  const code = `wd-${randomBytes(6).toString('hex')}`
  console.info('[meta data-deletion]', { code, issuedAt: req.issued_at })
  const site = (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
  return { url: `${site}/privacy-policy?deletion=${code}#organisers`, confirmation_code: code }
})
