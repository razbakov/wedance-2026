/**
 * Filtering a page's contacts on the Contacts page (RAZ-949): by source, by
 * whether the page may email them, by WeDance activity, and by free text
 * (name, email, phone, note, account name and the source details — form, UTM,
 * promo code). One event narrows it to the contacts coming to it, optionally by
 * how they're coming (ticket, poll answer). Plus the CSV of whatever the filter shows.
 * Since RAZ-963 the list is the page's whole audience: contacts plus the followers and
 * event-goers who aren't contacts (`isContact: false`); `who` narrows it to either.
 */
import { ACTIVITY_FILTER_LABEL, COMING_AS_LABEL, EMAIL_BLOCK_LABEL, SOURCE_LABEL, matchesActivity, type ActivityFilter, type ComingAs, type ContactSourceKey, type EmailBlock, type SegmentContact } from '#shared/utils/contactSegments'

export interface FilterableContact extends SegmentContact {
  name: string | null
  email: string
  phone: string | null
  note: string | null
  sourceKey: ContactSourceKey
  emailBlock: string | null
  account: { name: string | null } | null
}

export interface ContactFilter {
  /** Empty = every source. */
  sources: ContactSourceKey[]
  email: 'any' | 'can' | 'cant'
  /** All of these must match. */
  activity: ActivityFilter[]
  /** Contacts only, the audience who aren't contacts only, or both. */
  who: 'any' | 'contacts' | 'others'
  /** One of the page's events: only contacts coming to it. */
  event: string | null
  /** With `event`: only those coming this way. */
  as: ComingAs | null
  q: string
}

export const emptyFilter = (): ContactFilter => ({ sources: [], email: 'any', activity: [], who: 'any', event: null, as: null, q: '' })

export function isFiltered(f: ContactFilter): boolean {
  return f.sources.length > 0 || f.email !== 'any' || f.activity.length > 0 || f.who !== 'any' || !!f.event || f.q.trim() !== ''
}

export function filterContacts<T extends FilterableContact>(list: T[], f: ContactFilter, now = new Date()): T[] {
  const needle = f.q.trim().toLowerCase()
  return list.filter((c) => {
    if (f.who === 'contacts' && c.isContact === false) return false
    if (f.who === 'others' && c.isContact !== false) return false
    if (f.sources.length && !f.sources.includes(c.sourceKey)) return false
    if (f.email === 'can' && c.emailBlock) return false
    if (f.email === 'cant' && !c.emailBlock) return false
    if (!f.activity.every(a => matchesActivity(c, a, now))) return false
    if (f.event) {
      const as = c.activity.events?.[f.event]
      if (!as || (f.as && as !== f.as)) return false
    }
    if (needle && ![c.name, c.email, c.phone, c.note, c.account?.name, ...Object.values(c.source ?? {})].some(v => typeof v === 'string' && v.toLowerCase().includes(needle))) return false
    return true
  })
}

/**
 * The filter in words, for the email composer and the send log (RAZ-975):
 * "Coming to Sun 15 Nov · Casino · Needs a follower · Your website · search “anna”".
 * Empty when nothing is filtered (everyone).
 */
export function describeFilter(f: ContactFilter, eventLabel?: string | null): string {
  return [
    f.event ? `Coming to ${eventLabel || 'an event'}` : '',
    f.event && f.as ? COMING_AS_LABEL[f.as] : '',
    f.who === 'contacts' ? 'Contacts' : f.who === 'others' ? 'Not contacts' : '',
    f.email === 'can' ? 'Can email' : f.email === 'cant' ? 'Can’t email' : '',
    ...f.sources.map(s => SOURCE_LABEL[s]),
    ...f.activity.map(a => ACTIVITY_FILTER_LABEL[a]),
    f.q.trim() ? `search “${f.q.trim()}”` : '',
  ].filter(Boolean).join(' · ')
}

/** How many of `list` come to `eventId`, in total and by how they're coming. */
export function comingCounts(list: readonly FilterableContact[], eventId: string): { total: number, by: Partial<Record<ComingAs, number>> } {
  const by: Partial<Record<ComingAs, number>> = {}
  let total = 0
  for (const c of list) {
    const as = c.activity.events?.[eventId]
    if (!as) continue
    total++
    by[as] = (by[as] ?? 0) + 1
  }
  return { total, by }
}

/**
 * The filter rail, kept short (Contacts sidebar redesign, 19 Nov 2026): the options worth
 * showing up front, the rest behind "More". Options with nobody in them are dropped unless
 * picked, and a picked option is never hidden behind "More".
 */
export function railOptions<T extends { key: PropertyKey, count: number }>(options: readonly T[], picked: readonly T['key'][], limit = 4): { shown: T[], more: T[] } {
  const live = options.filter(o => o.count > 0 || picked.includes(o.key))
  const shown = live.slice(0, limit)
  const more: T[] = []
  for (const o of live.slice(limit)) (picked.includes(o.key) ? shown : more).push(o)
  return { shown, more }
}

/** Activity filters by what an organiser asks: about their events, and everything else. */
export const EVENT_ACTIVITY: readonly ActivityFilter[] = ['going', 'regular', 'lapsed', 'came']
export const OTHER_ACTIVITY: readonly ActivityFilter[] = ['new', 'follows', 'account']

/** Toggle a value in a list filter (chips). */
export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v]
}

/**
 * When the contact joined, for the row: "15 Nov 2026, 12:00" (Berlin time). Some imports only know a bound
 * — wedance.vip logged subscribe dates only from 24 Mar 2024, so older subscribers carry
 * `source.subscribed_before` and read "before Mar 2024" (created_at then only keeps the order).
 */
export function contactSince(createdAt: string | Date | null, source: Record<string, string> | null | undefined): string {
  if (!createdAt) return ''
  const before = source?.subscribed_before
  if (before) return `before ${new Date(before).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  return new Date(createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
}

/** Where a website sign-up came from, in a few words: UTM, else the form, else the referrer. */
export function sourceDetail(source: Record<string, string> | null | undefined): string {
  const s = source ?? {}
  // wedance.vip subscribers: the source label already says it all.
  if (s.from === 'wedance-v3') return ''
  return [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean).join(' / ') || s.form || s.referrer || ''
}

export interface CsvContact extends FilterableContact {
  locale: string | null
  sourceLabel: string
}

export const CSV_COLUMNS = ['name', 'email', 'phone', 'locale', 'status', 'can_email', 'created', 'came_from', 'source_detail', 'wedance_account', 'events_attended', 'going_next', 'follows', 'note'] as const

/**
 * The contacts as CSV (one header row, every value quoted). Only contacts: the audience
 * who aren't contacts gave the page nothing to export (RAZ-963).
 */
export function contactsCsv(list: CsvContact[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = list.filter(c => c.isContact !== false).map(c => [
    c.name || c.account?.name, c.email, c.phone, c.locale, c.status,
    c.emailBlock ? `no: ${EMAIL_BLOCK_LABEL[c.emailBlock as EmailBlock] ?? c.emailBlock}` : 'yes',
    c.source?.subscribed_before ? `before ${c.source.subscribed_before.slice(0, 10)}` : (c.createdAt ? new Date(c.createdAt).toISOString() : ''), c.sourceLabel, sourceDetail(c.source as Record<string, string>),
    c.hasAccount ? 'yes' : 'no', c.activity.wentTo, c.activity.upcoming[0]?.startDate.slice(0, 10) ?? '', c.activity.follows ? 'yes' : 'no',
    c.note,
  ].map(esc).join(','))
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}
