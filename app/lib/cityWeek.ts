/**
 * The city page's week logic (/cities/[city]), kept pure so it can be tested
 * with a fixed clock and time zone (RAZ-683, RAZ-693, RAZ-694, RAZ-695).
 *
 * "This week" is Monday–Sunday in the viewer's local calendar. Booked events
 * carry a local `eventDate` (YYYY-MM-DD); synced events carry a UTC instant plus
 * the event's IANA zone and are dated in that zone (shared/utils/eventTime.ts).
 */
import { sameDanceStyle } from '#shared/dance-styles'
import { eventLocalDate } from '#shared/utils/eventTime'
import { CLASS_EVENT_TYPES } from '#shared/utils/eventSignup'

// Local YYYY-MM-DD (never toISOString — that shifts to UTC and, in a positive
// offset like CEST, moves every day back by one, so "this week" ends up a day off).
export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The seven local dates (Mon–Sun) of the week `now` falls in. */
export function weekDateKeys(now: Date = new Date()): Set<string> {
  const off = (now.getDay() + 6) % 7
  const mon = new Date(now); mon.setDate(now.getDate() - off); mon.setHours(0, 0, 0, 0)
  const set = new Set<string>()
  for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); set.add(localDateKey(x)) }
  return set
}

/** Style filter for the "Coming up" list: no style picked keeps everything. */
export const matchesStyle = (styles: string[] | null | undefined, style: string) =>
  !style || (styles || []).some((s: string) => sameDanceStyle(s, style))

/**
 * Parties / classes filter (RAZ-1018), kept in the URL as `?type=party|class`.
 * Classes are CLASS_EVENT_TYPES (class, course, practica, workshop — the same list
 * as the sign-up, RAZ-995); everything else (social, party, concert, show) is a party.
 */
export type EventKind = 'party' | 'class'
export const EVENT_KINDS: { key: EventKind; label: string }[] = [
  { key: 'party', label: 'Parties' },
  { key: 'class', label: 'Classes' },
]
export const parseEventKind = (v: unknown): EventKind | '' => (v === 'party' || v === 'class' ? v : '')
export const isClassType = (type: string | null | undefined) =>
  (CLASS_EVENT_TYPES as readonly string[]).includes(String(type ?? '').trim().toLowerCase())
/** No kind picked keeps everything. */
export const matchesKind = (type: string | null | undefined, kind: EventKind | '') =>
  !kind || (kind === 'class') === isClassType(type)

/**
 * Splits the city's booked + synced events into this week and later. Festivals
 * get their own section, so synced festivals stay out of both lists.
 */
export function cityFeed<B extends { eventDate?: unknown; styles?: string[] | null }, S extends { startDate: string | Date; timezone?: string | null; isFestival?: boolean | null; styles?: string[] | null }>(
  booked: B[], synced: S[], week: Set<string>, style = '',
) {
  const weekEnd = [...week].sort().at(-1) ?? ''
  const bookedDate = (b: B) => String(b.eventDate).slice(0, 10)
  const syncedDate = (e: S) => eventLocalDate(e.startDate, e.timezone ?? undefined)
  const nonFestival = synced.filter(e => !e.isFestival)
  return {
    bookedThisWeek: booked.filter(b => b.eventDate && week.has(bookedDate(b))),
    syncedThisWeek: nonFestival.filter(e => week.has(syncedDate(e))),
    syncedLater: nonFestival.filter(e => syncedDate(e) > weekEnd).filter(e => matchesStyle(e.styles, style)),
    bookedLater: booked.filter(b => b.eventDate && bookedDate(b) > weekEnd).filter(b => matchesStyle(b.styles, style)),
  }
}

/** Who has an event this week, per role: venue / organiser @handles and artist names or @handles. */
export function activeThisWeek(
  bookedThisWeek: { venueHandle?: string | null; organizerHandle?: string | null; artists?: unknown[] | null }[],
  syncedThisWeek: { venueId?: string | null; organizerId?: string | null; artists?: unknown[] | null }[],
) {
  const artists = new Set<string>()
  for (const b of [...bookedThisWeek, ...syncedThisWeek]) {
    for (const a of (b.artists || [])) artists.add(String(a).trim().replace(/^@/, '').toLowerCase())
  }
  return {
    venues: new Set([...bookedThisWeek.map(b => b.venueHandle), ...syncedThisWeek.map(e => e.venueId)].filter(Boolean) as string[]),
    organisers: new Set([...bookedThisWeek.map(b => b.organizerHandle), ...syncedThisWeek.map(e => e.organizerId)].filter(Boolean) as string[]),
    artists,
  }
}

export type PeopleTab = 'teachers' | 'djs' | 'organisers' | 'venues'

export function isActiveThisWeek(tab: PeopleTab, p: { id: string; name: string }, active: ReturnType<typeof activeThisWeek>): boolean {
  // A handle counts in whichever role the event names it: many schools are typed
  // "venue" in 2026 but run the events as organiser (and vice versa).
  if (tab === 'venues' || tab === 'organisers') return active.venues.has(p.id) || active.organisers.has(p.id)
  if (tab === 'teachers') {
    const t = active.artists
    return t.has(String(p.id).toLowerCase()) || t.has(String(p.name).trim().toLowerCase())
  }
  return false
}

/**
 * Jump to one date on the city page (RAZ-1021).
 *
 * "Pick a date" opens a 5-week grid that starts on this week's Monday, so a
 * night three weeks away is on the first page — two taps, and no third tap to
 * reach the next month. Days before today are not selectable. The grid follows
 * the parties / classes filter because the caller passes already-filtered events.
 */
export const CITY_DATE_HORIZON_DAYS = 89
export const JUMP_WEEKS = 5

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return localDateKey(new Date(y!, (m ?? 1) - 1, (d ?? 1) + days))
}

/** Monday of the week `date` falls in (local calendar, Monday first). */
export function mondayOnOrBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, d)
  dt.setDate(dt.getDate() - (dt.getDay() + 6) % 7)
  return localDateKey(dt)
}

/** A `?date=` value: a real YYYY-MM-DD, today or later, within two years. Anything else is ignored. */
export function parseDateKey(v: unknown, today = localDateKey(new Date())): string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(y!, (m ?? 1) - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== (m ?? 1) - 1 || dt.getDate() !== d) return ''
  if (v < today || v > addDays(today, 366 * 2)) return ''
  return v
}

const atNoonUtc = (date: string) => new Date(`${date}T12:00:00Z`)

/** "Tuesday, Dec 8" — the heading above the chosen day's events. */
export function formatJumpDate(date: string): string {
  return atNoonUtc(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Tue, Dec 8" — the chip once a date is chosen. */
export function formatJumpDateShort(date: string): string {
  return atNoonUtc(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatMonthShort(date: string): string {
  return atNoonUtc(date).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
}

/** "Nov 16 – Dec 20, 2026" for the open calendar's range. */
export function formatJumpWindow(startMonday: string, weeks = JUMP_WEEKS): string {
  const end = addDays(startMonday, weeks * 7 - 1)
  const sameYear = startMonday.slice(0, 4) === end.slice(0, 4)
  const left = atNoonUtc(startMonday).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC', ...(sameYear ? {} : { year: 'numeric' }),
  })
  const right = atNoonUtc(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return `${left} – ${right}`
}

/**
 * Mondays that start each calendar page. Always covers today through
 * `CITY_DATE_HORIZON_DAYS` (what the city feed loads), and further when an
 * event is dated past that.
 */
export function jumpPageStarts(today: string, dates: string[] = [], weeks = JUMP_WEEKS): string[] {
  const first = mondayOnOrBefore(today)
  let end = addDays(today, CITY_DATE_HORIZON_DAYS)
  for (const date of dates) if (date > end) end = date
  const pageLen = weeks * 7
  const pages = [first]
  let start = first
  while (addDays(start, pageLen - 1) < end && pages.length < 16) {
    start = addDays(start, pageLen)
    pages.push(start)
  }
  return pages
}

export interface JumpDay {
  date: string
  isToday: boolean
  isPast: boolean
  count: number
  /** First cell, or the 1st of a month — the grid prints the month name there. */
  showMonth: boolean
}

export function jumpDays(startMonday: string, counts: Record<string, number>, today: string, weeks = JUMP_WEEKS): JumpDay[] {
  const days: JumpDay[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(startMonday, i)
    days.push({
      date,
      isToday: date === today,
      isPast: date < today,
      count: counts[date] ?? 0,
      showMonth: i === 0 || date.slice(8, 10) === '01',
    })
  }
  return days
}

/** One count per event id, so a dot means "something is listed", matching the list below. */
export function countByDate(items: { id: string; date: string }[]): Record<string, number> {
  const seen = new Set<string>()
  const out: Record<string, number> = {}
  for (const e of items) {
    if (!e.id || !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || seen.has(e.id)) continue
    seen.add(e.id)
    out[e.date] = (out[e.date] ?? 0) + 1
  }
  return out
}

export interface DatedEvent { id: string; date: string; time?: string }

/** The chosen day's events, soonest first. Other dates and duplicate ids are left out. */
export function pickEventsOnDate<T extends DatedEvent>(items: T[], date: string): T[] {
  if (!date) return []
  const seen = new Set<string>()
  const out: T[] = []
  for (const e of items) {
    if (e.date !== date || !e.id || seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  out.sort((a, b) => String(a.time ?? '').localeCompare(String(b.time ?? '')) || a.id.localeCompare(b.id))
  return out
}

/** "Coming up": merged later events sorted by date then time, grouped per date, capped at `limit` ("show more"). */
export function groupUpcoming<T extends { date: string; time: string }>(items: T[], limit: number) {
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  const groups: { date: string; label: string; items: T[] }[] = []
  for (const e of sorted.slice(0, limit)) {
    let g = groups.find(x => x.date === e.date)
    if (!g) {
      g = { date: e.date, label: new Date(`${e.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }), items: [] }
      groups.push(g)
    }
    g.items.push(e)
  }
  return groups
}
