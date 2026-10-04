/**
 * Wall-clock formatting for dated events in the zone they HAPPEN in (events.timezone),
 * never the viewer's zone — a 20:00 Munich social reads 20:00 for everyone.
 * Inputs are ISO instants (UTC) as the API returns them.
 */
const DEFAULT_TZ = 'Europe/Berlin'

function parts(iso: string | Date, tz: string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz || DEFAULT_TZ, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long',
    }).formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, x.value]),
  )
  return p as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'weekday', string>
}

/** 'YYYY-MM-DD' of the instant in the event's zone. */
export function eventLocalDate(iso: string | Date, tz = DEFAULT_TZ): string {
  const p = parts(iso, tz)
  return `${p.year}-${p.month}-${p.day}`
}

/** 'HH:MM' (24h) in the event's zone. */
export function eventLocalTime(iso: string | Date, tz = DEFAULT_TZ): string {
  const p = parts(iso, tz)
  return `${p.hour}:${p.minute}`
}

/** 'Monday' … 'Sunday' in the event's zone. */
export function eventLocalWeekday(iso: string | Date, tz = DEFAULT_TZ): string {
  return parts(iso, tz).weekday
}

/**
 * Human date line for an event page / card, in the event's zone:
 *   same day   → "Sat, Oct 10, 2026 · 20:00–23:30"
 *   overnight  → "Sat, Oct 10, 2026 · 22:00–03:00"   (ends before noon next day)
 *   multi-day  → "Oct 10 – Oct 12, 2026"
 */
export function formatEventWhen(startIso: string | Date, endIso: string | Date | null | undefined, tz = DEFAULT_TZ): string {
  const zone = tz || DEFAULT_TZ
  const start = new Date(startIso)
  const end = endIso ? new Date(endIso) : null
  const day = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', { timeZone: zone, ...opts })
  const startLine = day(start, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  if (!end || end <= start) return `${startLine} · ${eventLocalTime(start, zone)}`
  const overnight = end.getTime() - start.getTime() < 24 * 3600_000 && Number(parts(end, zone).hour) < 12
  if (eventLocalDate(start, zone) === eventLocalDate(end, zone) || overnight) {
    return `${startLine} · ${eventLocalTime(start, zone)}–${eventLocalTime(end, zone)}`
  }
  return `${day(start, { month: 'short', day: 'numeric' })} – ${day(end, { month: 'short', day: 'numeric', year: 'numeric' })}`
}
