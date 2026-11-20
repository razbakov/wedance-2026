/**
 * Where a visitor came from (RAZ-1074): the utm_* tags of the link they landed on, and the outside site that
 * sent them. Caught on landing (app/plugins/08.came-from.client.ts), sent with an event sign-up, and kept on
 * the page's contact (`profile_contacts.source`), so Contacts can say "montuno.club / schedule".
 * Non-PII only: the referrer is cut to origin + path (no query string).
 */
import { z } from 'zod'

export const CAME_FROM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type CameFrom = Partial<Record<(typeof CAME_FROM_KEYS)[number] | 'referrer', string>>

const value = z.string().trim().max(200)
export const cameFromInput = z.object({
  utm_source: value.optional(),
  utm_medium: value.optional(),
  utm_campaign: value.optional(),
  utm_content: value.optional(),
  utm_term: value.optional(),
  referrer: value.optional(),
}).strict()

/** The referrer as origin + path, or '' when it is missing, unparsable or our own site. */
export function outsideReferrer(referrer: string | null | undefined, ownHost: string): string {
  if (!referrer) return ''
  try {
    const u = new URL(referrer)
    if (!/^https?:$/.test(u.protocol) || u.host === ownHost) return ''
    return (u.origin + (u.pathname === '/' ? '/' : u.pathname)).slice(0, 200)
  } catch { return '' }
}

/** What a landing tells us: utm_* from the query, the outside referrer. Null when it tells nothing. */
export function cameFromLanding(query: Record<string, unknown>, referrer: string | null | undefined, ownHost: string): CameFrom | null {
  const out: CameFrom = {}
  for (const k of CAME_FROM_KEYS) {
    const v = Array.isArray(query[k]) ? query[k][0] : query[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200)
  }
  const ref = outsideReferrer(referrer, ownHost)
  if (ref) out.referrer = ref
  return Object.keys(out).length ? out : null
}

/** Only the known keys, non-empty, trimmed: what may go into a contact's `source`. */
export function cleanCameFrom(raw: unknown): CameFrom {
  const out: CameFrom = {}
  if (!raw || typeof raw !== 'object') return out
  for (const k of [...CAME_FROM_KEYS, 'referrer'] as const) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 200)
  }
  return out
}
