/**
 * How a dance-friend card names a night, in the event's own zone.
 * "Tonight · 18:00", "Tomorrow · Thu 26 Nov · 18:00", "Thu 3 Dec · 18:00".
 * A night you already met at drops the clock: "Thu 19 Nov".
 */
import { eventLocalDate, eventLocalTime, eventLocalWeekday } from './eventTime'

const ZONE = 'Europe/Berlin'

function zoneOf(tz: string | null | undefined): string {
  return tz || ZONE
}

/** The next calendar day after a 'YYYY-MM-DD', with no DST shift. */
function nextDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** "Thu 19 Nov" — weekday, day, short month. No clock. */
export function metDayLabel(startISO: string, timezone: string | null | undefined): string {
  const zone = zoneOf(timezone)
  const date = eventLocalDate(startISO, zone)
  const day = Number(date.slice(8))
  const month = new Date(startISO).toLocaleDateString('en-US', { month: 'short', timeZone: zone })
  const weekday = eventLocalWeekday(startISO, zone).slice(0, 3)
  return `${weekday} ${day} ${month}`
}

/** Relative day plus the date, and the start time in the event's zone. */
export function relativeNightWhen(startISO: string, timezone: string | null | undefined, now = new Date()): string {
  const zone = zoneOf(timezone)
  const time = eventLocalTime(startISO, zone)
  const startDay = eventLocalDate(startISO, zone)
  const today = eventLocalDate(now, zone)
  if (startDay === today) return `Tonight · ${time}`
  const label = metDayLabel(startISO, zone)
  if (startDay === nextDate(today)) return `Tomorrow · ${label} · ${time}`
  return `${label} · ${time}`
}
