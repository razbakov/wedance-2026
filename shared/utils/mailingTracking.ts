/**
 * What happened to a page's email after it left (delivered, opened, clicked, bounced,
 * marked as spam), from Resend's webhook events. Pure: the webhook
 * (server/api/webhooks/resend.post.ts) loads the recipient row, applies the patch, and
 * acts on `contact` (a hard bounce stops future emails, a spam complaint unsubscribes).
 *
 * Opens are approximate: Apple Mail fetches every image of every email it receives, so it
 * "opens" all of them. Clicks and bounces are reliable.
 */

export type RecipientStatus = 'sent' | 'failed' | 'delivered' | 'delayed' | 'bounced' | 'complained'

export interface RecipientState {
  status: RecipientStatus
  deliveredAt: Date | null
  bouncedAt: Date | null
  firstOpenedAt: Date | null
  opens: number
  firstClickedAt: Date | null
  clicks: number
}

export interface TrackingEvent {
  type: string
  created_at?: string
  data?: { bounce?: { type?: string, subType?: string } }
}

export interface TrackingPatch {
  recipient: Partial<RecipientState & { bounceType: string | null, complainedAt: Date | null }>
  /** What the event means for the page's contact. */
  contact: 'bounced' | 'unsubscribe' | null
}

/** A later status never goes back: delivered stays delivered when a late "delayed" arrives. */
const RANK: Record<RecipientStatus, number> = { failed: 0, sent: 1, delayed: 2, delivered: 3, bounced: 4, complained: 5 }
const raise = (from: RecipientStatus, to: RecipientStatus) => (RANK[to] > RANK[from] ? { status: to } : {})

/** A hard bounce: the address doesn't exist (Resend/SES type "Permanent"). Soft ones may still deliver later. */
export const isHardBounce = (ev: TrackingEvent) => (ev.data?.bounce?.type ?? '').toLowerCase() === 'permanent'

/** The change one webhook event makes, or null when the event isn't one we track. */
export function applyTrackingEvent(row: RecipientState, ev: TrackingEvent): TrackingPatch | null {
  const at = ev.created_at ? new Date(ev.created_at) : new Date()
  const when = Number.isNaN(at.getTime()) ? new Date() : at
  switch (ev.type) {
    case 'email.delivered':
      return { recipient: { ...raise(row.status, 'delivered'), deliveredAt: row.deliveredAt ?? when }, contact: null }
    case 'email.delivery_delayed':
      return { recipient: raise(row.status, 'delayed'), contact: null }
    case 'email.bounced': {
      const hard = isHardBounce(ev)
      return {
        recipient: { ...raise(row.status, 'bounced'), bouncedAt: row.bouncedAt ?? when, bounceType: hard ? 'hard' : 'soft' },
        contact: hard ? 'bounced' : null,
      }
    }
    case 'email.complained':
      return { recipient: { ...raise(row.status, 'complained'), complainedAt: when }, contact: 'unsubscribe' }
    case 'email.opened':
      return { recipient: { opens: row.opens + 1, firstOpenedAt: row.firstOpenedAt ?? when }, contact: null }
    case 'email.clicked':
      // A click means it was opened too, even when the image that counts opens was blocked.
      return {
        recipient: { clicks: row.clicks + 1, firstClickedAt: row.firstClickedAt ?? when, firstOpenedAt: row.firstOpenedAt ?? when, opens: Math.max(row.opens, 1) },
        contact: null,
      }
    case 'email.failed':
      return { recipient: row.status === 'sent' ? { status: 'failed' } : {}, contact: null }
    default:
      return null
  }
}

export interface MailingStats {
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}

/** The numbers under a send in "Sent before". */
export function mailingStats(rows: Pick<RecipientState, 'status' | 'deliveredAt' | 'firstOpenedAt' | 'firstClickedAt'>[]): MailingStats {
  const s: MailingStats = { delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 }
  for (const r of rows) {
    if (r.deliveredAt || r.status === 'delivered' || r.status === 'complained') s.delivered++
    if (r.firstOpenedAt) s.opened++
    if (r.firstClickedAt) s.clicked++
    if (r.status === 'bounced') s.bounced++
    if (r.status === 'complained') s.complained++
  }
  return s
}

/** "41 delivered · 12 opened · 3 clicked · 2 bounced", leaving out zeros after "delivered". */
export function mailingStatsLine(s: MailingStats): string {
  const parts = [`${s.delivered} delivered`]
  if (s.opened) parts.push(`${s.opened} opened`)
  if (s.clicked) parts.push(`${s.clicked} clicked`)
  if (s.bounced) parts.push(`${s.bounced} bounced`)
  if (s.complained) parts.push(`${s.complained} marked as spam`)
  return parts.join(' · ')
}
