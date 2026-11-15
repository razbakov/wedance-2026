/**
 * A page's contacts as segments (RAZ-949): where each contact came from, whether
 * the page may email them, and what they do on WeDance around the page's events.
 * Pure — the server builds the input (server/utils/contactActivity.ts), the
 * Contacts page only renders it.
 *
 * Who may be emailed is NOT decided yet (UWG §7 / GDPR): only people who signed
 * up themselves (the website form, a HubSpot newsletter form) count as
 * mailable until Alex decides otherwise. Imported lists and wedance.vip
 * subscribers never asked for email from this page, so they're "can't email"
 * until they opt in (the one-time ask, RAZ-949 step 4).
 */

export const CONTACT_SOURCES = ['website', 'hubspot_form', 'hubspot_import', 'hubspot_manual', 'wedance_v3', 'other'] as const
export type ContactSourceKey = typeof CONTACT_SOURCES[number]

export const SOURCE_LABEL: Record<ContactSourceKey, string> = {
  website: 'Your website',
  hubspot_form: 'HubSpot form',
  hubspot_import: 'HubSpot imported list',
  hubspot_manual: 'HubSpot by hand',
  wedance_v3: 'wedance.vip subscribers',
  other: 'Other',
}

/** Sources where the person signed up for this page's emails themselves. Provisional — see the header. */
export const SELF_OPT_IN_SOURCES: readonly ContactSourceKey[] = ['website', 'hubspot_form']

export type ContactSource = Record<string, string> | null | undefined

/** Which segment a contact's `source` puts it in. Website sign-ups carry no `from`. */
export function contactSourceKey(source: ContactSource): ContactSourceKey {
  const s = source ?? {}
  if (s.from === 'hubspot') {
    if (s.hubspot_origin === 'form') return 'hubspot_form'
    if (s.hubspot_origin === 'import') return 'hubspot_import'
    if (s.hubspot_origin === 'crm_ui') return 'hubspot_manual'
    return 'other'
  }
  if (s.from === 'wedance-v3') return 'wedance_v3'
  if (!s.from && (s.form || s.page || s.site || s.referrer || s.utm_source)) return 'website'
  return 'other'
}

export type EmailBlock = 'unsubscribed' | 'not_opted_in'

/** Why the page may not email this contact, or null when it may. */
export function emailBlock(c: { status: string, source: ContactSource }): EmailBlock | null {
  if (c.status !== 'subscribed') return 'unsubscribed'
  if (!SELF_OPT_IN_SOURCES.includes(contactSourceKey(c.source))) return 'not_opted_in'
  return null
}

export const EMAIL_BLOCK_LABEL: Record<EmailBlock, string> = {
  unsubscribed: 'Unsubscribed',
  not_opted_in: 'Never asked for your emails',
}

// ---------------------------------------------------------------------------
// WeDance activity: what a contact with an account does around the page's
// events (organiser, venue, host or co-organiser).
// ---------------------------------------------------------------------------

/** One fact about a dancer and one of the page's events. */
export interface ActivitySignal {
  eventId: string
  name: string | null
  startDate: string | Date | null
  /** attendance (status ladder) · rsvp (the event poll) · plan (Going! on My plan). */
  kind: 'attendance' | 'rsvp' | 'plan'
  /** attendance: interested / going / ticket_holder · rsvp: the answer. */
  detail?: string | null
  checkedInAt?: string | Date | null
}

export interface ContactEvent { id: string, name: string, startDate: string }

export interface ContactActivity {
  follows: boolean
  followedAt: string | null
  /** Past events of the page they said they're going to (or were checked in at). */
  wentTo: number
  /** Of those, checked in at the door. */
  checkedIn: number
  /** Upcoming events of the page they're going to, soonest first (max 3). */
  upcoming: ContactEvent[]
  /** Start of the latest past event they went to. */
  lastEventAt: string | null
}

export const EMPTY_ACTIVITY: ContactActivity = { follows: false, followedAt: null, wentTo: 0, checkedIn: 0, upcoming: [], lastEventAt: null }

/** Does this signal mean "I'm coming"? "Interested" and "Next time" don't. */
export function isGoingSignal(s: ActivitySignal): boolean {
  if (s.checkedInAt) return true
  if (s.kind === 'attendance') return s.detail === 'going' || s.detail === 'ticket_holder'
  if (s.kind === 'rsvp') return !!s.detail && s.detail !== 'next'
  return true // plan: a Going! click
}

const iso = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString() : null)

/** `follow` = the follow row (its date may be unknown), or null when they don't follow the page. */
export function summariseActivity(signals: ActivitySignal[], follow: { at: string | Date | null } | null | undefined, now = new Date()): ContactActivity {
  const byEvent = new Map<string, { name: string, start: string | null, going: boolean, checkedIn: boolean }>()
  for (const s of signals) {
    const e = byEvent.get(s.eventId) ?? { name: s.name || 'Event', start: iso(s.startDate), going: false, checkedIn: false }
    if (isGoingSignal(s)) e.going = true
    if (s.checkedInAt) e.checkedIn = true
    byEvent.set(s.eventId, e)
  }
  const going = [...byEvent.entries()].filter(([, e]) => e.going && e.start)
  const past = going.filter(([, e]) => new Date(e.start!) < now)
  const upcoming = going.filter(([, e]) => new Date(e.start!) >= now)
    .sort((a, b) => a[1].start!.localeCompare(b[1].start!))
    .slice(0, 3)
    .map(([id, e]) => ({ id, name: e.name, startDate: e.start! }))
  const last = past.map(([, e]) => e.start!).sort().at(-1) ?? null
  return {
    follows: !!follow,
    followedAt: iso(follow?.at),
    wentTo: past.length,
    checkedIn: past.filter(([, e]) => e.checkedIn).length,
    upcoming,
    lastEventAt: last,
  }
}

// ---------------------------------------------------------------------------
// Activity filters and the segment counts.
// ---------------------------------------------------------------------------

/** "Regular": went to at least this many of the page's events. */
export const REGULAR_MIN_EVENTS = 3
/** "Haven't come lately": last event longer ago than this, nothing coming up. */
export const LAPSED_DAYS = 90
/** "New": became a contact within this many days. */
export const NEW_DAYS = 30

export const ACTIVITY_FILTERS = ['account', 'follows', 'going', 'regular', 'lapsed', 'new'] as const
export type ActivityFilter = typeof ACTIVITY_FILTERS[number]

export const ACTIVITY_FILTER_LABEL: Record<ActivityFilter, string> = {
  account: 'Has a WeDance account',
  follows: 'Follows you',
  going: 'Going to your next events',
  regular: `Regulars (${REGULAR_MIN_EVENTS}+ events)`,
  lapsed: `Haven’t come in ${LAPSED_DAYS / 30} months`,
  new: 'New this month',
}

export interface SegmentContact {
  status: string
  source: ContactSource
  createdAt: string | Date
  hasAccount: boolean
  activity: ContactActivity
}

const DAY = 86_400_000

export function matchesActivity(c: SegmentContact, f: ActivityFilter, now = new Date()): boolean {
  const a = c.activity
  switch (f) {
    case 'account': return c.hasAccount
    case 'follows': return a.follows
    case 'going': return a.upcoming.length > 0
    case 'regular': return a.wentTo >= REGULAR_MIN_EVENTS
    case 'lapsed': return a.wentTo > 0 && !a.upcoming.length && !!a.lastEventAt && now.getTime() - new Date(a.lastEventAt).getTime() > LAPSED_DAYS * DAY
    case 'new': return now.getTime() - new Date(c.createdAt).getTime() <= NEW_DAYS * DAY
  }
}

export interface ContactSegments {
  total: number
  sources: { key: ContactSourceKey, label: string, count: number, selfOptIn: boolean }[]
  canEmail: number
  cantEmail: number
  /** Can't email, by reason. */
  blocked: Record<EmailBlock, number>
  activity: Record<ActivityFilter, number>
}

export function contactSegments(contacts: SegmentContact[], now = new Date()): ContactSegments {
  const bySource = new Map<ContactSourceKey, number>()
  const blocked: Record<EmailBlock, number> = { unsubscribed: 0, not_opted_in: 0 }
  const activity = Object.fromEntries(ACTIVITY_FILTERS.map(f => [f, 0])) as Record<ActivityFilter, number>
  let canEmail = 0
  for (const c of contacts) {
    const key = contactSourceKey(c.source)
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
    const b = emailBlock(c)
    if (b) blocked[b]++
    else canEmail++
    for (const f of ACTIVITY_FILTERS) if (matchesActivity(c, f, now)) activity[f]++
  }
  return {
    total: contacts.length,
    sources: CONTACT_SOURCES.filter(k => bySource.has(k))
      .map(key => ({ key, label: SOURCE_LABEL[key], count: bySource.get(key)!, selfOptIn: SELF_OPT_IN_SOURCES.includes(key) }))
      .sort((a, b) => b.count - a.count),
    canEmail,
    cantEmail: contacts.length - canEmail,
    blocked,
    activity,
  }
}

/** "went to 4 of your events · going Sat 22 Nov · follows you" — empty when there's nothing to say. */
export function activityLine(a: ContactActivity, opts: { timeZone?: string } = {}): string {
  const parts: string[] = []
  if (a.wentTo) parts.push(`went to ${a.wentTo} of your events`)
  if (a.upcoming.length) {
    const d = new Date(a.upcoming[0]!.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: opts.timeZone })
    parts.push(`going ${d}${a.upcoming.length > 1 ? ` +${a.upcoming.length - 1}` : ''}`)
  }
  if (a.follows) parts.push('follows you')
  return parts.join(' · ')
}
