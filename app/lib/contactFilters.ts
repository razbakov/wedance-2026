/**
 * Filtering a page's contacts on the Contacts page (RAZ-949): by source, by
 * whether the page may email them, by WeDance activity, and by free text.
 * Every layout variant uses the same filter, so the counts and the list agree.
 */
import { matchesActivity, type ActivityFilter, type ContactSourceKey, type SegmentContact } from '#shared/utils/contactSegments'

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
    if (needle && ![c.name, c.email, c.phone, c.note, c.account?.name].some(v => v?.toLowerCase().includes(needle))) return false
    return true
  })
}

/** Toggle a value in a list filter (chips). */
export function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v]
}

/** Most engaged first: going soon, then how often they came, then newest. */
export function byEngagement<T extends FilterableContact>(a: T, b: T): number {
  return (b.activity.upcoming.length ? 1 : 0) - (a.activity.upcoming.length ? 1 : 0)
    || b.activity.wentTo - a.activity.wentTo
    || Number(b.activity.follows) - Number(a.activity.follows)
    || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}
