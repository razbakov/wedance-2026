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
 *
 * A dancer who ticks "Let <page> keep in touch" under an event's poll opts in
 * themselves: a new contact gets source `rsvp`, an existing one keeps its source
 * and gains `source.opted_in` (both mailable).
 *
 * The audience (RAZ-963): the same list also holds people connected to the page
 * who are NOT contacts — they follow it, or went / are going to its events. They
 * have a WeDance account but gave the page no email: source `wedance`, email
 * block `not_a_contact`, never mailable, and no email or phone is ever sent for
 * them (only name, photo, handle, city — what "Who's coming" already shows).
 */

export const CONTACT_SOURCES = ['website', 'rsvp', 'hubspot_form', 'hubspot_import', 'hubspot_manual', 'wedance_v3', 'other', 'wedance'] as const
export type ContactSourceKey = typeof CONTACT_SOURCES[number]

export const SOURCE_LABEL: Record<ContactSourceKey, string> = {
  website: 'Your website',
  rsvp: 'Shared at an event',
  hubspot_form: 'HubSpot form',
  hubspot_import: 'HubSpot imported list',
  hubspot_manual: 'HubSpot by hand',
  wedance_v3: 'wedance.vip subscribers',
  other: 'Other',
  wedance: 'On WeDance, not a contact',
}

/** Sources where the person signed up for this page's emails themselves. Provisional — see the header. */
export const SELF_OPT_IN_SOURCES: readonly ContactSourceKey[] = ['website', 'rsvp', 'hubspot_form']

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
  if (s.from === 'rsvp') return 'rsvp'
  if (!s.from && (s.form || s.page || s.site || s.referrer || s.utm_source)) return 'website'
  return 'other'
}

export type EmailBlock = 'unsubscribed' | 'not_opted_in' | 'not_a_contact'

/** Why the page may not email this contact, or null when it may. */
export function emailBlock(c: { status: string, source: ContactSource, isContact?: boolean }): EmailBlock | null {
  if (c.isContact === false) return 'not_a_contact'
  if (c.status !== 'subscribed') return 'unsubscribed'
  if (c.source?.opted_in) return null
  if (!SELF_OPT_IN_SOURCES.includes(contactSourceKey(c.source))) return 'not_opted_in'
  return null
}

export const EMAIL_BLOCK_LABEL: Record<EmailBlock, string> = {
  unsubscribed: 'Unsubscribed',
  not_opted_in: 'Never asked for your emails',
  not_a_contact: 'Not a contact · no email',
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

/** How a contact is coming to one event: a ticket, their poll answer, else just "going" (Going! / attendance). */
export type ComingAs = 'ticket' | 'partner' | 'needLeader' | 'needFollower' | 'yes' | 'going'

/** The event filter covers events from this many days back (and everything ahead). */
export const EVENT_FILTER_PAST_DAYS = 30

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
  /** The page's events (from EVENT_FILTER_PAST_DAYS back) they're coming to, and how. */
  events: Record<string, ComingAs>
}

export const EMPTY_ACTIVITY: ContactActivity = { follows: false, followedAt: null, wentTo: 0, checkedIn: 0, upcoming: [], lastEventAt: null, events: {} }

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
  const byEvent = new Map<string, { name: string, start: string | null, going: boolean, checkedIn: boolean, as: ComingAs | null }>()
  for (const s of signals) {
    const e = byEvent.get(s.eventId) ?? { name: s.name || 'Event', start: iso(s.startDate), going: false, checkedIn: false, as: null }
    if (isGoingSignal(s)) {
      e.going = true
      e.as = strongerComingAs(e.as, comingAs(s))
    }
    if (s.checkedInAt) e.checkedIn = true
    byEvent.set(s.eventId, e)
  }
  const since = now.getTime() - EVENT_FILTER_PAST_DAYS * 86_400_000
  const events: Record<string, ComingAs> = {}
  for (const [id, e] of byEvent) if (e.going && e.as && e.start && new Date(e.start).getTime() >= since) events[id] = e.as
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
    events,
  }
}

function comingAs(s: ActivitySignal): ComingAs {
  if (s.kind === 'attendance' && s.detail === 'ticket_holder') return 'ticket'
  if (s.kind === 'rsvp' && s.detail && s.detail !== 'next') return s.detail as ComingAs
  return 'going'
}

// A ticket says the most, then the poll answer, then a plain Going!.
const COMING_RANK: Record<ComingAs, number> = { ticket: 3, partner: 2, needLeader: 2, needFollower: 2, yes: 2, going: 1 }
function strongerComingAs(a: ComingAs | null, b: ComingAs): ComingAs {
  return !a || COMING_RANK[b] > COMING_RANK[a] ? b : a
}

export const COMING_AS_LABEL: Record<ComingAs, string> = {
  ticket: 'Has a ticket',
  partner: 'With a partner',
  needLeader: 'Needs a leader',
  needFollower: 'Needs a follower',
  yes: 'Coming alone',
  going: 'Going (no answer)',
}
export const COMING_AS_ORDER: ComingAs[] = ['ticket', 'partner', 'needLeader', 'needFollower', 'yes', 'going']

// ---------------------------------------------------------------------------
// Activity filters and the segment counts.
// ---------------------------------------------------------------------------

/** "Regular": went to at least this many of the page's events. */
export const REGULAR_MIN_EVENTS = 3
/** "Haven't come lately": last event longer ago than this, nothing coming up. */
export const LAPSED_DAYS = 90
/** "New": became a contact within this many days. */
export const NEW_DAYS = 30

export const ACTIVITY_FILTERS = ['account', 'follows', 'came', 'going', 'regular', 'lapsed', 'new'] as const
export type ActivityFilter = typeof ACTIVITY_FILTERS[number]

export const ACTIVITY_FILTER_LABEL: Record<ActivityFilter, string> = {
  account: 'Has a WeDance account',
  follows: 'Follows you',
  came: 'Went or going to your events',
  going: 'Going to your next events',
  regular: `Regulars (${REGULAR_MIN_EVENTS}+ events)`,
  lapsed: `Haven’t come in ${LAPSED_DAYS / 30} months`,
  new: 'New this month',
}

export interface SegmentContact {
  status: string
  source: ContactSource
  /** When they became a contact; for a non-contact, when they followed the page (null = unknown). */
  createdAt: string | Date | null
  /** false = in the audience only (follows / came to the page's events), not a contact. */
  isContact?: boolean
  hasAccount: boolean
  activity: ContactActivity
}

const DAY = 86_400_000

export function matchesActivity(c: SegmentContact, f: ActivityFilter, now = new Date()): boolean {
  const a = c.activity
  switch (f) {
    case 'account': return c.hasAccount
    case 'follows': return a.follows
    case 'came': return cameToEvents(a)
    case 'going': return a.upcoming.length > 0
    case 'regular': return a.wentTo >= REGULAR_MIN_EVENTS
    case 'lapsed': return a.wentTo > 0 && !a.upcoming.length && !!a.lastEventAt && now.getTime() - new Date(a.lastEventAt).getTime() > LAPSED_DAYS * DAY
    case 'new': return !!c.createdAt && now.getTime() - new Date(c.createdAt).getTime() <= NEW_DAYS * DAY
  }
}

/** Went to, or is going to, at least one of the page's events. */
export const cameToEvents = (a: ContactActivity) => a.wentTo > 0 || a.upcoming.length > 0 || Object.keys(a.events).length > 0

/** Is this dancer part of the page's audience: a follower or someone who went / is going to its events? */
export const inAudience = (a: ContactActivity) => a.follows || cameToEvents(a)

/** The dancers of the audience who aren't contacts yet (`contactDancers` = contacts' accounts). */
export function audienceOnly(byDancer: ReadonlyMap<string, ContactActivity>, contactDancers: ReadonlySet<string>): string[] {
  return [...byDancer.entries()].filter(([id, a]) => !contactDancers.has(id) && inAudience(a)).map(([id]) => id)
}

export interface ContactSegments {
  /** Everyone in the list: contacts + the audience who aren't contacts. */
  total: number
  /** Of those, contacts (gave the page an email) and the rest. */
  contacts: number
  others: number
  sources: { key: ContactSourceKey, label: string, count: number, selfOptIn: boolean }[]
  canEmail: number
  cantEmail: number
  /** Can't email, by reason. */
  blocked: Record<EmailBlock, number>
  activity: Record<ActivityFilter, number>
}

export function contactSegments(contacts: SegmentContact[], now = new Date()): ContactSegments {
  const bySource = new Map<ContactSourceKey, number>()
  const blocked: Record<EmailBlock, number> = { unsubscribed: 0, not_opted_in: 0, not_a_contact: 0 }
  const activity = Object.fromEntries(ACTIVITY_FILTERS.map(f => [f, 0])) as Record<ActivityFilter, number>
  let canEmail = 0
  let others = 0
  for (const c of contacts) {
    if (c.isContact === false) others++
    const key = c.isContact === false ? 'wedance' : contactSourceKey(c.source)
    bySource.set(key, (bySource.get(key) ?? 0) + 1)
    const b = emailBlock(c)
    if (b) blocked[b]++
    else canEmail++
    for (const f of ACTIVITY_FILTERS) if (matchesActivity(c, f, now)) activity[f]++
  }
  return {
    total: contacts.length,
    contacts: contacts.length - others,
    others,
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
