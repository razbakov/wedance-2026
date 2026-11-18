/**
 * Starting a new event (RAZ-939): the new-event page asks one question —
 * where the organiser starts from — and at most four fields. These helpers
 * are what it (and the editor's steps) know without a saved event.
 */

export type EventStart = 'post' | 'copy' | 'scratch'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** YYYY-MM-DD → its weekday name (the date as a calendar day, no timezone). */
export function weekdayName(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const d = new Date(`${date}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getUTCDay()]!
}

/**
 * The name "From scratch" suggests: "<Style> <type> · <weekday>", e.g.
 * "Salsa Party · Thursday". The organiser can change it now or later.
 * With nothing picked yet: "New party".
 */
export function suggestEventName(v: { styles?: string[]; type?: string; date?: string }): string {
  const type = (v.type || 'Party').trim()
  const styles = (v.styles ?? []).map(s => s.trim()).filter(Boolean)
  const music = styles.length > 2 ? `${styles.slice(0, 2).join(' & ')} +` : styles.join(' & ')
  const day = weekdayName(v.date ?? '')
  const head = music ? `${music} ${type}` : type
  if (!music && !day) return `New ${type.toLowerCase()}`
  return day ? `${head} · ${day}` : head
}

/** YYYY-MM-DD plus n days. */
export function addDaysIso(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * "Like my last event": the date the copy suggests — the same weekday as the
 * source, the first one after today (and after the source itself).
 */
export function nextSameWeekday(sourceDate: string, today: string): string {
  let d = sourceDate
  const floor = today > sourceDate ? today : sourceDate
  while (d <= floor) d = addDaysIso(d, 7)
  return d
}

/** Whole calendar days from `a` to `b` (YYYY-MM-DD), negative when b is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400_000)
}
