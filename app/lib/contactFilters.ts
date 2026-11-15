/**
 * Filtering a page's contacts on the Contacts page (RAZ-949): by source, by
 * whether the page may email them, by WeDance activity, and by free text
 * (name, email, phone, note, account name and the source details — form, UTM,
 * promo code). Plus the CSV of whatever the filter shows.
 */
import { EMAIL_BLOCK_LABEL, matchesActivity, type ActivityFilter, type ContactSourceKey, type EmailBlock, type SegmentContact } from '#shared/utils/contactSegments'

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
  q: string
}

export const emptyFilter = (): ContactFilter => ({ sources: [], email: 'any', activity: [], q: '' })

export function isFiltered(f: ContactFilter): boolean {
  return f.sources.length > 0 || f.email !== 'any' || f.activity.length > 0 || f.q.trim() !== ''
}

export function filterContacts<T extends FilterableContact>(list: T[], f: ContactFilter, now = new Date()): T[] {
  const needle = f.q.trim().toLowerCase()
  return list.filter((c) => {
    if (f.sources.length && !f.sources.includes(c.sourceKey)) return false
    if (f.email === 'can' && c.emailBlock) return false
    if (f.email === 'cant' && !c.emailBlock) return false
    if (!f.activity.every(a => matchesActivity(c, a, now))) return false
    if (needle && ![c.name, c.email, c.phone, c.note, c.account?.name, ...Object.values(c.source ?? {})].some(v => typeof v === 'string' && v.toLowerCase().includes(needle))) return false
    return true
  })
}

/** Toggle a value in a list filter (chips). */
export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v]
}

/**
 * When the contact joined, for the row: "15 Nov 2026". Some imports only know a bound
 * — wedance.vip logged subscribe dates only from 24 Mar 2024, so older subscribers carry
 * `source.subscribed_before` and read "before Mar 2024" (created_at then only keeps the order).
 */
export function contactSince(createdAt: string | Date, source: Record<string, string> | null | undefined): string {
  const before = source?.subscribed_before
  if (before) return `before ${new Date(before).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  return new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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

/** The contacts as CSV (one header row, every value quoted). */
export function contactsCsv(list: CsvContact[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = list.map(c => [
    c.name || c.account?.name, c.email, c.phone, c.locale, c.status,
    c.emailBlock ? `no: ${EMAIL_BLOCK_LABEL[c.emailBlock as EmailBlock] ?? c.emailBlock}` : 'yes',
    c.source?.subscribed_before ? `before ${c.source.subscribed_before.slice(0, 10)}` : new Date(c.createdAt).toISOString(), c.sourceLabel, sourceDetail(c.source as Record<string, string>),
    c.hasAccount ? 'yes' : 'no', c.activity.wentTo, c.activity.upcoming[0]?.startDate.slice(0, 10) ?? '', c.activity.follows ? 'yes' : 'no',
    c.note,
  ].map(esc).join(','))
  return [CSV_COLUMNS.join(','), ...rows].join('\n')
}
