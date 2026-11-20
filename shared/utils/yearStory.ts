/**
 * My dance year (RAZ-897): what goes on the year story — the festivals in date
 * order, the four big numbers (as on /my-year's stats card), the year, the
 * dance family that colours it, our own short lines, and the link that opens
 * the dancer's year page.
 */
import { partyFamily } from './storyLines'
import type { DanceFamilyId } from '../dance-styles'

export type YearStoryFestival = {
  name: string
  /** YYYY-MM-DD (or an ISO date-time). */
  startDate: string
  endDate: string
  /** City. */
  location: string
  country?: string
  styles: readonly string[]
}

export type YearStoryStats = {
  festivals: number
  danceDays: number
  cities: number
  countries: number
}

const DAY = 24 * 60 * 60 * 1000

/** Festivals with a date, earliest first. */
export function yearStoryFestivals<T extends YearStoryFestival>(festivals: readonly T[]): T[] {
  return festivals.filter(f => f.startDate).slice().sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** Days a festival lasts, both ends counted (a one-day event is 1). */
export function festivalDays(f: Pick<YearStoryFestival, 'startDate' | 'endDate'>): number {
  if (!f.startDate) return 0
  const start = new Date(f.startDate).getTime()
  const end = f.endDate ? new Date(f.endDate).getTime() : start
  if (Number.isNaN(start)) return 0
  if (Number.isNaN(end) || end < start) return 1
  return Math.ceil((end - start) / DAY) + 1
}

/** The four big numbers on the story, counted the way the /my-year stats card does. */
export function yearStoryStats(festivals: readonly YearStoryFestival[]): YearStoryStats {
  const cities = new Set(festivals.map(f => f.location?.trim()).filter(Boolean))
  const countries = new Set(festivals.map(f => f.country?.trim()).filter(Boolean))
  return {
    festivals: festivals.length,
    danceDays: festivals.reduce((n, f) => n + festivalDays(f), 0),
    cities: cities.size,
    countries: countries.size,
  }
}

/** The year the plan is about: the one most festivals start in (the later one on a tie), else `fallback`. */
export function yearOfPlan(festivals: readonly YearStoryFestival[], fallback: number): number {
  const counts = new Map<number, number>()
  for (const f of festivals) {
    const y = Number(f.startDate?.slice(0, 4))
    if (y > 1900) counts.set(y, (counts.get(y) ?? 0) + 1)
  }
  let best = fallback
  let most = 0
  for (const [y, n] of counts) {
    if (n > most || (n === most && y > best)) { best = y; most = n }
  }
  return best
}

/** The dance family that colours the story: the one most festivals are (the earliest festival's on a tie). */
export function yearFamily(festivals: readonly YearStoryFestival[]): DanceFamilyId | null {
  const counts = new Map<DanceFamilyId, number>()
  let best: DanceFamilyId | null = null
  for (const f of yearStoryFestivals(festivals)) {
    const fam = festivalFamily(f)
    if (!fam) continue
    const n = (counts.get(fam) ?? 0) + 1
    counts.set(fam, n)
    if (!best || n > counts.get(best)!) best = fam
  }
  return best
}

export function festivalFamily(f: Pick<YearStoryFestival, 'name' | 'styles'>): DanceFamilyId | null {
  return partyFamily({ name: f.name, styles: f.styles })
}

/** "MAR" — the month a festival starts, in UTC so a date never slips a day. */
export function festivalMonth(f: Pick<YearStoryFestival, 'startDate'>): string {
  const d = new Date(f.startDate)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase().slice(0, 3)
}

/** "5–8" or "30 – 2 JUN": the days, for under the month. */
export function festivalDayRange(f: Pick<YearStoryFestival, 'startDate' | 'endDate'>): string {
  const s = new Date(f.startDate)
  const e = new Date(f.endDate || f.startDate)
  if (Number.isNaN(s.getTime())) return ''
  if (Number.isNaN(e.getTime()) || e <= s) return String(s.getUTCDate())
  if (s.getUTCMonth() === e.getUTCMonth()) return `${s.getUTCDate()}–${e.getUTCDate()}`
  const month = e.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase().slice(0, 3)
  return `${s.getUTCDate()} – ${e.getUTCDate()} ${month}`
}

/** "Berlin · Germany" (either part may be missing). */
export function festivalPlace(f: Pick<YearStoryFestival, 'location' | 'country'>): string {
  return [f.location, f.country].map(s => s?.trim()).filter(Boolean).join(' · ')
}

/** Our own lines for the label on the year story. Never quotes from someone else. */
export const YEAR_LINES = [
  'Which one are you coming to?',
  'Same festival? Let’s share a ride.',
  'Book the leave. Pack the shoes.',
  'Twelve months. One dance floor.',
  'Find me on the floor.',
  'Who’s in for at least one?',
]

/** A line, different from `current` when there is another. */
export function pickYearLine(current = '', random: () => number = Math.random): string {
  const others = YEAR_LINES.filter(l => l !== current)
  const from = others.length ? others : YEAR_LINES
  return from[Math.floor(random() * from.length)]!
}

/**
 * The link that opens a dancer's year page: `/my-year?user=<handle>` (their
 * dancer id when they have no handle — `plan.sharedPlan` accepts both), with
 * their referral code.
 */
export function yearShareUrl(origin: string, username: string | null | undefined, dancerId: string | null | undefined): string {
  const user = username || dancerId || 'shared'
  const base = `${origin}/my-year?user=${encodeURIComponent(user)}`
  const ref = username || dancerId
  return ref ? `${base}&ref=${encodeURIComponent(ref)}` : base
}

/** The link as written on the story: no scheme, no referral code ("2026.wedance.vip/my-year?user=alex"). */
export function yearStoryLinkText(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/&ref=[^&]*/, '')
}
