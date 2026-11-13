/**
 * The weekly city schedule (city channels, migration 0067): which week, which events
 * go in by default, and the text posted to Instagram and Telegram. Pure — the server
 * builds drafts with it and the editor previews with it.
 */
import { eventLocalDate, eventLocalTime, zonedToUtc } from './eventTime'

export const SCHEDULE_TZ = 'Europe/Berlin'

export interface ScheduleEvent {
  id: string
  name: string | null
  type: string | null
  startDate: string | Date
  timezone: string | null
  venueName: string | null
  organizerName?: string | null
  styles?: string[] | null
}

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday, for a 'YYYY-MM-DD'. */
const weekdayIndex = (ymd: string) => (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7

/** Monday of the week `at` falls in, in the city's zone. */
export function weekStartOf(at: Date, tz = SCHEDULE_TZ): string {
  const day = eventLocalDate(at, tz)
  return addDays(day, -weekdayIndex(day))
}

/**
 * The week a new schedule is for: this week, except on Sunday (the usual posting day
 * for "the week ahead"), when it is next week.
 */
export function defaultWeekStart(now: Date = new Date(), tz = SCHEDULE_TZ): string {
  const day = eventLocalDate(now, tz)
  return weekdayIndex(day) === 6 ? addDays(day, 1) : addDays(day, -weekdayIndex(day))
}

export function isWeekStart(ymd: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) && weekdayIndex(ymd) === 0
}

export function shiftWeek(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7)
}

/** [from, to) instants of the week: Monday 06:00 to next Monday 06:00, so Sunday's late party stays in. */
export function weekRange(weekStart: string, tz = SCHEDULE_TZ): { from: Date; to: Date } {
  return { from: zonedToUtc(weekStart, '06:00', tz), to: zonedToUtc(addDays(weekStart, 7), '06:00', tz) }
}

/** "17–23 Nov" / "29 Dec – 4 Jan". */
export function weekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6)
  const f = (ymd: string, o: Intl.DateTimeFormatOptions) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', ...o })
  return weekStart.slice(0, 7) === end.slice(0, 7)
    ? `${Number(weekStart.slice(8))}–${f(end, { day: 'numeric', month: 'short' })}`
    : `${f(weekStart, { day: 'numeric', month: 'short' })} – ${f(end, { day: 'numeric', month: 'short' })}`
}

/**
 * Picked by default: what people go out to — parties, socials, workshops, concerts,
 * festivals. Weekly courses (most of a city's listings) stay out unless an admin adds them.
 */
export function pickedByDefault(e: Pick<ScheduleEvent, 'type'>): boolean {
  return (e.type ?? '').toLowerCase() !== 'course'
}

export interface ScheduleDay { date: string; label: string; items: { id: string; time: string; name: string; where: string | null }[] }

/** The picked events, day by day (the night's local date, 06:00 rollover), soonest first. */
export function scheduleDays(events: ScheduleEvent[], tz = SCHEDULE_TZ): ScheduleDay[] {
  const byDay = new Map<string, ScheduleDay>()
  const sorted = [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  for (const e of sorted) {
    const zone = e.timezone || tz
    const start = new Date(e.startDate)
    // A 01:00 start belongs to the night before.
    const night = eventLocalDate(new Date(start.getTime() - 6 * 3600_000), zone)
    const label = new Date(`${night}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    const day = byDay.get(night) ?? { date: night, label, items: [] }
    day.items.push({ id: e.id, time: eventLocalTime(start, zone), name: (e.name ?? 'Untitled').trim(), where: e.venueName?.trim() || null })
    byDay.set(night, day)
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * The post: a title, each day with its events, and the link to everything else.
 * Plain text (no markup), so it reads the same on Instagram and Telegram.
 */
export function buildScheduleText(input: { cityName: string; weekStart: string; events: ScheduleEvent[]; link: string; tz?: string }): string {
  const days = scheduleDays(input.events, input.tz)
  const lines = [`💃 This week in ${input.cityName} · ${weekLabel(input.weekStart)}`, '']
  if (!days.length) lines.push('Nothing picked for this week yet.', '')
  for (const d of days) {
    lines.push(d.label.toUpperCase())
    for (const i of d.items) lines.push(`${i.time} ${i.name}${i.where ? ` · ${i.where}` : ''}`)
    lines.push('')
  }
  lines.push(`Classes, more events and who's going: ${input.link}`)
  return lines.join('\n')
}

/** What the picture is drawn from — a change means the picture is out of date. */
export function scheduleImageKey(input: { cityName: string; weekStart: string; events: ScheduleEvent[]; tz?: string }): string {
  const days = scheduleDays(input.events, input.tz)
  return JSON.stringify([input.cityName, input.weekStart, days.map(d => [d.date, d.items.map(i => [i.time, i.name, i.where])])])
}

export const INSTAGRAM_CAPTION_MAX = 2200
export const TELEGRAM_TEXT_MAX = 4096
export const TELEGRAM_CAPTION_MAX = 1024
