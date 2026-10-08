/**
 * Helpers for the "free taster class" feature (P1006).
 * Used by /cities/[city] to surface beginner-friendly classes.
 */

/** Event types a beginner might attend as a taster. */
const TASTER_TYPES = new Set(['class', 'workshop', 'Class', 'Workshop', 'Practica', 'practica'])

/** True when the event's type looks like a class or workshop a beginner could try. */
export function isTasterCandidate(e: { type?: string; eventType?: string; isFestival?: boolean }): boolean {
  if (e.isFestival) return false
  const t = e.type || e.eventType || ''
  return TASTER_TYPES.has(t)
}

/** True when the price string looks free (empty, "0", "free", etc.). */
export function isFreePrice(price: string | null | undefined): boolean {
  if (!price) return true
  const p = price.trim().toLowerCase()
  return p === '' || p === '0' || p === 'free' || p === '0€' || p === '€0' || p === '$0' || p === '0$'
}
