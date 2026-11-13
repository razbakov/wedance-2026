/**
 * Sentry tunnel: the browser SDK posts its envelopes to our own origin
 * (`tunnel` in sentry.client.config.ts → server/api/relay.post.ts) instead of
 * *.ingest.sentry.io, which ad / tracker blockers drop — that broke the
 * "Talk to us" report form and lost Session Replays for those visitors.
 *
 * Only envelopes for OUR project are forwarded, so the route can't be used as
 * an open proxy to other Sentry projects or hosts.
 */

export interface TunnelTarget {
  url: string
}

function parseDsn(dsn: string): { host: string, projectId: string } | null {
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/^\/+|\/+$/g, '')
    if (!u.host || !/^\d+$/.test(projectId)) return null
    return { host: u.host, projectId }
  } catch {
    return null
  }
}

/**
 * Pure: where to forward an envelope, given its first line (the envelope
 * header JSON) and our configured DSN. Null = reject.
 */
export function tunnelTarget(headerLine: string, ourDsn: string): TunnelTarget | null {
  const ours = parseDsn(ourDsn)
  if (!ours) return null
  let header: { dsn?: unknown }
  try {
    header = JSON.parse(headerLine)
  } catch {
    return null
  }
  if (typeof header?.dsn !== 'string') return null
  const theirs = parseDsn(header.dsn)
  if (!theirs || theirs.host !== ours.host || theirs.projectId !== ours.projectId) return null
  return { url: `https://${ours.host}/api/${ours.projectId}/envelope/` }
}

/** The envelope header is everything before the first newline. */
export function envelopeHeaderLine(body: Uint8Array): string {
  const nl = body.indexOf(0x0a)
  const end = nl === -1 ? body.length : nl
  return new TextDecoder().decode(body.subarray(0, Math.min(end, 4096)))
}
