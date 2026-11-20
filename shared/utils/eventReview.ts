/**
 * Event reviews (RAZ-1011): only people who went, after the night.
 *
 * The night is over at its end, or — without an end time — a few hours after it started.
 * The morning-after email goes to everyone who went once the night has been over for a
 * while (the daily cron runs ~09:00 UTC; a night that ended in the small hours is asked the
 * same morning, one that ended later the next morning — never twice: event_review_asks).
 */

/** No end time: the night counts as over this long after it started. */
export const NO_END_HOURS = 3
/** Ask in the morning email only when the night has been over at least this long… */
export const ASK_AFTER_HOURS = 4
/** …and at most this long (the cron runs daily; 30 − 4 > 24, so no night falls through). */
export const ASK_WITHIN_HOURS = 30

const H = 3_600_000
const toMs = (d: Date | string | null | undefined) => (d ? new Date(d).getTime() : NaN)

type Timed = { startDate?: Date | string | null; endDate?: Date | string | null }

/** When the event can be reviewed (its end, else start + NO_END_HOURS); null without dates. */
export function reviewOpensAt(ev: Timed): Date | null {
  const end = toMs(ev.endDate)
  if (Number.isFinite(end)) return new Date(end)
  const start = toMs(ev.startDate)
  return Number.isFinite(start) ? new Date(start + NO_END_HOURS * H) : null
}

/** The night is over: people who went may review it. */
export function reviewOpen(ev: Timed, now = Date.now()): boolean {
  const at = reviewOpensAt(ev)
  return !!at && at.getTime() <= now
}

/** Due for the morning-after email at `now`. */
export function inAskWindow(ev: Timed, now = Date.now()): boolean {
  const at = reviewOpensAt(ev)?.getTime()
  if (at == null) return false
  return at <= now - ASK_AFTER_HOURS * H && at > now - ASK_WITHIN_HOURS * H
}

/** "Thursday" — the weekday the event started on, in its own time zone. */
export function nightWeekday(ev: { startDate?: Date | string | null; timezone?: string | null }): string {
  if (!ev.startDate) return 'last night'
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: ev.timezone || 'Europe/Berlin' }).format(new Date(ev.startDate))
  } catch {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date(ev.startDate))
  }
}

/** The email's subject: "How was Thursday at La Timberia?" (the host, else the event's name; a weekender by its name). */
export function reviewAskSubject(ev: { startDate?: Date | string | null; endDate?: Date | string | null; timezone?: string | null; name?: string | null }, host: string | null): string {
  // A weekender or anything longer than a night: by its name, not its first day.
  const long = toMs(ev.endDate) - toMs(ev.startDate) > 20 * H
  if (long && ev.name?.trim()) return `How was ${ev.name.trim()}?`
  const at = (host || ev.name || '').trim()
  return at ? `How was ${nightWeekday(ev)} at ${at}?` : `How was ${nightWeekday(ev)}?`
}

/** The word under the stars. */
export const ratingWord = (n: number) => ['', 'Not for me', 'Meh', 'Good', 'Great', 'Loved it'][n] ?? ''

/** `?rate=N` from the email's star links → 1..5, else null. */
export function rateFromQuery(v: unknown): number | null {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null
}
