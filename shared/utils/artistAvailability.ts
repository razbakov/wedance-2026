import { WEEKDAYS } from '../types/venueDetails'

/**
 * Weekly windows an artist publishes for private events, weddings and
 * corporate bookings. Day is ISO: 1 = Monday … 7 = Sunday. An end at or
 * before the start crosses midnight (19:00–02:00). 00:00–00:00 is the whole day.
 * No windows published means unknown — not “never free”.
 */
export interface ArtistSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export type AvailabilityFit = 'unknown' | 'free' | 'outside'

/** 1 = Monday … 7 = Sunday for a YYYY-MM-DD, independent of the server's zone. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).getUTCDay()
  return dow === 0 ? 7 : dow
}

function byDayThenStart(a: ArtistSlot, b: ArtistSlot): number {
  return a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
}

/** One line per weekday that has a window, Monday first. */
export function availabilityLines(slots: ArtistSlot[]): { dayOfWeek: number; label: string; hours: string }[] {
  const grouped = new Map<number, string[]>()
  for (const slot of [...slots].sort(byDayThenStart)) {
    const hours = grouped.get(slot.dayOfWeek) ?? []
    hours.push(`${slot.startTime}–${slot.endTime}`)
    grouped.set(slot.dayOfWeek, hours)
  }
  return [...grouped.entries()].map(([dayOfWeek, ranges]) => ({
    dayOfWeek,
    label: WEEKDAYS[dayOfWeek - 1] ?? `Day ${dayOfWeek}`,
    hours: ranges.join(', '),
  }))
}

function wholeDay(start: string, end: string): boolean {
  return start === '00:00' && end === '00:00'
}

/** The request sits entirely inside the window, including windows that cross midnight. */
function contains(winStart: string, winEnd: string, reqStart: string, reqEnd: string): boolean {
  if (wholeDay(winStart, winEnd)) return true
  const winWraps = winEnd <= winStart
  const reqWraps = reqEnd < reqStart
  if (!winWraps) {
    if (reqWraps) return false
    return reqStart >= winStart && reqEnd <= winEnd
  }
  if (!reqWraps) {
    const afterStart = reqStart >= winStart && reqEnd >= reqStart
    const beforeEnd = reqEnd <= winEnd && reqStart <= reqEnd
    return afterStart || beforeEnd
  }
  return reqStart >= winStart && reqEnd <= winEnd
}

/**
 * Whether a date (and optional HH:MM window) falls inside published times.
 * `unknown` when the artist has published nothing.
 */
export function fitsAvailability(slots: ArtistSlot[], date: string, start?: string, end?: string): AvailabilityFit {
  if (!slots.length) return 'unknown'
  const day = slots.filter(s => s.dayOfWeek === isoWeekday(date))
  if (!day.length) return 'outside'
  if (!start) return 'free'
  const reqEnd = end || start
  return day.some(s => contains(s.startTime, s.endTime, start, reqEnd)) ? 'free' : 'outside'
}
