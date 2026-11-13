import { envelopeHeaderLine, tunnelTarget } from '../utils/sentryTunnel'

/**
 * Sentry tunnel (see server/utils/sentryTunnel.ts). Neutral path name on
 * purpose: blocker lists match "sentry" and "/monitoring".
 */
export default defineEventHandler(async (event) => {
  const dsn = useRuntimeConfig().public.sentryDsn as string
  if (!dsn) {
    setResponseStatus(event, 404)
    return ''
  }

  const body = await readRawBody(event, false)
  if (!body?.length) {
    setResponseStatus(event, 400)
    return ''
  }
  const bytes = new Uint8Array(body)
  const target = tunnelTarget(envelopeHeaderLine(bytes), dsn)
  if (!target) {
    setResponseStatus(event, 400)
    return ''
  }

  const ip = getRequestIP(event, { xForwardedFor: true })
  try {
    const r = await fetch(target.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        // Keep Sentry's geo / rate limiting per visitor, not per Vercel instance.
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
      },
      body: bytes,
    })
    setResponseStatus(event, r.status)
    // The SDK reads these to back off.
    for (const h of ['x-sentry-rate-limits', 'retry-after']) {
      const v = r.headers.get(h)
      if (v) setResponseHeader(event, h, v)
    }
    return await r.text()
  } catch (e) {
    console.warn('[relay] Sentry unreachable:', e)
    setResponseStatus(event, 502)
    return ''
  }
})
