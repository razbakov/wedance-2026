/**
 * Business → Home (/business, RAZ-973): the rules behind tonight, the last-7-days pulse,
 * the dancers' items and the one-line task list. Pure, so the page and the router agree
 * and unit tests can pin them. Sketch: /sketches/business-home (variant D).
 */

/** Weekly lessons: a new flyer each week is noise (the Course type of the new-event form; v3's Class/Practica). */
const CLASS_TYPES = new Set(['course', 'class', 'practica'])

/**
 * Should Home remind the organiser about this event's flyer (none yet, or out of date)?
 * Not for an event that starts within 24 h (too late to matter) and not for a lesson that
 * repeats (one flyer per date of a weekly class is nobody's job). Parties, workshops and
 * one-off classes still get the reminder.
 */
export function wantsFlyerReminder(e: { startDate: string | Date; type?: string | null; seriesId?: string | null }, now: Date): boolean {
  if (new Date(e.startDate).getTime() - now.getTime() < 24 * 3600_000) return false
  if (e.seriesId && CLASS_TYPES.has((e.type ?? '').toLowerCase())) return false
  return true
}

/** Below this a number is hidden: "1 new follower" reads worse than saying nothing. */
export const PULSE_MIN = 3

export interface PulseNumber { id: 'plans' | 'followers' | 'answers'; label: string; value: number; delta: number }

/** The pulse numbers worth showing (value ≥ PULSE_MIN), in their fixed order. */
export function visiblePulse(list: readonly PulseNumber[]): PulseNumber[] {
  return list.filter(p => p.value >= PULSE_MIN)
}

/** "Good morning" / "Good afternoon" / "Good evening" for an hour 0–23 in the viewer's zone. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** "Maria", "Maria and Jonas", "Maria, Jonas and 3 others" — first names only. */
export function namesLine(names: readonly (string | null)[], total: number): string {
  const first = names.map(n => (n ?? '').trim().split(/\s+/)[0]).filter(Boolean).slice(0, 2)
  if (!first.length) return total === 1 ? 'Someone' : `${total} dancers`
  const rest = total - first.length
  if (rest <= 0) return first.length === 2 ? `${first[0]} and ${first[1]}` : first[0]!
  return `${first.join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}`
}

/** The kinds of "Needs you" items that are chores (drafts, details, flyers) vs. someone waiting on you. */
const TASK_KINDS = new Set(['draft', 'missing', 'flyer'])
export function isTask(kind: string): boolean {
  return TASK_KINDS.has(kind)
}
