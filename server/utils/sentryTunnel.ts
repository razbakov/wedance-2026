/**
 * Sentry tunnel (RAZ-976): the browser SDK posts its envelopes to our own
 * `/api/m` instead of `*.ingest.sentry.io`, which privacy blockers (Safari
 * Advanced Tracking Protection, Firefox strict, uBlock, Brave) drop — a
 * tester's "Report a problem" with a screenshot never reached Sentry and the
 * form said "Could not submit". The route forwards the envelope unchanged.
 *
 * Only envelopes for OUR DSN are forwarded, so the route can't be used as an
 * open relay to other Sentry projects.
 */

export interface TunnelTarget {
  /** e.g. https://o1.ingest.us.sentry.io/api/123/envelope/ */
  url: string
}

interface Dsn { host: string, projectId: string, publicKey: string }

export function parseDsn(dsn: string | undefined | null): Dsn | null {
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/^\/+|\/+$/g, '').split('/').pop() || ''
    if (!u.host || !projectId || !u.username) return null
    return { host: u.host, projectId, publicKey: u.username }
  } catch {
    return null
  }
}

/**
 * Where to forward an envelope, or null when it isn't for `allowedDsn`.
 * The envelope header is the first line of the body (JSON with a `dsn`).
 */
export function tunnelTarget(body: Uint8Array, allowedDsn: string | undefined | null): TunnelTarget | null {
  const allowed = parseDsn(allowedDsn)
  if (!allowed) return null
  const nl = body.indexOf(10)
  const headerLine = new TextDecoder().decode(nl === -1 ? body : body.subarray(0, nl))
  let header: { dsn?: unknown }
  try {
    header = JSON.parse(headerLine)
  } catch {
    return null
  }
  const dsn = parseDsn(typeof header.dsn === 'string' ? header.dsn : null)
  if (!dsn) return null
  if (dsn.host !== allowed.host || dsn.projectId !== allowed.projectId || dsn.publicKey !== allowed.publicKey) return null
  return { url: `https://${allowed.host}/api/${allowed.projectId}/envelope/` }
}
