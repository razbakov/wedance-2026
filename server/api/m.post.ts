import { tunnelTarget } from '../utils/sentryTunnel'

/**
 * POST /api/m — Sentry tunnel (see server/utils/sentryTunnel.ts). The client
 * SDK sends every envelope (errors, replays, "Report a problem" feedback with
 * its screenshot) here; we forward it to Sentry's ingest and answer with
 * Sentry's status, so `sendFeedback` still learns whether it was accepted.
 * A neutral path on purpose: blockers match "sentry" in URLs.
 */
export default defineEventHandler(async (event) => {
  const body = await readRawBody(event, false)
  if (!body?.length) {
    setResponseStatus(event, 400)
    return { error: 'empty' }
  }
  const target = tunnelTarget(body, useRuntimeConfig().public.sentryDsn as string)
  if (!target) {
    setResponseStatus(event, 403)
    return { error: 'unknown dsn' }
  }
  try {
    const res = await fetch(target.url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    })
    setResponseStatus(event, res.status)
    for (const h of ['x-sentry-rate-limits', 'retry-after']) {
      const v = res.headers.get(h)
      if (v) setResponseHeader(event, h, v)
    }
    if (res.status >= 300) console.warn(`[sentry-tunnel] ingest answered ${res.status} (${body.length} bytes)`)
    return await res.text()
  } catch (e) {
    console.warn(`[sentry-tunnel] forward failed (${body.length} bytes):`, e)
    setResponseStatus(event, 502)
    return { error: 'forward failed' }
  }
})
